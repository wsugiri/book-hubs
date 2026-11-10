// src/modules/billing/models/Invoice.js
import { DataTypes } from 'sequelize';

export const defineInvoiceModel = (sequelize) => {
  return sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      visitId: { type: DataTypes.UUID, allowNull: false },
      patientId: { type: DataTypes.UUID, allowNull: false },
      totalAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0.00 },
      status: {
        type: DataTypes.ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID'),
        defaultValue: 'UNPAID'
      },
      paymentType: {
        type: DataTypes.STRING(32),
        allowNull: false
      }
    },
    {
      tableName: 'billing_invoices',
      timestamps: true
    }
  );
};

