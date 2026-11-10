// src/modules/admission/repositories/visit.repository.js
import { Op } from 'sequelize';
import { sequelize } from '../../../core/database/index.js';

export const findActiveVisitToday = async (patientId, options = {}) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (!sequelize.models.Visit) {
    return null;
  }

  return await sequelize.models.Visit.findOne({
    where: {
      patientId,
      status: {
        [Op.in]: ['WAITING_FOR_TRIAGE', 'IN_CONSULTATION', 'WAITING_FOR_MEDICINE']
      },
      createdAt: {
        [Op.gte]: startOfDay
      }
    },
    ...options
  });
};

export const findById = async (id, options = {}) => {
  if (!sequelize.models.Visit) return null;
  return await sequelize.models.Visit.findByPk(id, options);
};

export const create = async (data, options = {}) => {
  if (!sequelize.models.Visit) {
    return {
      id: 'mock-visit-id',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  return await sequelize.models.Visit.create(data, options);
};

export const updateStatus = async (id, status, options = {}) => {
  if (!sequelize.models.Visit) return null;
  const visit = await sequelize.models.Visit.findByPk(id, options);
  if (!visit) return null;
  visit.status = status;
  await visit.save(options);
  return visit;
};

