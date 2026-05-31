const http = require('http');
const { Server } = require('socket.io');
require('./config/firebase');
const app = require('./app');
const env = require('./config/env');
const socketAuth = require('./middleware/socketAuth');
const { setSocketServer } = require('./services/socketService');
const logger = require('./utils/logger');

async function bootstrap() {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use(socketAuth);
  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    socket.emit('socket:ready', {
      userId: user.id,
      role: user.role,
      rooms: [`user:${user.id}`, `role:${user.role}`],
    });
  });

  setSocketServer(io);
  server.listen(env.port, () => {
    logger.info('server_started', { url: `http://localhost:${env.port}` });
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.error('server_error', { message: `Port ${env.port} is already in use` });
      // Exit so process managers (nodemon) can restart cleanly.
      process.exit(1);
    }
    // rethrow for other handlers to catch
    throw err;
  });
}

bootstrap().catch((error) => {
  logger.error('server_start_failed', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: reason?.message || String(reason), stack: reason?.stack });
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
