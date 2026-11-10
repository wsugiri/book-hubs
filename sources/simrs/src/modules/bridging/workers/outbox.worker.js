// src/modules/bridging/workers/outbox.worker.js
import { Op } from 'sequelize';
import { sequelize } from '../../../core/database/index.js';
import { sendToBpjsOrSatusehat } from '../clients/api.client.js';
import { logger } from '../../../core/config/logger.js';

export const processOutboxBatch = async (batchSize = 10) => {
  if (!sequelize.models.BridgingOutbox) {
    return 0;
  }

  // Gunakan transaksi untuk menjamin locking baris
  return await sequelize.transaction(async (t) => {
    // 1. Ambil pesan pending dengan baris terkunci (anti-duplikasi antar worker)
    const pendingItems = await sequelize.models.BridgingOutbox.findAll({
      where: {
        status: 'PENDING',
        nextAttemptAt: { [Op.lte]: new Date() }
      },
      limit: batchSize,
      lock: t.LOCK.UPDATE,
      skipLocked: true, // Worker lain tidak akan memproses baris yang sama
      transaction: t
    });

    if (pendingItems.length === 0) return 0;

    for (const item of pendingItems) {
      try {
        item.status = 'PROCESSING';
        await item.save({ transaction: t });

        // 2. Eksekusi pengiriman ke pihak ketiga (BPJS / SATUSEHAT)
        await sendToBpjsOrSatusehat(item.destination, item.eventType, item.payload);

        // 3. Sukses
        item.status = 'DELIVERED';
        await item.save({ transaction: t });
      } catch (err) {
        item.retryCount += 1;
        item.lastError = err.message;

        if (item.retryCount >= item.maxRetries) {
          item.status = 'FAILED';
          logger.error(`🚨 [OUTBOX DEAD-LETTER] Item ${item.id} gagal setelah ${item.maxRetries} percobaan!`);
        } else {
          item.status = 'PENDING';
          const delaySeconds = Math.pow(2, item.retryCount);
          item.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);
        }
        await item.save({ transaction: t });
      }
    }

    return pendingItems.length;
  });
};

