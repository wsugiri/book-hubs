// src/modules/bridging/workers/outbox.worker.js
import { Op } from 'sequelize';
import { sequelize } from '../../../core/database/index.js';
import { sendToBpjsOrSatusehat } from '../clients/api.client.js';
import { logger } from '../../../core/config/logger.js';

export const processOutboxBatch = async (batchSize = 10) => {
  if (!sequelize.models.BridgingOutbox) {
    return 0;
  }

  // FASE 1: Claim & Lock baris secara cepat di dalam transaksi DB singkat (< 5ms)
  // Jangan pernah melakukan panggilan HTTP eksternal di dalam transaksi DB yang sedang menahan row lock!
  const claimedItems = await sequelize.transaction(async (t) => {
    const pendingItems = await sequelize.models.BridgingOutbox.findAll({
      where: {
        status: 'PENDING',
        nextAttemptAt: { [Op.lte]: new Date() }
      },
      limit: batchSize,
      lock: t.LOCK.UPDATE,
      skipLocked: true, // Worker lain tidak akan mengambil baris yang sama
      transaction: t
    });

    for (const item of pendingItems) {
      item.status = 'PROCESSING';
      await item.save({ transaction: t });
    }

    return pendingItems;
  });

  if (claimedItems.length === 0) return 0;

  // FASE 2: Eksekusi pengiriman HTTP di luar transaksi database
  for (const item of claimedItems) {
    try {
      await sendToBpjsOrSatusehat(item.destination, item.eventType, item.payload);

      item.status = 'DELIVERED';
      await item.save();
    } catch (err) {
      item.retryCount += 1;
      item.lastError = err.message;

      if (item.retryCount >= item.maxRetries) {
        item.status = 'FAILED';
        logger.error({ outboxId: item.id }, `🚨 [OUTBOX DEAD-LETTER] Item gagal setelah ${item.maxRetries} percobaan!`);
      } else {
        item.status = 'PENDING';
        const delaySeconds = Math.pow(2, item.retryCount);
        item.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);
      }
      await item.save();
    }
  }

  return claimedItems.length;
};
