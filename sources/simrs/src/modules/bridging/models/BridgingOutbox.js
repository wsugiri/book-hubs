// src/modules/bridging/models/BridgingOutbox.js
import { DataTypes } from 'sequelize';

export const defineBridgingOutboxModel = (sequelize) => {
  return sequelize.define(
    'BridgingOutbox',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      destination: {
        type: DataTypes.ENUM('BPJS_VCLAIM', 'BPJS_ANTROL', 'SATUSEHAT_FHIR'),
        allowNull: false
      },
      eventType: { type: DataTypes.STRING(64), allowNull: false },
      idempotencyKey: { type: DataTypes.STRING(128), allowNull: false, unique: true },
      payload: { type: DataTypes.JSON, allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED'),
        defaultValue: 'PENDING'
      },
      retryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      maxRetries: { type: DataTypes.INTEGER, defaultValue: 5 },
      lastError: { type: DataTypes.TEXT, allowNull: true },
      nextAttemptAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
      tableName: 'bridging_outbox',
      timestamps: true
    }
  );
};

