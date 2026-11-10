// src/modules/pharmacy/handlers/pharmacy.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as pharmacyService from '../services/pharmacy.service.js';

export const createPrescription = async (c) => {
  const payload = c.req.valid('json');
  const actor = c.get('user') || { id: 'usr-doctor-01', role: 'DOCTOR' };

  const prescription = await pharmacyService.submitPrescription(payload, actor);
  return sendSuccess(c, prescription, 'Resep elektronik berhasil dibuat', 201);
};

export const getPrescriptionsByVisitId = async (c) => {
  const { visitId } = c.req.param();
  const prescriptions = await pharmacyService.getPrescriptionsByVisit(visitId);
  return sendSuccess(c, prescriptions, 'Data resep berhasil diambil');
};

