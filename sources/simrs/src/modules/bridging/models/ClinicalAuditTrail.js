// src/modules/bridging/models/ClinicalAuditTrail.js
import { DataTypes } from 'sequelize';

export const defineClinicalAuditTrailModel = (sequelize) => {
  return sequelize.define(
    'ClinicalAuditTrail',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tableName: { type: DataTypes.STRING(64), allowNull: false },
      recordId: { type: DataTypes.STRING(64), allowNull: false },
      action: {
        type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE'),
        allowNull: false
      },
      actorId: { type: DataTypes.STRING(64), allowNull: false },
      actorRole: { type: DataTypes.STRING(32), allowNull: false },
      requestId: { type: DataTypes.STRING(64), allowNull: false },
      clientIp: { type: DataTypes.STRING(45), allowNull: false },
      oldValues: { type: DataTypes.JSON, allowNull: true },
      newValues: { type: DataTypes.JSON, allowNull: false }
    },
    {
      tableName: 'clinical_audit_trails',
      timestamps: true,
      updatedAt: false // Append-only audit trail
    }
  );
};

