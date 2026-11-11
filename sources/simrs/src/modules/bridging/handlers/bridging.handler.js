// src/modules/bridging/handlers/bridging.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as outboxService from '../services/outbox.service.js';

export const queueBridgingTask = async (c) => {
  const payload = c.req.valid('json');
  const outbox = await outboxService.scheduleOutboxTask(payload);
  return sendSuccess(c, outbox, 'Tugas bridging berhasil dijadwalkan ke outbox queue', 202);
};

export const checkBridgingStatus = async (c) => {
  const { idempotencyKey } = c.req.param();
  const status = await outboxService.getOutboxStatusByKey(idempotencyKey);
  return sendSuccess(c, status, 'Status tugas bridging');
};
