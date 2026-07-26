import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import prisma from './config/database';
import { startProactiveJobs } from './jobs/proactive';

const httpServer = createServer(app);

// ─── Socket.IO setup ─────────────────────────────────────────────────────────
export const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a store-specific room so broadcasts can be scoped per store
  socket.on('join-store', (storeId: string) => {
    socket.join(`store:${storeId}`);
    logger.info(`Socket ${socket.id} joined store room: ${storeId}`);
  });

  socket.on('leave-store', (storeId: string) => {
    socket.leave(`store:${storeId}`);
    logger.info(`Socket ${socket.id} left store room: ${storeId}`);
  });

  socket.on('join-driver', (driverId: string) => {
    socket.join(`driver:${driverId}`);
  });

  socket.on('join-order', (orderId: string) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });

  // Force exit after 10 s if server hasn't closed yet
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(config.port, () => {
  logger.info(
    `NeighborMart API running on port ${config.port} [${config.nodeEnv}]`
  );
  startProactiveJobs();
});

export default httpServer;
