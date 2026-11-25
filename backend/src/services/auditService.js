import { Op } from 'sequelize';
import { SecurityEvent } from '../models/index.js';
import { signHmac } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const CONSECUTIVE_FAIL_ALERT_THRESHOLD = 5;

export async function recordSecurityEvent({
  eventType,
  userId = null,
  ipAddress = null,
  details = {},
}) {
  const payloadStr = JSON.stringify({ eventType, userId, ipAddress, details });
  const hmacSig = signHmac(payloadStr);

  logger.info({ eventType, userId, ipAddress, details }, 'Evento de seguridad');

  try {
    await SecurityEvent.create({
      event_type: eventType,
      user_id: userId,
      ip_address: ipAddress,
      details,
      hmac_sig: hmacSig,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'No se pudo persistir evento en bitácora');
  }
}

export async function checkConsecutiveLoginFailures(ipAddress) {
  try {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const total = await SecurityEvent.count({
      where: {
        event_type: 'LOGIN_FAILED',
        ip_address: ipAddress,
        created_at: { [Op.gt]: windowStart },
      },
    });

    if (total >= CONSECUTIVE_FAIL_ALERT_THRESHOLD) {
      logger.warn(
        { alert: 'BRUTE_FORCE_DETECTED', ipAddress, failedAttempts15m: total },
        'ALERTA DE SEGURIDAD: múltiples fallos consecutivos de inicio de sesión'
      );
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error al evaluar alertas de fallos consecutivos');
  }
}
