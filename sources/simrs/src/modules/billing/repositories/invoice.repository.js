// src/modules/billing/repositories/invoice.repository.js
import { sequelize } from '../../../core/database/index.js';

export const create = async (data, options = {}) => {
  if (!sequelize.models.Invoice) {
    return {
      id: 'mock-invoice-id',
      ...data,
      createdAt: new Date()
    };
  }
  return await sequelize.models.Invoice.create(data, options);
};

export const findByVisitId = async (visitId, options = {}) => {
  if (!sequelize.models.Invoice) return null;
  return await sequelize.models.Invoice.findOne({
    where: { visitId },
    ...options
  });
};

export const updateStatus = async (id, status, options = {}) => {
  if (!sequelize.models.Invoice) return null;
  const invoice = await sequelize.models.Invoice.findByPk(id, options);
  if (!invoice) return null;
  invoice.status = status;
  await invoice.save(options);
  return invoice;
};

