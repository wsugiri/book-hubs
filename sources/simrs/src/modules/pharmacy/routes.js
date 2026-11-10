// src/modules/pharmacy/routes.js
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPrescriptionSchema } from './validators/pharmacy.validator.js';
import * as pharmacyHandler from './handlers/pharmacy.handler.js';
import { requireRole } from '../../core/middlewares/rbac.middleware.js';

export const pharmacyRoutes = new Hono();

pharmacyRoutes.post(
  '/prescriptions',
  requireRole('DOCTOR', 'ADMIN', '*'),
  zValidator('json', createPrescriptionSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  pharmacyHandler.createPrescription
);

pharmacyRoutes.get('/prescriptions/visit/:visitId', pharmacyHandler.getPrescriptionsByVisitId);

