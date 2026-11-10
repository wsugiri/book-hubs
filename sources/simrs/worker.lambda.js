import { processOutboxBatch } from './src/modules/bridging/workers/outbox.worker.js';
import { sequelize } from './src/core/database/index.js';
import { logger } from './src/core/config/logger.js';

export const handler = async (event, context) => {
  logger.info({ event }, '[LAMBDA WORKER] Outbox batch processing triggered');
  
  if (sequelize.connectionManager.initPools) {
    sequelize.connectionManager.initPools();
  }

  try {
    const processedCount = await processOutboxBatch(event.batchSize || 20);
    logger.info(`[LAMBDA WORKER] Selesai memproses ${processedCount} pesan`);
    return {
      statusCode: 200,
      body: JSON.stringify({ processed: processedCount })
    };
  } catch (error) {
    logger.error({ error }, '[LAMBDA WORKER ERROR]');
    throw error;
  } finally {
    if (sequelize.connectionManager.close) {
      await sequelize.connectionManager.close();
    }
  }
};

