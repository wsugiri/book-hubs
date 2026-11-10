// src/modules/pharmacy/models/Prescription.js
import { DataTypes } from 'sequelize';

export const definePrescriptionModel = (sequelize) => {
  return sequelize.define(
    'Prescription',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      visitId: { type: DataTypes.UUID, allowNull: false },
      patientId: { type: DataTypes.UUID, allowNull: false },
      doctorId: { type: DataTypes.STRING(64), allowNull: false },
      medicines: { type: DataTypes.JSON, allowNull: false }, // array of { medicineId, medicineName, qty, dosage, signa }
      status: {
        type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'DISPENSED', 'CANCELLED'),
        defaultValue: 'SUBMITTED'
      }
    },
    {
      tableName: 'pharmacy_prescriptions',
      timestamps: true
    }
  );
};

