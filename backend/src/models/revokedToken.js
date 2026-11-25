import { DataTypes } from 'sequelize';

export function initRevokedTokenModel(sequelize) {
  return sequelize.define(
    'RevokedToken',
    {
      jti: {
        type: DataTypes.STRING(64),
        primaryKey: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'revoked_tokens',
      underscored: true,
      timestamps: false,
    }
  );
}
