import { DataTypes } from 'sequelize';

export function initNotaModel(sequelize) {
  return sequelize.define(
    'Nota',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title_enc: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      content_enc: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: 'notes',
      underscored: true,
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );
}
