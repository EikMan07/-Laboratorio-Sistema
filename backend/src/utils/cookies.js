import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const SESSION_TTL_MS = 25 * 60 * 1000; // 25 minutos (expiración deslizante)

export function getCookieName() {
  return env.NODE_ENV === 'production' ? '__Host-sid' : 'sid';
}

export function buildClearCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  const sameSite = isProd ? env.COOKIE_SAME_SITE : 'lax';
  const secure = isProd || sameSite === 'none' || env.COOKIE_SECURE === 'true';

  // Sin `domain` (host-only, requerido por prefijo __Host-) y sin `maxAge` (requerido por clearCookie)
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

export function buildCookieOptions() {
  return {
    ...buildClearCookieOptions(),
    maxAge: SESSION_TTL_MS,
  };
}

export function signSessionToken({ userId, role, jti }) {
  return jwt.sign(
    { sub: userId, role, jti },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function setSessionCookie(res, token) {
  const opts = buildCookieOptions();
  res.cookie(getCookieName(), token, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(getCookieName(), buildClearCookieOptions());
}
