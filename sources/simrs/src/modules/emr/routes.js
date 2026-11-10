// src/modules/emr/routes.js
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSoapSchema } from './validators/emr.validator.js';
import * as emrHandler from './handlers/emr.handler.js';
import { requireRole } from '../../core/middlewares/rbac.middleware.js';

export const emrRoutes = new Hono();

emrRoutes.post(
  '/records/soap',
  requireRole('DOCTOR', 'ADMIN', '*'),
  zValidator('json', createSoapSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  emrHandler.submitSoapNotes
);

emrRoutes.get('/records/visit/:visitId', emrHandler.getRecordByVisitId);

