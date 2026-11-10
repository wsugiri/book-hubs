// src/modules/bridging/handlers/bridging.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as outboxRepo from '../repositories/outbox.repository.js';

export const queueBridgingTask = async (c) => {
  const payload = c.req.valid('json');
  const outbox = await outboxRepo.queueOutbox(payload);
  return sendSuccess(c, outbox, 'Tugas bridging berhasil dijadwalkan ke outbox queue', 202);
};

export const checkBridgingStatus = async (c) => {
  const { idempotencyKey } = c.req.param();
  const status = await outboxRepo.getOutboxStatus(idempotencyKey);
  return sendSuccess(c, status, 'Status tugas bridging');
};

