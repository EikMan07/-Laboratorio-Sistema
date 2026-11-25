import { Sequelize } from 'sequelize';
import { sequelize } from '../config/db.js';
import { initUsuarioModel } from './usuario.js';
import { initNotaModel } from './nota.js';
import { initPasswordResetTokenModel } from './passwordResetToken.js';
import { initRevokedTokenModel } from './revokedToken.js';
import { initSecurityEventModel } from './securityEvent.js';

export const Usuario = initUsuarioModel(sequelize);
export const Nota = initNotaModel(sequelize);
export const PasswordResetToken = initPasswordResetTokenModel(sequelize);
export const RevokedToken = initRevokedTokenModel(sequelize);
export const SecurityEvent = initSecurityEventModel(sequelize);

Usuario.hasMany(Nota, {
  foreignKey: 'owner_id',
  as: 'notas',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
Nota.belongsTo(Usuario, {
  foreignKey: 'owner_id',
  as: 'owner',
});

Usuario.hasMany(PasswordResetToken, {
  foreignKey: 'user_id',
  as: 'resetTokens',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
PasswordResetToken.belongsTo(Usuario, {
  foreignKey: 'user_id',
  as: 'usuario',
});

Usuario.hasMany(SecurityEvent, {
  foreignKey: 'user_id',
  as: 'securityEvents',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
SecurityEvent.belongsTo(Usuario, {
  foreignKey: 'user_id',
  as: 'usuario',
});

export { sequelize, Sequelize };
