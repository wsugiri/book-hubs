// src/modules/master-data/services/master-data.service.js
import * as masterRepo from '../repositories/master-data.repository.js';
import { createNotFoundError } from '../../../core/errors/AppError.js';

export const getPolyclinicDetail = async (id) => {
  const poli = await masterRepo.findPolyclinicById(id);
  if (!poli) {
    throw createNotFoundError('Poliklinik tidak ditemukan', 'POLYCLINIC_NOT_FOUND');
  }
  return poli;
};

export const getAllPolyclinics = async () => {
  return await masterRepo.listPolyclinics();
};

