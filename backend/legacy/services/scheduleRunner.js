import { randomUUID } from 'node:crypto';
import { runTask } from '../routes/tasks.js';

const DEFAULT_POLL_INTERVAL_MS = 5000;

export function startScheduleRunner({
  scheduleStore,
  taskStore,
  runner,
  socketHub,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
}) {
  const runningSchedules = new Set();

  const tick = () => {
    const dueSchedules = scheduleStore.listDue(new Date());

    dueSchedules.forEach((schedule) => {
      if (runningSchedules.has(schedule.scheduleId)) return;
      runningSchedules.add(schedule.scheduleId);

      executeSchedule(schedule, {
        scheduleStore,
        taskStore,
        runner,
        socketHub
      }).finally(() => {
        runningSchedules.delete(schedule.scheduleId);
      });
    });
  };

  const timer = setInterval(tick, pollIntervalMs);
  timer.unref?.();
  queueMicrotask(tick);

  return {
    stop() {
      clearInterval(timer);
    }
  };
}

async function executeSchedule(schedule, { scheduleStore, taskStore, runner, socketHub }) {
  const now = new Date().toISOString();
  const taskId = randomUUID();
  const runId = randomUUID();

  taskStore.create({
    taskId,
    requirement: schedule.requirement,
    systemSettings: schedule.systemSettings,
    logs: [{
      at: now,
      message: `排程已觸發：${schedule.name || schedule.scheduleId}`
    }],
    createdAt: now
  });

  scheduleStore.createRun({
    runId,
    scheduleId: schedule.scheduleId,
    taskId,
    status: 'started',
    startedAt: now
  });

  scheduleStore.markSent(schedule.scheduleId, now);

  const controller = new AbortController();
  await runTask(taskId, runner, socketHub, taskStore, controller);

  const completedTask = taskStore.get(taskId);
  scheduleStore.updateRun(runId, {
    status: completedTask?.status || 'completed',
    completedAt: completedTask?.completedAt || new Date().toISOString(),
    error: completedTask?.error || ''
  });
}
