// src/modules/master-data/repositories/master-data.repository.js
import { sequelize } from '../../../core/database/index.js';

export const findPolyclinicById = async (id, options = {}) => {
  if (sequelize.models.Polyclinic) {
    return await sequelize.models.Polyclinic.findByPk(id, options);
  }
  return { id, code: 'POLI-INT', name: 'Poliklinik Penyakit Dalam', isActive: true };
};

export const listPolyclinics = async () => {
  if (sequelize.models.Polyclinic) {
    return await sequelize.models.Polyclinic.findAll({ where: { isActive: true } });
  }
  return [
    { id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', code: 'POLI-INT', name: 'Poliklinik Penyakit Dalam' },
    { id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', code: 'POLI-ANA', name: 'Poliklinik Anak' }
  ];
};

