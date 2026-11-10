// src/modules/pharmacy/services/pharmacy.service.js
import * as rxRepo from '../repositories/pharmacy.repository.js';
import { createAppError } from '../../../core/errors/AppError.js';

export const submitPrescription = async (payload, actor) => {
  if (!payload.medicines || payload.medicines.length === 0) {
    throw createAppError('Resep minimal harus memuat 1 item obat', 422, 'EMPTY_PRESCRIPTION_ITEMS');
  }

  return await rxRepo.create({
    ...payload,
    doctorId: actor.id,
    status: 'SUBMITTED'
  });
};

export const getPrescriptionsByVisit = async (visitId) => {
  return await rxRepo.findByVisitId(visitId);
};

