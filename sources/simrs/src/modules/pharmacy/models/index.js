// src/modules/pharmacy/models/index.js
import { definePrescriptionModel } from './Prescription.js';

export const definePharmacyModels = (sequelize) => {
  const Prescription = definePrescriptionModel(sequelize);
  return { Prescription };
};

