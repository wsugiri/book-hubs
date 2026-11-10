import { serve } from '@hono/node-server';
import app from './src/app.js';
import { sequelize } from './src/core/database/index.js';
import { logger } from './src/core/config/logger.js';

const port = Number(process.env.PORT) || 3000;

// Jalankan HTTP server Node.js
const server = serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    logger.info(`🚀 [DOCKER RUNTIME] SIMRS Core API berjalan di http://localhost:${info.port}`);
  }
);

// GRACEFUL SHUTDOWN (Sangat krusial untuk transaksi medis!)
// Mencegah pemotongan transaksi di tengah jalan saat container di-restart/redeploy
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 25000;
let isShuttingDown = false;

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn(`[SHUTDOWN] Menerima sinyal ${signal}. Menutup server secara aman...`);

  const forceExit = setTimeout(() => {
    logger.error('[SHUTDOWN] Batas waktu habis, paksa keluar.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // 1. TUNGGU request aktif selesai
    await closeHttpServer();
    logger.info('[SHUTDOWN] Semua request aktif selesai, HTTP listener ditutup.');

    // 2. Tutup pool database setelah tidak ada lagi yang memakainya
    await sequelize.close();
    logger.info('[SHUTDOWN] Seluruh koneksi basis data berhasil ditutup.');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '[SHUTDOWN ERROR] Gagal menutup server dengan bersih');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

