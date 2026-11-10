// src/modules/master-data/models/index.js
import { definePolyclinicModel } from './MasterData.js';

export const defineMasterDataModels = (sequelize) => {
  const Polyclinic = definePolyclinicModel(sequelize);
  return { Polyclinic };
};

