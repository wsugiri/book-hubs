// src/core/database/register-models.js
// Pengecualian terdokumentasi: satu-satunya file core yang menyentuh modules untuk bootstrap
import { defineMasterDataModels } from '../../modules/master-data/index.js';
import { defineAdmissionModels } from '../../modules/admission/index.js';
import { defineEmrModels } from '../../modules/emr/index.js';
import { definePharmacyModels } from '../../modules/pharmacy/index.js';
import { defineBillingModels } from '../../modules/billing/index.js';
import { defineBridgingModels } from '../../modules/bridging/index.js';
import { defineClinicalAuditTrailModel } from './models/ClinicalAuditTrail.js';
import { registerAuditHooks } from './audit-hook.js';

export const registerModels = (sequelize) => {
  // 1. Model Infrastruktur Inti (Shared Kernel)
  defineClinicalAuditTrailModel(sequelize);

  // 2. Model Bounded Contexts
  defineMasterDataModels(sequelize);
  defineAdmissionModels(sequelize);
  defineEmrModels(sequelize);
  definePharmacyModels(sequelize);
  defineBillingModels(sequelize);
  defineBridgingModels(sequelize);

  // 3. Pasang Global Audit Hooks (Permenkes No. 24/2022)
  registerAuditHooks(sequelize);
};
