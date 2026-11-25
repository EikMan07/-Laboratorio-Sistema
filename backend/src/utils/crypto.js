import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Construye el anillo de llaves para soportar rotación sin pérdida de datos.
 * Formato almacenado en BD: "<version>:<iv_b64>.<tag_b64>.<cipher_b64>"
 */
export function buildKeyRing(config = process.env) {
  const activeVersion = config.DATA_ENCRYPTION_KEY_VERSION || 'v1';
  const activeKey = Buffer.from(config.DATA_ENCRYPTION_KEY || '', 'base64');
  if (activeKey.length !== 32) {
    throw new Error('La llave activa AES-256 debe tener exactamente 32 bytes.');
  }
  const keys = new Map([[activeVersion, activeKey]]);

  if (config.DATA_ENCRYPTION_KEY_PREV) {
    const prevVersion = config.DATA_ENCRYPTION_KEY_PREV_VERSION || 'v0';
    const prevKey = Buffer.from(config.DATA_ENCRYPTION_KEY_PREV, 'base64');
    if (prevKey.length === 32) {
      keys.set(prevVersion, prevKey);
    }
  }
  return { activeVersion, keys };
}

export function encryptText(plaintext, config = process.env) {
  if (plaintext === null || plaintext === undefined) return null;
  const { activeVersion, keys } = buildKeyRing(config);
  const key = keys.get(activeVersion);
  const iv = randomBytes(12); // IV único de 12 bytes por cifrado
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // Tag de autenticación de 16 bytes
  const body = [iv, tag, encrypted].map((b) => b.toString('base64')).join('.');
  return `${activeVersion}:${body}`;
}

export function decryptText(payload, config = process.env) {
  if (!payload) return '';
  const { activeVersion, keys } = buildKeyRing(config);

  let version = activeVersion;
  let body = payload;
  if (payload.includes(':')) {
    const idx = payload.indexOf(':');
    version = payload.slice(0, idx);
    body = payload.slice(idx + 1);
  }

  const key = keys.get(version);
  if (!key) {
    throw new Error(`Versión de llave no disponible: ${version}`);
  }

  const parts = body.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de dato cifrado inválido.');
  }
  const [iv, tag, data] = parts.map((s) => Buffer.from(s, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag); // Falla automáticamente si el dato fue alterado
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

export function signHmac(data, secret = process.env.HMAC_SECRET) {
  if (!secret || secret.length < 32) {
    throw new Error('HMAC_SECRET inválida.');
  }
  return createHmac('sha256', secret).update(String(data), 'utf8').digest('hex');
}

export function verifyHmac(data, signatureHex, secret = process.env.HMAC_SECRET) {
  const expected = signHmac(data, secret);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(String(signatureHex || ''), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Enmascara un teléfono o documento dejando visibles solo los últimos 4 caracteres.
 * Ejemplo: "8888-1234" -> "***-***-1234"
 */
export function maskSensitiveValue(value) {
  if (!value) return '';
  const clean = String(value).trim();
  if (clean.length <= 4) return '****';
  return `***-***-${clean.slice(-4)}`;
}
