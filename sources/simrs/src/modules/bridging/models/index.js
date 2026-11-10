// src/modules/bridging/models/index.js
import { defineBridgingOutboxModel } from './BridgingOutbox.js';
import { defineClinicalAuditTrailModel } from './ClinicalAuditTrail.js';

export const defineBridgingModels = (sequelize) => {
  const BridgingOutbox = defineBridgingOutboxModel(sequelize);
  const ClinicalAuditTrail = defineClinicalAuditTrailModel(sequelize);
  return { BridgingOutbox, ClinicalAuditTrail };
};

