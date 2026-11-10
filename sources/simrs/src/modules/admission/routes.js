// src/modules/admission/routes.js
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createOutpatientSchema } from './validators/registration.validator.js';
import * as registrationHandler from './handlers/registration.handler.js';
import { requireRole } from '../../core/middlewares/rbac.middleware.js';

export const admissionRoutes = new Hono();

// POST /api/v1/admissions/outpatient
admissionRoutes.post(
  '/outpatient',
  requireRole('NURSE', 'ADMIN', 'DOCTOR', '*'),
  zValidator('json', createOutpatientSchema, (result) => {
    // Teruskan ZodError ke globalErrorHandler agar envelope error seragam
    if (!result.success) throw result.error;
  }),
  registrationHandler.registerOutpatient
);

