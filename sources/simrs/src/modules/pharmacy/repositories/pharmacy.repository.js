// src/modules/pharmacy/repositories/pharmacy.repository.js
import { sequelize } from '../../../core/database/index.js';

export const create = async (data, options = {}) => {
  if (!sequelize.models.Prescription) {
    return { id: 'mock-rx-id', ...data, createdAt: new Date() };
  }
  return await sequelize.models.Prescription.create(data, options);
};

export const findByVisitId = async (visitId, options = {}) => {
  if (!sequelize.models.Prescription) return [];
  return await sequelize.models.Prescription.findAll({
    where: { visitId },
    ...options
  });
};

