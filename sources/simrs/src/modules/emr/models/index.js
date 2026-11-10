// src/modules/emr/models/index.js
import { defineMedicalRecordModel } from './MedicalRecord.js';

export const defineEmrModels = (sequelize) => {
  const MedicalRecord = defineMedicalRecordModel(sequelize);
  return { MedicalRecord };
};

