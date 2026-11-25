import { DataTypes } from 'sequelize';

export function initSecurityEventModel(sequelize) {
  return sequelize.define(
    'SecurityEvent',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      event_type: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      hmac_sig: {
        type: DataTypes.CHAR(64),
        allowNull: false,
      },
    },
    {
      tableName: 'security_events',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );
}
