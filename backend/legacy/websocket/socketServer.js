import { Server } from 'socket.io';

export function createSocketServer(httpServer, { getTaskById }) {
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    socket.on('task_subscribe', (taskId) => {
      if (typeof taskId !== 'string' || !taskId.trim()) return;
      socket.join(taskRoom(taskId));
      socket.emit('task_log', {
        taskId,
        message: `已訂閱任務 ${taskId}`,
        at: new Date().toISOString()
      });

      const task = getTaskById(taskId);
      if (!task) return;

      task.logs.filter((log) => !isHiddenLogMessage(log.message)).forEach((log) => {
        socket.emit('task_log', {
          taskId,
          message: log.message,
          at: log.at
        });
      });

      if (task.status === 'running') {
        socket.emit('task_started', {
          taskId,
          message: '任務已開始',
          at: task.startedAt || new Date().toISOString()
        });
      }

      if (task.status === 'completed') {
        socket.emit('task_completed', {
          taskId,
          result: task.result,
          at: task.completedAt || new Date().toISOString()
        });
      }

      if (task.status === 'failed') {
        socket.emit('task_failed', {
          taskId,
          error: task.error,
          at: task.completedAt || new Date().toISOString()
        });
      }
    });
  });

  return {
    emitTaskEvent(eventName, taskId, payload = {}) {
      io.to(taskRoom(taskId)).emit(eventName, {
        taskId,
        at: new Date().toISOString(),
        ...payload
      });
    }
  };
}

function taskRoom(taskId) {
  return `task:${taskId}`;
}

function isHiddenLogMessage(message = '') {
  return message.startsWith('[stderr]');
}
