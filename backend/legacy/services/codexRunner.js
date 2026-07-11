import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_TRACKER_INTERVAL_MS = 5000;
const MAX_TRACKED_FILE_COUNT = 5000;

export class CodexRunner {
  constructor({ projectRoot, allowedRoot, codexCommand = 'codex', codexSandbox = 'workspace-write' }) {
    this.allowedRoot = path.resolve(allowedRoot);
    this.projectRoot = assertSafeProjectRoot(projectRoot, this.allowedRoot);
    this.codexCommand = codexCommand;
    this.codexSandbox = assertAllowedSandbox(codexSandbox);
  }

  async run(requirement, { onLog, signal } = {}) {
    const log = createLogger(onLog);
    log('正在分析需求');
    log(`允許工作目錄：${this.projectRoot}`);
    log(`Codex sandbox：${this.codexSandbox}`);
    log('正在啟動 Codex CLI');

    const prompt = buildAgentPrompt(requirement, this.projectRoot);
    return this.runCodexCli(prompt, { onLog: log, signal });
  }

  async runCodexCli(prompt, { onLog, signal } = {}) {
    /*
      SECURITY NOTE:
      真實 Codex CLI 模式啟用前必須做好權限控管、sandbox、審核機制、
      審計紀錄、agent 可操作指令範圍，以及檔案寫入策略。此處只能把
      使用者需求作為 prompt 傳給 agent，不能把使用者輸入直接當作
      shell command 執行。
    */
    const log = createLogger(onLog);
    let lastFileSnapshot = await createFileSnapshot(this.projectRoot, log);
    let isPollingFiles = false;

    if (lastFileSnapshot) {
      log('已啟用修改檔案追蹤');
    }

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      const child = spawn(
        this.codexCommand,
        [
          'exec',
          '-C',
          this.projectRoot,
          '-c',
          'approval_policy="never"',
          '--sandbox',
          this.codexSandbox,
          '--skip-git-repo-check',
          prompt
        ],
        {
          cwd: this.projectRoot,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );

      let stdout = '';
      let stderr = '';
      let didAbort = false;
      let fileTrackerTimer;

      const pollFileChanges = async (reason = '已偵測檔案變更') => {
        if (!lastFileSnapshot || isPollingFiles) return;

        isPollingFiles = true;
        try {
          const nextSnapshot = await createFileSnapshot(this.projectRoot, log, { silent: true });
          if (!nextSnapshot) return;

          const changes = diffFileSnapshots(lastFileSnapshot, nextSnapshot);
          if (changes.length > 0) {
            log(`${reason}：${formatFileChanges(changes)}`);
          }
          lastFileSnapshot = nextSnapshot;
        } finally {
          isPollingFiles = false;
        }
      };

      if (lastFileSnapshot) {
        fileTrackerTimer = setInterval(() => {
          pollFileChanges().catch((error) => {
            log(`修改檔案追蹤失敗：${error.message}`);
          });
        }, FILE_TRACKER_INTERVAL_MS);
        fileTrackerTimer.unref?.();
      }

      const abortChild = () => {
        didAbort = true;
        log('正在停止目前任務');

        if (!child.killed) {
          child.kill('SIGTERM');
          setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL');
          }, 5000).unref();
        }
      };

      signal?.addEventListener('abort', abortChild, { once: true });

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        emitLines(text, log);
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        emitLines(text, (line) => log(`Codex 訊息：${line}`));
      });

      child.on('error', (error) => {
        signal?.removeEventListener('abort', abortChild);
        if (fileTrackerTimer) clearInterval(fileTrackerTimer);
        reject(error);
      });
      child.on('close', async (code) => {
        signal?.removeEventListener('abort', abortChild);
        if (fileTrackerTimer) clearInterval(fileTrackerTimer);
        await pollFileChanges('完成前檔案變更');

        if (didAbort || signal?.aborted) {
          reject(createAbortError());
          return;
        }

        if (code === 0) {
          log('正在完成驗證');
          log('任務完成');
          resolve(stdout.trim() || 'Codex CLI completed without stdout.');
          return;
        }

        reject(createCodexExitError(code, stderr));
      });
    });
  }
}

