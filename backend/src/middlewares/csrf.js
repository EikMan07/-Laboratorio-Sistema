import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getAllowedOrigins() {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, ''))
    .filter(Boolean);
}

function extractRequestOrigin(req) {
  const originHeader = req.get('origin');
  if (originHeader) {
    return originHeader.trim().replace(/\/$/, '');
  }
  const refererHeader = req.get('referer');
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin.replace(/\/$/, '');
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Capa 2 Anti-CSRF: valida estrictamente Origin/Referer contra CORS_ORIGIN
 * en todos los métodos mutables (incluidos login, register y recuperación).
 */
export function verifyOrigin(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = extractRequestOrigin(req);

  if (!requestOrigin) {
    if (env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Origen de solicitud no permitido.',
        code: 'ORIGEN_NO_PERMITIDO',
      });
    }
    return next();
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    return res.status(403).json({
      error: 'Origen de solicitud no permitido.',
      code: 'ORIGEN_NO_PERMITIDO',
    });
  }

  return next();
}

/**
 * Capa 3 Anti-CSRF: genera token criptográfico HMAC-SHA256 ligado al JTI de la sesión.
 */
export function generateCsrfToken(sessionJti) {
  if (!sessionJti) {
    throw new Error('Se requiere un identificador de sesión para generar el token CSRF.');
  }
  return createHmac('sha256', env.CSRF_SECRET)
    .update(`csrf:${String(sessionJti)}`, 'utf8')
    .digest('hex');
}

export function isValidCsrfToken(sessionJti, candidateToken) {
  if (!sessionJti || !candidateToken || typeof candidateToken !== 'string') {
    return false;
  }
  const expected = generateCsrfToken(sessionJti);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(candidateToken.trim(), 'hex');
  if (a.length === 0 || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Middleware de Capa 3 Anti-CSRF para endpoints autenticados mutables.
 * Requiere haberse ejecutado después de `authMiddleware` (req.user.jti presente).
 */
export function verifyCsrfToken(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  if (!req.user?.jti || !isValidCsrfToken(req.user.jti, headerToken)) {
    return res.status(403).json({
      error: 'Token CSRF inválido o ausente.',
      code: 'CSRF_INVALIDO',
    });
  }

  return next();
}
