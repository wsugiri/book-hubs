// src/modules/emr/services/emr.service.js
import * as emrRepo from '../repositories/emr.repository.js';
import { createAppError } from '../../../core/errors/AppError.js';

export const saveClinicalNotes = async (payload, actor) => {
  if (!payload.visitId || !payload.patientId) {
    throw createAppError('visitId dan patientId wajib diisi', 400, 'INVALID_EMR_PAYLOAD');
  }

  return await emrRepo.create({
    ...payload,
    doctorId: actor.id,
    signedAt: new Date()
  });
};

export const getRecordByVisit = async (visitId) => {
  const record = await emrRepo.findByVisitId(visitId);
  if (!record) {
    throw createAppError('Catatan rekam medis tidak ditemukan', 404, 'EMR_NOT_FOUND');
  }
  return record;
};

