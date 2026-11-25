'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const createdAt = 'created_at';
    const updatedAt = 'updated_at';
    const deletedAt = 'deleted_at';

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      name_enc: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      phone_enc: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      password_hash: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'user',
      },
      failed_login_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      [createdAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      [updatedAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.sequelize.query(
      "ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('user', 'admin'));"
    );

    await queryInterface.createTable('notes', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      title_enc: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      content_enc: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      [createdAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      [updatedAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      [deletedAt]: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('notes', ['owner_id'], {
      name: 'idx_notes_owner_id',
    });

    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      token_hash: {
        type: Sequelize.CHAR(64),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      [createdAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      [updatedAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      [deletedAt]: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('password_reset_tokens', ['user_id'], {
      name: 'idx_password_reset_tokens_user_id',
    });
    await queryInterface.addIndex('password_reset_tokens', ['expires_at'], {
      name: 'idx_password_reset_tokens_expires_at',
    });

    await queryInterface.createTable('revoked_tokens', {
      jti: {
        type: Sequelize.STRING(64),
        allowNull: false,
        primaryKey: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('revoked_tokens', ['expires_at'], {
      name: 'idx_revoked_tokens_expires_at',
    });

    await queryInterface.createTable('security_events', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      event_type: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::jsonb"),
      },
      hmac_sig: {
        type: Sequelize.CHAR(64),
        allowNull: false,
      },
      [createdAt]: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('security_events', ['user_id'], {
      name: 'idx_security_events_user_id',
    });
    await queryInterface.addIndex('security_events', ['created_at'], {
      name: 'idx_security_events_created_at',
    });
    await queryInterface.addIndex('security_events', ['event_type', 'ip_address', 'created_at'], {
      name: 'idx_security_events_type_ip_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('security_events');
    await queryInterface.dropTable('revoked_tokens');
    await queryInterface.dropTable('password_reset_tokens');
    await queryInterface.dropTable('notes');
    await queryInterface.dropTable('users');
  },
};