function createCodexExitError(code, stderr) {
  const error = new Error(`Codex CLI 執行失敗，exit code: ${code}`);
  error.name = 'CodexCliError';
  error.stderr = stderr;
  return error;
}

function createAbortError() {
  const error = new Error('任務已停止');
  error.name = 'AbortError';
  return error;
}

function createLogger(onLog) {
  return typeof onLog === 'function' ? onLog : () => {};
}

function buildAgentPrompt(requirement, projectRoot) {
  return [
    '你是 coding agent，請依照需求在允許的專案目錄內工作。',
    `允許工作目錄：${projectRoot}`,
    '專案結構：前端原始碼在 frontend/app，後端服務在 backend。',
    '正式前端 build 輸出固定放在 frontend/dist。',
    '臨時驗證或測試 build 輸出請放在 frontend/builds，不要在專案根目錄建立 dist 或 dist-* 目錄。',
    '禁止把使用者需求當作 shell command 執行。',
    '請先分析需求，再安全地執行必要步驟。',
    '',
    '使用者需求：',
    requirement
  ].join('\n');
}

function assertSafeProjectRoot(projectRoot, allowedRoot) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const relative = path.relative(allowedRoot, resolvedProjectRoot);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`PROJECT_ROOT must stay inside ${allowedRoot}`);
  }

  return resolvedProjectRoot;
}

function assertAllowedSandbox(sandbox) {
  const allowedSandboxes = new Set(['read-only', 'workspace-write']);

  if (!allowedSandboxes.has(sandbox)) {
    return 'workspace-write';
  }

  return sandbox;
}

function emitLines(text, onLog) {
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach(onLog);
}

async function createFileSnapshot(projectRoot, onLog, { silent = false } = {}) {
  const snapshot = new Map();

  try {
    await collectFileSnapshot(projectRoot, projectRoot, snapshot);
    return snapshot;
  } catch (error) {
    if (!silent) {
      onLog(`修改檔案追蹤未啟用：${error.message}`);
    }
    return null;
  }
}

async function collectFileSnapshot(projectRoot, currentPath, snapshot) {
  if (snapshot.size >= MAX_TRACKED_FILE_COUNT) return;

  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    if (snapshot.size >= MAX_TRACKED_FILE_COUNT) return;

    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(projectRoot, absolutePath);
    if (shouldSkipTrackedPath(relativePath, entry)) continue;

    if (entry.isDirectory()) {
      await collectFileSnapshot(projectRoot, absolutePath, snapshot);
      continue;
    }

    if (!entry.isFile()) continue;

    const stat = await fs.stat(absolutePath);
    snapshot.set(normalizePath(relativePath), `${stat.size}:${Math.round(stat.mtimeMs)}`);
  }
}

function shouldSkipTrackedPath(relativePath, entry) {
  const normalized = normalizePath(relativePath);
  const [topLevel, secondLevel] = normalized.split('/');

  if (entry.isDirectory()) {
    return (
      topLevel === '.git'
      || topLevel === 'node_modules'
      || topLevel === 'dist'
      || topLevel.startsWith('dist-')
      || topLevel.startsWith('tmp-')
      || (topLevel === 'frontend' && (secondLevel === 'dist' || secondLevel === 'builds'))
    );
  }

  return normalized === '.DS_Store' || normalized.endsWith('.map');
}

function diffFileSnapshots(previousSnapshot, nextSnapshot) {
  const changes = [];

  for (const [filePath, signature] of nextSnapshot.entries()) {
    if (!previousSnapshot.has(filePath)) {
      changes.push({ type: '新增', filePath });
      continue;
    }

    if (previousSnapshot.get(filePath) !== signature) {
      changes.push({ type: '修改', filePath });
    }
  }

  for (const filePath of previousSnapshot.keys()) {
    if (!nextSnapshot.has(filePath)) {
      changes.push({ type: '刪除', filePath });
    }
  }

  return changes.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function formatFileChanges(changes) {
  const visibleChanges = changes.slice(0, 12).map((change) => `${change.type} ${change.filePath}`);
  const hiddenCount = changes.length - visibleChanges.length;

  return hiddenCount > 0
    ? `${visibleChanges.join('、')}，另 ${hiddenCount} 個檔案`
    : visibleChanges.join('、');
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}
