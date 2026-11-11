import { processOutboxBatch } from './src/modules/bridging/workers/outbox.worker.js';
import { logger } from './src/core/config/logger.js';
import { sequelize } from './src/core/database/index.js';
import { registerModels } from './src/core/database/register-models.js';

// Inisialisasi model Sequelize sebelum worker berjalan
registerModels(sequelize);

let isRunning = true;

const startWorker = async () => {
  logger.info('🚀 [OUTBOX WORKER] Berjalan mendengarkan antrean bridging...');
  while (isRunning) {
    try {
      const processed = await processOutboxBatch(10);
      // Jika antrean kosong, istirahat 3 detik
      if (processed === 0) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      logger.error({ err }, '[OUTBOX WORKER ERROR]');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
};

const stopWorker = async () => {
  isRunning = false;
  logger.info('[OUTBOX WORKER] Menghentikan worker...');
  await sequelize.close();
  process.exit(0);
};

process.on('SIGTERM', stopWorker);
process.on('SIGINT', stopWorker);

startWorker();
