// src/modules/admission/handlers/registration.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import { registrationService } from '../services/index.js';

export const registerOutpatient = async (c) => {
  // 1. Ekstrak payload yang SUDAH divalidasi oleh Zod
  const payload = c.req.valid('json');

  // 2. Ekstrak data aktor (dari Auth Middleware)
  const actor = c.get('user') || { id: 'usr-default', role: 'NURSE' };

  // 3. Panggil service murni (TANPA objek 'c'!)
  const visit = await registrationService.createOutpatientVisit(payload, actor);

  // 4. Return dengan standard envelope
  return sendSuccess(c, visit, 'Pendaftaran rawat jalan berhasil dibuat', 201);
};

