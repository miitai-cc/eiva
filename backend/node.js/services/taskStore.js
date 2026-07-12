export function createTaskStore(db) {
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      task_id,
      requirement,
      system_settings,
      status,
      result,
      error,
      created_at,
      started_at,
      completed_at
    ) VALUES (
      @taskId,
      @requirement,
      @systemSettings,
      @status,
      @result,
      @error,
      @createdAt,
      @startedAt,
      @completedAt
    )
  `);
  const insertLog = db.prepare(`
    INSERT INTO task_logs (task_id, message, at)
    VALUES (@taskId, @message, @at)
  `);
  const selectTask = db.prepare(`
    SELECT
      task_id AS taskId,
      requirement,
      system_settings AS systemSettings,
      status,
      result,
      error,
      created_at AS createdAt,
      started_at AS startedAt,
      completed_at AS completedAt
    FROM tasks
    WHERE task_id = ?
  `);
  const selectLogs = db.prepare(`
    SELECT at, message
    FROM task_logs
    WHERE task_id = ?
    ORDER BY id ASC
  `);
  const updateTask = db.prepare(`
    UPDATE tasks
    SET
      status = @status,
      result = @result,
      error = @error,
      started_at = @startedAt,
      completed_at = @completedAt
    WHERE task_id = @taskId
  `);
  const selectRecentTasks = db.prepare(`
    SELECT
      task_id AS taskId,
      requirement,
      system_settings AS systemSettings,
      status,
      result,
      error,
      created_at AS createdAt,
      started_at AS startedAt,
      completed_at AS completedAt
    FROM tasks
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const createTaskWithLogs = db.transaction((task) => {
    insertTask.run({
      ...task,
      systemSettings: JSON.stringify(task.systemSettings || {})
    });

    task.logs.forEach((log) => {
      insertLog.run({
        taskId: task.taskId,
        message: log.message,
        at: log.at
      });
    });
  });

  return {
    create({ taskId, requirement, systemSettings = {}, logs = [], createdAt = new Date().toISOString() }) {
      const task = {
        taskId,
        requirement,
        systemSettings,
        status: 'queued',
        logs,
        result: '',
        error: '',
        createdAt,
        startedAt: '',
        completedAt: ''
      };

      createTaskWithLogs(task);
      return task;
    },

    get(taskId) {
      const row = selectTask.get(taskId);
      if (!row) return null;

      return normalizeTask(row, selectLogs.all(taskId));
    },

    list({ limit = 30 } = {}) {
      return selectRecentTasks.all(Math.max(1, Math.min(Number.parseInt(limit, 10) || 30, 100)))
        .map((row) => normalizeTask(row, selectLogs.all(row.taskId)));
    },

    update(taskId, patch) {
      const task = this.get(taskId);
      if (!task) return null;
      const next = { ...task, ...patch };

      updateTask.run({
        taskId,
        status: next.status,
        result: next.result,
        error: next.error,
        startedAt: next.startedAt,
        completedAt: next.completedAt
      });

      return this.get(taskId);
    },

    appendLog(taskId, log) {
      const task = this.get(taskId);
      if (!task) return null;

      insertLog.run({
        taskId,
        message: log.message,
        at: log.at
      });

      return this.get(taskId);
    }
  };
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeTask(row, logs) {
  return {
    ...row,
    systemSettings: parseJsonObject(row.systemSettings),
    logs
  };
}
