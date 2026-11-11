// src/core/database/audit-hook.js
import { requestContext } from '../http/context.js';
import { logger } from '../config/logger.js';

const IGNORED_MODELS = new Set(['ClinicalAuditTrail', 'BridgingOutbox']);

const getContextMetadata = () =>
  requestContext.getStore() || {
    actorId: 'SYSTEM',
    actorRole: 'SYSTEM',
    requestId: 'auto',
    clientIp: '127.0.0.1'
  };

const resolveTableInfo = (instance, options) => ({
  modelName: options?.model?.name || instance?._modelOptions?.name?.singular || '',
  tableName: options?.model?.tableName || instance?._modelOptions?.tableName || 'unknown_table'
});

export const registerAuditHooks = (sequelize) => {
  // 1. Hook setelah pembuatan data (CREATE)
  sequelize.addHook('afterCreate', async (instance, options) => {
    try {
      const { modelName, tableName } = resolveTableInfo(instance, options);
      if (IGNORED_MODELS.has(modelName) || !sequelize.models.ClinicalAuditTrail) return;

      const context = getContextMetadata();
      await sequelize.models.ClinicalAuditTrail.create(
        {
          tableName,
          recordId: String(instance.id),
          action: 'CREATE',
          actorId: context.actorId,
          actorRole: context.actorRole,
          requestId: context.requestId,
          clientIp: context.clientIp,
          oldValues: null,
          newValues: instance.toJSON ? instance.toJSON() : instance.dataValues
        },
        { transaction: options.transaction }
      );
    } catch (err) {
      logger.error({ err }, '[AUDIT HOOK ERROR] Gagal mencatat log audit CREATE');
    }
  });

  // 2. Hook setelah pembaruan data (UPDATE)
  sequelize.addHook('afterUpdate', async (instance, options) => {
    try {
      const { modelName, tableName } = resolveTableInfo(instance, options);
      if (IGNORED_MODELS.has(modelName) || !sequelize.models.ClinicalAuditTrail) return;

      const changedFields = instance.changed();
      if (!changedFields || changedFields.length === 0) return;

      const oldValues = {};
      const newValues = {};

      changedFields.forEach((field) => {
        oldValues[field] = instance.previous(field);
        newValues[field] = instance.get(field);
      });

      const context = getContextMetadata();
      await sequelize.models.ClinicalAuditTrail.create(
        {
          tableName,
          recordId: String(instance.id),
          action: 'UPDATE',
          actorId: context.actorId,
          actorRole: context.actorRole,
          requestId: context.requestId,
          clientIp: context.clientIp,
          oldValues,
          newValues
        },
        { transaction: options.transaction }
      );
    } catch (err) {
      logger.error({ err }, '[AUDIT HOOK ERROR] Gagal mencatat log audit UPDATE');
    }
  });

  // 3. Hook setelah penghapusan data (DELETE)
  sequelize.addHook('afterDestroy', async (instance, options) => {
    try {
      const { modelName, tableName } = resolveTableInfo(instance, options);
      if (IGNORED_MODELS.has(modelName) || !sequelize.models.ClinicalAuditTrail) return;

      const context = getContextMetadata();
      await sequelize.models.ClinicalAuditTrail.create(
        {
          tableName,
          recordId: String(instance.id),
          action: 'DELETE',
          actorId: context.actorId,
          actorRole: context.actorRole,
          requestId: context.requestId,
          clientIp: context.clientIp,
          oldValues: instance.toJSON ? instance.toJSON() : instance.dataValues,
          newValues: {}
        },
        { transaction: options.transaction }
      );
    } catch (err) {
      logger.error({ err }, '[AUDIT HOOK ERROR] Gagal mencatat log audit DELETE');
    }
  });
};
