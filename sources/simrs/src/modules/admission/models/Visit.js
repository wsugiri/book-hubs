// src/modules/admission/models/Visit.js
import { DataTypes } from 'sequelize';

export const defineVisitModel = (sequelize) => {
  return sequelize.define(
    'Visit',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      patientId: { type: DataTypes.UUID, allowNull: false },
      polyclinicId: { type: DataTypes.UUID, allowNull: false },
      doctorScheduleId: { type: DataTypes.UUID, allowNull: false },
      paymentType: {
        type: DataTypes.ENUM('BPJS', 'PRIBADI', 'ASURANSI_SWASTA'),
        allowNull: false
      },
      bpjsCardNumber: { type: DataTypes.STRING(32), allowNull: true },
      status: {
        type: DataTypes.ENUM('WAITING_FOR_TRIAGE', 'IN_CONSULTATION', 'WAITING_FOR_MEDICINE', 'COMPLETED', 'DISCHARGED'),
        defaultValue: 'WAITING_FOR_TRIAGE'
      },
      registeredBy: { type: DataTypes.STRING(64), allowNull: false },
      registeredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
      tableName: 'admission_visits',
      timestamps: true
    }
  );
};

