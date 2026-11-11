// src/modules/bridging/index.js
export { bridgingRoutes } from './routes.js';
export { defineBridgingModels } from './models/index.js';
export { processOutboxBatch } from './workers/outbox.worker.js';
export { registerBridgingSubscribers } from './subscribers/index.js';

import * as outboxService from './services/outbox.service.js';

export const bridgingService = {
  queueTask: outboxService.scheduleOutboxTask,
  getStatus: outboxService.getOutboxStatusByKey
};
