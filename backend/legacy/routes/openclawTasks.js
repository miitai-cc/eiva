import express from 'express';
import { createAndRunTask, stopTask } from './tasks.js';

const MAX_REQUIREMENT_LENGTH = 8000;
const DEFAULT_LOG_LIMIT = 12;

export function createOpenClawTaskRouter({
  runner,
  socketHub,
  taskStore,
  taskControllers,
  token = process.env.OPENCLAW_WEB_CODEX_TOKEN
}) {
  const router = express.Router();

  router.use((request, response, next) => {
    if (!token) {
      response.status(503).json({ error: 'OPENCLAW_WEB_CODEX_TOKEN 尚未設定' });
      return;
    }

    if (request.get('authorization') !== `Bearer ${token}`) {
      response.status(401).json({ error: 'OpenClaw token 驗證失敗' });
      return;
    }

    next();
  });

  router.post('/', (request, response) => {
    const requirement = String(request.body?.requirement ?? '').trim();
    const validationError = validateRequirement(requirement);

    if (validationError) {
      response.status(validationError.status).json({ error: validationError.message });
      return;
    }

    const task = createAndRunTask({
      requirement,
      systemSettings: buildOpenClawMetadata(request.body),
      runner,
      socketHub,
      taskStore,
      taskControllers
    });

    response.status(202).json(formatTaskForOpenClaw(task, {
      message: `任務已建立：${task.taskId}`
    }));
  });

  router.get('/:taskId', (request, response) => {
    const task = taskStore.get(request.params.taskId);

    if (!task) {
      response.status(404).json({ error: '找不到任務' });
      return;
    }

    response.json(formatTaskForOpenClaw(task));
  });

  router.post('/:taskId/stop', (request, response) => {
    const { taskId } = request.params;
    const stopped = stopTask({
      taskId,
      socketHub,
      taskStore,
      taskControllers
    });

    if (!stopped.ok) {
      response.status(stopped.status).json({ error: stopped.error });
      return;
    }

    const task = taskStore.get(taskId);
    response.status(202).json(formatTaskForOpenClaw(task, {
      message: `已要求停止任務：${taskId}`,
      status: 'stopping'
    }));
  });

  return router;
}

function validateRequirement(requirement) {
  if (!requirement) {
    return { status: 400, message: 'requirement 不可為空' };
  }

  if (requirement.length > MAX_REQUIREMENT_LENGTH) {
    return { status: 413, message: `requirement 最多 ${MAX_REQUIREMENT_LENGTH} 字` };
  }

  return null;
}

function buildOpenClawMetadata(body = {}) {
  return {
    source: 'openclaw',
    openclaw: {
      channel: stringOrEmpty(body.channel),
      chatId: stringOrEmpty(body.chatId),
      senderId: stringOrEmpty(body.senderId),
      requestedAt: new Date().toISOString()
    }
  };
}

function formatTaskForOpenClaw(task, overrides = {}) {
  const status = overrides.status || task?.status || 'unknown';
  const logs = summarizeLogs(task?.logs || []);

  return {
    taskId: task?.taskId || '',
    status,
    message: overrides.message || buildStatusMessage(task, status),
    logs,
    result: task?.result || '',
    error: task?.error || '',
    createdAt: task?.createdAt || '',
    startedAt: task?.startedAt || '',
    completedAt: task?.completedAt || ''
  };
}

function buildStatusMessage(task, status) {
  if (!task) return '找不到任務';
  if (status === 'completed') return `任務完成：${task.taskId}`;
  if (status === 'failed') return `任務失敗：${task.error || task.taskId}`;
  if (status === 'interrupted') return `任務已停止：${task.taskId}`;
  if (status === 'running') return `任務執行中：${task.taskId}`;
  if (status === 'queued') return `任務排隊中：${task.taskId}`;
  return `任務狀態 ${status}：${task.taskId}`;
}

function summarizeLogs(logs) {
  return logs
    .filter((log) => !String(log.message || '').startsWith('[stderr]'))
    .slice(-DEFAULT_LOG_LIMIT)
    .map((log) => ({
      at: log.at,
      message: log.message
    }));
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}
