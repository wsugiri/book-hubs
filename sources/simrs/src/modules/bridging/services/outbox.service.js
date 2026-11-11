// src/modules/bridging/services/outbox.service.js
import * as outboxRepo from '../repositories/outbox.repository.js';
import { createNotFoundError } from '../../../core/errors/AppError.js';

export const scheduleOutboxTask = async (payload, options = {}) => {
  return await outboxRepo.queueOutbox(payload, options);
};

export const getOutboxStatusByKey = async (idempotencyKey) => {
  const status = await outboxRepo.getOutboxStatus(idempotencyKey);
  if (!status) {
    throw createNotFoundError('Data antrean bridging tidak ditemukan', 'OUTBOX_TASK_NOT_FOUND');
  }
  return status;
};

