import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function createDatabase({ projectRoot, databasePath = process.env.SQLITE_PATH } = {}) {
  const resolvedPath = path.resolve(
    databasePath || path.join(projectRoot, 'backend', 'data', 'suap.sqlite')
  );

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);

  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      requirement TEXT NOT NULL,
      system_settings TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      message TEXT NOT NULL,
      at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      schedule_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      requirement TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      send_at TEXT NOT NULL DEFAULT '',
      continuous INTEGER NOT NULL DEFAULT 0,
      interval_value INTEGER NOT NULL DEFAULT 1,
      interval_unit TEXT NOT NULL DEFAULT 'minutes',
      repeat_count INTEGER NOT NULL DEFAULT 2,
      remaining_count INTEGER NOT NULL DEFAULT 0,
      last_sent_at TEXT NOT NULL DEFAULT '',
      next_send_at TEXT NOT NULL DEFAULT '',
      schedule_kind TEXT NOT NULL DEFAULT 'one_time',
      fixed_frequency TEXT NOT NULL DEFAULT '',
      fixed_time TEXT NOT NULL DEFAULT '15:00',
      fixed_day_of_week INTEGER NOT NULL DEFAULT 1,
      fixed_day_of_month INTEGER NOT NULL DEFAULT 1,
      system_settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_runs (
      run_id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      task_id TEXT,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_schedule_runs_schedule_id ON schedule_runs(schedule_id);
  `);

  ensureColumn(db, 'schedules', 'send_at', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'schedules', 'continuous', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'schedules', 'interval_value', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'schedules', 'interval_unit', "TEXT NOT NULL DEFAULT 'minutes'");
  ensureColumn(db, 'schedules', 'repeat_count', 'INTEGER NOT NULL DEFAULT 2');
  ensureColumn(db, 'schedules', 'remaining_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'schedules', 'last_sent_at', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'schedules', 'next_send_at', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'schedules', 'schedule_kind', "TEXT NOT NULL DEFAULT 'one_time'");
  ensureColumn(db, 'schedules', 'fixed_frequency', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'schedules', 'fixed_time', "TEXT NOT NULL DEFAULT '15:00'");
  ensureColumn(db, 'schedules', 'fixed_day_of_week', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'schedules', 'fixed_day_of_month', 'INTEGER NOT NULL DEFAULT 1');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_schedules_next_send_at ON schedules(enabled, next_send_at);
  `);
}

function ensureColumn(db, tableName, columnName, definition) {
  const existingColumns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = existingColumns.some((column) => column.name === columnName);

  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
