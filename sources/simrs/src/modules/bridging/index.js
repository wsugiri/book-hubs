// src/modules/bridging/index.js
export { bridgingRoutes } from './routes.js';
export { defineBridgingModels } from './models/index.js';
export { processOutboxBatch } from './workers/outbox.worker.js';

import * as outboxRepo from './repositories/outbox.repository.js';

export const bridgingService = {
  queueTask: outboxRepo.queueOutbox,
  getStatus: outboxRepo.getOutboxStatus
};

