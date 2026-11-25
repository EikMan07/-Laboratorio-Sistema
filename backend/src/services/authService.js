import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { Usuario, PasswordResetToken, RevokedToken } from '../models/index.js';
import { env } from '../config/env.js';
import {
  encryptText,
  decryptText,
  generateSecureToken,
  sha256Hex,
  maskSensitiveValue,
} from '../utils/crypto.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signSessionToken } from '../utils/cookies.js';
import { generateCsrfToken } from '../middlewares/csrf.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../utils/errors.js';
import {
  recordSecurityEvent,
  checkConsecutiveLoginFailures,
} from './auditService.js';

function createSessionArtifacts(user) {
  // A07: Regenerar identificador de sesión (nuevo JTI) exclusivamente en login/register
  const jti = randomUUID();
  const sessionToken = signSessionToken({
    userId: user.id,
    role: user.role,
    jti,
  });
  const csrfToken = generateCsrfToken(jti);
  return { sessionToken, csrfToken, jti };
}

export async function registerUser({ email, name, phone, password, ipAddress }) {
  const existing = await Usuario.findOne({ where: { email }, attributes: ['id'] });
  if (existing) {
    throw new ConflictError('No fue posible completar el registro.');
  }

  const passwordHash = await hashPassword(password);
  const nameEnc = encryptText(name);
  const phoneEnc = phone ? encryptText(phone) : null;

  const user = await Usuario.create({
    email,
    name_enc: nameEnc,
    phone_enc: phoneEnc,
    password_hash: passwordHash,
    role: 'user',
  });

  await recordSecurityEvent({
    eventType: 'USER_REGISTERED',
    userId: user.id,
    ipAddress,
    details: { role: user.role },
  });

  const { sessionToken, csrfToken } = createSessionArtifacts(user);

  return {
    sessionToken,
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      name,
      role: user.role,
      phoneMasked: phone ? maskSensitiveValue(phone) : '',
    },
  };
}

export async function loginUser({ email, password, ipAddress }) {
  const user = await Usuario.scope('conPassword').findOne({ where: { email } });

  if (!user) {
    await recordSecurityEvent({
      eventType: 'LOGIN_FAILED',
      ipAddress,
      details: { reason: 'invalid_credentials' },
    });
    await checkConsecutiveLoginFailures(ipAddress);
    throw new UnauthorizedError('Credenciales inválidas.');
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await recordSecurityEvent({
      eventType: 'LOGIN_BLOCKED',
      userId: user.id,
      ipAddress,
      details: { reason: 'account_locked' },
    });
    throw new TooManyRequestsError(
      'Cuenta bloqueada temporalmente por múltiples intentos fallidos.'
    );
  }

  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const lockMinutes = attempts >= 5 ? Math.min(30, attempts * 3) : 0;
    const lockedUntil = lockMinutes > 0 ? new Date(Date.now() + lockMinutes * 60 * 1000) : null;

    await user.update({
      failed_login_attempts: attempts,
      locked_until: lockedUntil,
    });

    await recordSecurityEvent({
      eventType: 'LOGIN_FAILED',
      userId: user.id,
      ipAddress,
      details: { attempts },
    });
    await checkConsecutiveLoginFailures(ipAddress);
    throw new UnauthorizedError('Credenciales inválidas.');
  }

  await user.update({
    failed_login_attempts: 0,
    locked_until: null,
  });

  const { sessionToken, csrfToken } = createSessionArtifacts(user);

  await recordSecurityEvent({
    eventType: 'LOGIN_SUCCESS',
    userId: user.id,
    ipAddress,
    details: { role: user.role },
  });

  const phonePlain = user.phone_enc ? decryptText(user.phone_enc) : '';

  return {
    sessionToken,
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      name: decryptText(user.name_enc),
      role: user.role,
      phoneMasked: maskSensitiveValue(phonePlain),
    },
  };
}

export async function logoutUser({ userId, jti, exp, ipAddress }) {
  await RevokedToken.findOrCreate({
    where: { jti },
    defaults: {
      jti,
      expires_at: new Date((exp || Math.floor(Date.now() / 1000) + 1500) * 1000),
    },
  });

  await recordSecurityEvent({
    eventType: 'LOGOUT',
    userId,
    ipAddress,
  });
}

export async function getCurrentUser({ userId, jti }) {
  const user = await Usuario.findByPk(userId, {
    attributes: ['id', 'email', 'name_enc', 'phone_enc', 'role'],
  });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado.');
  }

  const phonePlain = user.phone_enc ? decryptText(user.phone_enc) : '';
  const csrfToken = generateCsrfToken(jti);

  return {
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      name: decryptText(user.name_enc),
      role: user.role,
      phoneMasked: maskSensitiveValue(phonePlain),
    },
  };
}

export async function changePassword({ userId, currentPassword, newPassword, ipAddress }) {
  const user = await Usuario.scope('conPassword').findByPk(userId, {
    attributes: ['id', 'password_hash'],
  });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado.');
  }

  const valid = await verifyPassword(user.password_hash, currentPassword);
  if (!valid) {
    throw new UnauthorizedError('La contraseña actual es incorrecta.');
  }

  const newHash = await hashPassword(newPassword);
  await user.update({ password_hash: newHash });

  await recordSecurityEvent({
    eventType: 'PASSWORD_CHANGED',
    userId: user.id,
    ipAddress,
  });
}

export async function requestPasswordReset({ email, ipAddress }) {
  const user = await Usuario.findOne({ where: { email }, attributes: ['id'] });

  let devResetToken = null;
  if (user) {
    const rawToken = generateSecureToken(32); // 64 hex chars
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    await recordSecurityEvent({
      eventType: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      ipAddress,
    });

    // En entorno sin SMTP configurado, solo se devuelve en modo desarrollo
    if (env.NODE_ENV !== 'production') {
      devResetToken = rawToken;
    }
  }

  return {
    message:
      'Si el correo está registrado, se generó un token de recuperación válido por 15 minutos.',
    ...(devResetToken ? { devResetToken } : {}),
  };
}

export async function resetPassword({ token, newPassword, ipAddress }) {
  const tokenHash = sha256Hex(token);
  const resetRecord = await PasswordResetToken.findOne({
    where: {
      token_hash: tokenHash,
      used_at: null,
      expires_at: { [Op.gt]: new Date() },
    },
  });

  if (!resetRecord) {
    throw new BadRequestError('Token inválido o expirado.');
  }

  const user = await Usuario.findByPk(resetRecord.user_id, { attributes: ['id'] });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado.');
  }

  const newHash = await hashPassword(newPassword);
  await user.update({ password_hash: newHash });
  await resetRecord.update({ used_at: new Date() });

  await recordSecurityEvent({
    eventType: 'PASSWORD_RESET_COMPLETED',
    userId: user.id,
    ipAddress,
  });
}
