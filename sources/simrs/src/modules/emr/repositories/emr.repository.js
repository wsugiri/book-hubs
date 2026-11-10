// src/modules/emr/repositories/emr.repository.js
import { sequelize } from '../../../core/database/index.js';

export const create = async (data, options = {}) => {
  if (!sequelize.models.MedicalRecord) {
    return { id: 'mock-emr-id', ...data, createdAt: new Date() };
  }
  return await sequelize.models.MedicalRecord.create(data, options);
};

export const findByVisitId = async (visitId, options = {}) => {
  if (!sequelize.models.MedicalRecord) return null;
  return await sequelize.models.MedicalRecord.findOne({
    where: { visitId },
    ...options
  });
};

