// src/modules/master-data/models/MasterData.js
import { DataTypes } from 'sequelize';

export const definePolyclinicModel = (sequelize) => {
  return sequelize.define(
    'Polyclinic',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
      tableName: 'master_polyclinics',
      timestamps: true
    }
  );
};

