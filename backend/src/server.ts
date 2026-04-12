import { env } from './config/env';
import { db } from './config/database';
import app from './app';

// Health check endpoint (before any auth)
app.get('/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[server] 出缺勤管理系統 API 啟動於 port ${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
});

export default server;
