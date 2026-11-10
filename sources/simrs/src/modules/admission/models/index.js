// src/modules/admission/models/index.js
import { defineVisitModel } from './Visit.js';

export const defineAdmissionModels = (sequelize) => {
  const Visit = defineVisitModel(sequelize);
  return { Visit };
};

