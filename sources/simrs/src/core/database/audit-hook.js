// src/core/database/audit-hook.js
import { requestContext } from '../http/context.js';
import { logger } from '../config/logger.js';

export const registerAuditHooks = (sequelize) => {
  // Hook setelah pembaruan data (UPDATE)
  sequelize.addHook('afterUpdate', async (instance, options) => {
    try {
      const modelName = options.model?.name || instance._modelOptions?.name?.singular || '';
      if (modelName === 'ClinicalAuditTrail' || modelName === 'BridgingOutbox') return;

      const context = requestContext.getStore() || { actorId: 'SYSTEM', actorRole: 'SYSTEM', requestId: 'auto', clientIp: '127.0.0.1' };
      const changedFields = instance.changed();

      if (!changedFields || changedFields.length === 0) return;

      const oldValues = {};
      const newValues = {};

      changedFields.forEach((field) => {
        oldValues[field] = instance.previous(field);
        newValues[field] = instance.get(field);
      });

      const tableName = options.model?.tableName || instance._modelOptions?.tableName || 'unknown_table';

      if (sequelize.models.ClinicalAuditTrail) {
        await sequelize.models.ClinicalAuditTrail.create({
          tableName,
          recordId: String(instance.id),
          action: 'UPDATE',
          actorId: context.actorId,
          actorRole: context.actorRole,
          requestId: context.requestId,
          clientIp: context.clientIp,
          oldValues,
          newValues
        }, { transaction: options.transaction });
      }
    } catch (err) {
      logger.error({ err }, '[AUDIT HOOK ERROR] Gagal mencatat log audit rekam medis');
    }
  });
};

