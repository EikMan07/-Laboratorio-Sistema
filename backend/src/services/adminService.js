import { Usuario, SecurityEvent } from '../models/index.js';
import { decryptText } from '../utils/crypto.js';
import { NotFoundError } from '../utils/errors.js';
import { recordSecurityEvent } from './auditService.js';

export async function listUsers() {
  const rows = await Usuario.findAll({
    attributes: ['id', 'email', 'name_enc', 'role', 'failed_login_attempts', 'created_at'],
    order: [['created_at', 'DESC']],
  });

  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: decryptText(u.name_enc),
    role: u.role,
    failedLoginAttempts: u.failed_login_attempts,
    createdAt: u.created_at,
  }));
}

export async function updateUserRole({ targetUserId, role, actorUserId, ipAddress }) {
  const targetUser = await Usuario.findByPk(targetUserId, {
    attributes: ['id', 'email', 'role'],
  });
  if (!targetUser) {
    throw new NotFoundError('Usuario no encontrado.');
  }

  await targetUser.update({ role });

  await recordSecurityEvent({
    eventType: 'ROLE_CHANGED',
    userId: actorUserId,
    ipAddress,
    details: { targetUserId, newRole: role },
  });

  return {
    id: targetUser.id,
    email: targetUser.email,
    role: targetUser.role,
  };
}

export async function listAuditLogs() {
  const rows = await SecurityEvent.findAll({
    attributes: ['id', 'event_type', 'user_id', 'ip_address', 'details', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 100,
  });

  // Conserva los nombres de clave snake_case consumidos por App.jsx
  return rows.map((ev) => ({
    id: ev.id,
    event_type: ev.event_type,
    user_id: ev.user_id,
    ip_address: ev.ip_address,
    details: ev.details,
    created_at: ev.created_at,
  }));
}
