import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Usuario, RevokedToken } from '../models/index.js';
import {
  getCookieName,
  signSessionToken,
  setSessionCookie,
} from '../utils/cookies.js';
import { recordSecurityEvent } from '../services/auditService.js';

function extractSessionToken(req) {
  const cookieToken = req.cookies?.[getCookieName()];
  if (cookieToken) {
    return cookieToken;
  }
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export async function authMiddleware(req, res, next) {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autenticación requerida.' });
  }

  let payload;
  try {
    // A08: Fijar algoritmo explícito HS256 para evitar ataques alg=none / confusión de algoritmo
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sesión expirada.',
        code: 'TOKEN_EXPIRADO',
      });
    }
    return res.status(401).json({ error: 'Sesión expirada o inválida.' });
  }

  try {
    if (!payload?.sub || !payload?.jti) {
      return res.status(401).json({ error: 'Sesión inválida.' });
    }

    const revoked = await RevokedToken.findByPk(payload.jti, { attributes: ['jti'] });
    if (revoked) {
      return res.status(401).json({ error: 'Sesión inválida o cerrada.' });
    }

    // RF-03: Verificar rol actualizado directamente en servidor
    const user = await Usuario.findByPk(payload.sub, {
      attributes: ['id', 'email', 'role'],
    });
    if (!user) {
      return res.status(401).json({ error: 'Sesión inválida.' });
    }

    // Expiración deslizante de 25m conservando el mismo JTI para que el logout revoque la sesión completa
    const refreshedToken = signSessionToken({
      userId: user.id,
      role: user.role,
      jti: payload.jti,
    });
    setSessionCookie(res, refreshedToken);
    const refreshedPayload = jwt.decode(refreshedToken);

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      jti: payload.jti,
      exp: refreshedPayload?.exp || payload.exp,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(allowedRole) {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== allowedRole) {
        await recordSecurityEvent({
          eventType: 'ACCESS_DENIED',
          userId: req.user?.id || null,
          ipAddress: req.ip,
          details: { path: req.originalUrl, requiredRole: allowedRole },
        });
        return res.status(403).json({ error: 'Acceso denegado.' });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
