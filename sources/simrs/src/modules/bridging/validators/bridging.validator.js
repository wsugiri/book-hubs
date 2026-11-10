// src/modules/bridging/validators/bridging.validator.js
import { z } from 'zod';

export const queueOutboxSchema = z.object({
  destination: z.enum(['BPJS_VCLAIM', 'BPJS_ANTROL', 'SATUSEHAT_FHIR']),
  eventType: z.string().min(1),
  idempotencyKey: z.string().min(1),
  payload: z.record(z.any())
});

