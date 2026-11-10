// src/modules/emr/models/MedicalRecord.js
import { DataTypes } from 'sequelize';

export const defineMedicalRecordModel = (sequelize) => {
  return sequelize.define(
    'MedicalRecord',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      visitId: { type: DataTypes.UUID, allowNull: false },
      patientId: { type: DataTypes.UUID, allowNull: false },
      doctorId: { type: DataTypes.STRING(64), allowNull: false },
      // PostgreSQL: JSONB native, MySQL: JSON
      clinicalNotes: { type: DataTypes.JSON, allowNull: false }, // { subjective, objective, assessment, plan }
      diagnosisCode: { type: DataTypes.STRING(16), allowNull: false },
      signedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: 'emr_medical_records',
      timestamps: true
    }
  );
};

