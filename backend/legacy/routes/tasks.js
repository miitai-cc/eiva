import express from 'express';
import { randomUUID } from 'node:crypto';
import { parseScheduleIntent } from '../services/scheduleIntentParser.js';

export function createTaskRouter({ runner, socketHub, taskStore, scheduleStore, taskControllers = new Map() }) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.json({
      tasks: taskStore.list({
        limit: request.query.limit
      })
    });
  });

  router.post('/', (request, response) => {
    const requirement = String(request.body?.requirement ?? '').trim();

    if (!requirement) {
      response.status(400).json({ error: 'requirement 不可為空' });
      return;
    }

    if (requirement.length > 8000) {
      response.status(413).json({ error: 'requirement 最多 8000 字' });
      return;
    }

    const scheduleIntent = parseScheduleIntent(requirement);
    if (scheduleIntent.isSchedule) {
      if (!scheduleStore) {
        response.status(503).json({ error: '排程服務尚未啟用' });
        return;
      }
      if (scheduleIntent.error) {
        response.status(400).json({ error: scheduleIntent.error });
        return;
      }

      const schedule = scheduleStore.create({
        scheduleId: randomUUID(),
        name: summarizeRequirement(scheduleIntent.schedule.requirement),
        requirement: scheduleIntent.schedule.requirement,
        enabled: true,
        sendAt: scheduleIntent.schedule.sendAt,
        continuous: scheduleIntent.schedule.continuous,
        intervalValue: scheduleIntent.schedule.intervalValue,
        intervalUnit: scheduleIntent.schedule.intervalUnit,
        repeatCount: scheduleIntent.schedule.repeatCount,
        scheduleKind: scheduleIntent.schedule.scheduleKind,
        fixedFrequency: scheduleIntent.schedule.fixedFrequency,
        fixedTime: scheduleIntent.schedule.fixedTime,
        fixedDayOfWeek: scheduleIntent.schedule.fixedDayOfWeek,
        fixedDayOfMonth: scheduleIntent.schedule.fixedDayOfMonth,
        systemSettings: request.body?.systemSettings || {}
      });
      response.status(202).json({
        type: 'schedule',
        scheduleId: schedule.scheduleId,
        status: schedule.enabled ? 'scheduled' : 'disabled',
        message: `已建立排程：${formatScheduleSummary(schedule)}`,
        schedule
      });
      return;
    }

    const task = createAndRunTask({
      requirement,
      systemSettings: request.body?.systemSettings || {},
      runner,
      socketHub,
      taskStore,
      taskControllers
    });
    response.status(202).json({ taskId: task.taskId, status: task.status });
  });

  router.post('/:taskId/stop', (request, response) => {
    const { taskId } = request.params;
    const task = taskStore.get(taskId);

    if (!task) {
      response.status(404).json({ error: '找不到任務' });
      return;
    }

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

    response.status(202).json({ taskId, status: 'stopping' });
  });

  router.get('/:taskId', (request, response) => {
    const task = taskStore.get(request.params.taskId);

    if (!task) {
      response.status(404).json({ error: '找不到任務' });
      return;
    }

    response.json(task);
  });

  return router;
}

function summarizeRequirement(requirement) {
  return requirement.length > 40 ? `${requirement.slice(0, 40)}...` : requirement;
}

function formatScheduleSummary(schedule) {
  if (schedule.scheduleKind !== 'fixed') return schedule.sendAt;
  const frequencyLabel = {
    daily: '每日',
    weekly: `每星期${formatWeekday(schedule.fixedDayOfWeek)}`,
    monthly: `每月${schedule.fixedDayOfMonth}日`
  }[schedule.fixedFrequency] || '固定排程';
  return `${frequencyLabel} ${schedule.fixedTime}`;
}

function formatWeekday(value) {
  return ['日', '一', '二', '三', '四', '五', '六'][Number.parseInt(value, 10) || 0];
}

export function createAndRunTask({
  requirement,
  systemSettings = {},
  runner,
  socketHub,
  taskStore,
  taskControllers
}) {
  const now = new Date().toISOString();
  const task = taskStore.create({
    taskId: randomUUID(),
    requirement,
    systemSettings,
    logs: [{ at: now, message: '任務已建立' }],
    createdAt: now
  });

  const controller = new AbortController();
  taskControllers.set(task.taskId, controller);
  setImmediate(() => {
    runTask(task.taskId, runner, socketHub, taskStore, controller)
      .finally(() => taskControllers.delete(task.taskId));
  });

  return task;
}

export function stopTask({ taskId, socketHub, taskStore, taskControllers }) {
  const task = taskStore.get(taskId);

  if (!task) {
    return { ok: false, status: 404, error: '找不到任務' };
  }

  if (task.status !== 'queued' && task.status !== 'running') {
    return { ok: false, status: 409, error: '任務目前不可停止' };
  }

  const controller = taskControllers.get(taskId);
  if (!controller) {
    return { ok: false, status: 409, error: '找不到可停止的執行程序' };
  }

  const entry = { at: new Date().toISOString(), message: '已要求停止任務' };
  taskStore.appendLog(taskId, entry);
  socketHub.emitTaskEvent('task_log', taskId, { message: entry.message, at: entry.at });
  controller.abort();

  return { ok: true };
}

export async function runTask(taskId, runner, socketHub, taskStore, controller) {
  const task = taskStore.get(taskId);
  if (!task) return;
  let heartbeatTimer;

  const addLog = (message) => {
    const entry = { at: new Date().toISOString(), message };
    taskStore.appendLog(taskId, entry);
    socketHub.emitTaskEvent('task_log', taskId, { message, at: entry.at });
  };

  try {
    if (controller.signal.aborted) {
      interruptTask(taskId, socketHub, taskStore);
      return;
    }

    const startedAt = new Date().toISOString();
    taskStore.update(taskId, {
      status: 'running',
      startedAt
    });
    socketHub.emitTaskEvent('task_started', taskId, {
      message: '任務已開始',
      at: startedAt
    });
    heartbeatTimer = setInterval(() => {
      const currentTask = taskStore.get(taskId);
      if (!currentTask || currentTask.status !== 'running') return;
      addLog('Codex 仍在執行中，請稍候');
    }, 15000);
    heartbeatTimer.unref?.();

    const result = await runner.run(task.requirement, {
      onLog: addLog,
      signal: controller.signal
    });

    const completedAt = new Date().toISOString();
    taskStore.update(taskId, {
      status: 'completed',
      result,
      completedAt
    });
    socketHub.emitTaskEvent('task_completed', taskId, {
      result,
      at: completedAt
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      interruptTask(taskId, socketHub, taskStore);
      return;
    }

    const message = error instanceof Error ? error.message : '任務處理失敗';
    const completedAt = new Date().toISOString();
    taskStore.update(taskId, {
      status: 'failed',
      error: message,
      completedAt
    });
    socketHub.emitTaskEvent('task_failed', taskId, {
      error: message,
      at: completedAt
    });
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }
}

function interruptTask(taskId, socketHub, taskStore) {
  const completedAt = new Date().toISOString();
  taskStore.update(taskId, {
    status: 'interrupted',
    error: '任務已停止',
    completedAt
  });
  socketHub.emitTaskEvent('task_interrupted', taskId, {
    error: '任務已停止',
    at: completedAt
  });
}
