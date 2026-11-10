// src/modules/bridging/routes.js
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { queueOutboxSchema } from './validators/bridging.validator.js';
import * as bridgingHandler from './handlers/bridging.handler.js';
import { requireRole } from '../../core/middlewares/rbac.middleware.js';

export const bridgingRoutes = new Hono();

bridgingRoutes.post(
  '/outbox/queue',
  requireRole('ADMIN', 'SYSTEM', '*'),
  zValidator('json', queueOutboxSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  bridgingHandler.queueBridgingTask
);

bridgingRoutes.get('/outbox/status/:idempotencyKey', bridgingHandler.checkBridgingStatus);

