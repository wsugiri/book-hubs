// src/modules/bridging/repositories/outbox.repository.js
import { sequelize } from '../../../core/database/index.js';

export const queueOutbox = async (data, options = {}) => {
  if (!sequelize.models.BridgingOutbox) {
    return { id: 'mock-outbox-id', ...data };
  }
  return await sequelize.models.BridgingOutbox.create(data, options);
};

export const getOutboxStatus = async (idempotencyKey) => {
  if (!sequelize.models.BridgingOutbox) return null;
  return await sequelize.models.BridgingOutbox.findOne({ where: { idempotencyKey } });
};

