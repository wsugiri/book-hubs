// src/modules/admission/services/visit-query.service.js
import * as visitRepo from '../repositories/visit.repository.js';
import { createNotFoundError } from '../../../core/errors/AppError.js';

export const getSummaryById = async (visitId) => {
  const visit = await visitRepo.findById(visitId);
  if (!visit) {
    throw createNotFoundError('Kunjungan tidak ditemukan', 'VISIT_NOT_FOUND');
  }
  return {
    id: visit.id,
    patientId: visit.patientId,
    polyclinicId: visit.polyclinicId,
    status: visit.status,
    registeredAt: visit.registeredAt
  };
};

export const isPatientCurrentlyAdmitted = async (patientId) => {
  const activeVisit = await visitRepo.findActiveVisitToday(patientId);
  return Boolean(activeVisit);
};

