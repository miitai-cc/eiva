import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createOpenClawTaskRouter } from './routes/openclawTasks.js';
import { createScheduleRouter } from './routes/schedules.js';
import { createTaskRouter } from './routes/tasks.js';
import { CodexRunner } from './services/codexRunner.js';
import { createDatabase } from './services/db.js';
import { startScheduleRunner } from './services/scheduleRunner.js';
import { createScheduleStore } from './services/scheduleStore.js';
import { createTaskStore } from './services/taskStore.js';
import { createSocketServer } from './websocket/socketServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(projectRoot, 'frontend', 'app');
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
const server = http.createServer(app);
const db = createDatabase({ projectRoot });
const taskStore = createTaskStore(db);
const scheduleStore = createScheduleStore(db);
const taskControllers = new Map();
const socketHub = createSocketServer(server, {
  getTaskById: taskStore.get
});
const runner = new CodexRunner({
  projectRoot: process.env.PROJECT_ROOT ?? projectRoot,
  allowedRoot: projectRoot,
  codexCommand: process.env.CODEX_CLI_COMMAND ?? 'codex',
  codexSandbox: process.env.CODEX_SANDBOX ?? 'workspace-write'
});
startScheduleRunner({
  scheduleStore,
  taskStore,
  runner,
  socketHub
});

app.use(express.json({ limit: '64kb' }));
app.use(
  '/api/tasks',
  createTaskRouter({
    runner,
    socketHub,
    taskStore,
    scheduleStore,
    taskControllers
  })
);
app.use(
  '/api/openclaw/tasks',
  createOpenClawTaskRouter({
    runner,
    socketHub,
    taskStore,
    taskControllers
  })
);
app.use(
  '/api/schedules',
  createScheduleRouter({
    scheduleStore
  })
);

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

const vite = await createViteServer({
  root: frontendRoot,
  appType: 'spa',
  plugins: [react()],
  server: {
    middlewareMode: true,
    hmr: {
      server
    }
  }
});

app.use(vite.middlewares);

server.listen(PORT, () => {
  console.log(`Eiva running at http://localhost:${PORT}`);
});
