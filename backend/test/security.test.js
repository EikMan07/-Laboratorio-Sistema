import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  encryptText,
  decryptText,
  generateSecureToken,
  sha256Hex,
  signHmac,
  verifyHmac,
  maskSensitiveValue,
} from '../src/utils/crypto.js';
import { assertSafeOutboundUrl } from '../src/utils/ssrfGuard.js';
import { AppError, NotFoundError, UnauthorizedError } from '../src/utils/errors.js';
import { userIdParamsSchema, roleSchema } from '../src/schemas/adminSchemas.js';
import { noteIdParamsSchema } from '../src/schemas/noteSchemas.js';

const KEY_V1 = randomBytes(32).toString('base64');
const KEY_V2 = randomBytes(32).toString('base64');
const HMAC_SECRET = randomBytes(32).toString('hex');

test('AES-256-GCM cifra con IV único y descifra correctamente', () => {
  const cfg = { DATA_ENCRYPTION_KEY: KEY_V1, DATA_ENCRYPTION_KEY_VERSION: 'v1' };
  const c1 = encryptText('Nota secreta', cfg);
  const c2 = encryptText('Nota secreta', cfg);

  assert.notEqual(c1, c2, 'El IV debe ser único en cada cifrado');
  assert.ok(c1.startsWith('v1:'), 'Debe incluir versión de llave');
  assert.equal(decryptText(c1, cfg), 'Nota secreta');
});

test('AES-256-GCM detecta manipulación del texto cifrado (integridad)', () => {
  const cfg = { DATA_ENCRYPTION_KEY: KEY_V1, DATA_ENCRYPTION_KEY_VERSION: 'v1' };
  const encrypted = encryptText('Dato crítico', cfg);
  const tampered = encrypted.slice(0, -2) + (encrypted.endsWith('AA') ? 'BB' : 'AA');

  assert.throws(() => decryptText(tampered, cfg));
});

test('Rotación de llaves descifra registros de la llave anterior', () => {
  const oldCfg = { DATA_ENCRYPTION_KEY: KEY_V1, DATA_ENCRYPTION_KEY_VERSION: 'v1' };
  const oldCipher = encryptText('Registro histórico', oldCfg);

  const rotatedCfg = {
    DATA_ENCRYPTION_KEY: KEY_V2,
    DATA_ENCRYPTION_KEY_VERSION: 'v2',
    DATA_ENCRYPTION_KEY_PREV: KEY_V1,
    DATA_ENCRYPTION_KEY_PREV_VERSION: 'v1',
  };

  assert.equal(decryptText(oldCipher, rotatedCfg), 'Registro histórico');
  const newCipher = encryptText('Registro nuevo', rotatedCfg);
  assert.ok(newCipher.startsWith('v2:'));
  assert.equal(decryptText(newCipher, rotatedCfg), 'Registro nuevo');
});

test('Token de recuperación usa alta entropía y hash SHA-256 determinista', () => {
  const token = generateSecureToken(32);
  assert.equal(token.length, 64);
  const h1 = sha256Hex(token);
  const h2 = sha256Hex(token);
  assert.equal(h1.length, 64);
  assert.equal(h1, h2);
  assert.notEqual(h1, token);
});

test('HMAC-SHA256 valida integridad y rechaza alteraciones', () => {
  const sig = signHmac('LOGIN_SUCCESS:user1', HMAC_SECRET);
  assert.equal(verifyHmac('LOGIN_SUCCESS:user1', sig, HMAC_SECRET), true);
  assert.equal(verifyHmac('LOGIN_SUCCESS:admin', sig, HMAC_SECRET), false);
});

test('Enmascarado de dato sensible muestra solo los últimos 4 dígitos', () => {
  assert.equal(maskSensitiveValue('8888-1234'), '***-***-1234');
  assert.equal(maskSensitiveValue(''), '');
});

test('SSRF Guard bloquea direcciones internas y HTTP plano', () => {
  assert.throws(() => assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/'));
  assert.throws(() => assertSafeOutboundUrl('https://localhost:3000/admin'));
  assert.throws(() => assertSafeOutboundUrl('https://evil.example.com/hook'));
  assert.equal(assertSafeOutboundUrl('https://api.github.com/zen'), 'https://api.github.com/zen');
});

test('Jerarquía AppError clasifica códigos y errores operacionales', () => {
  const notFound = new NotFoundError('No existe');
  const unauth = new UnauthorizedError('Expirado', { code: 'TOKEN_EXPIRADO' });
  assert.ok(notFound instanceof AppError);
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.isOperational, true);
  assert.equal(unauth.statusCode, 401);
  assert.equal(unauth.code, 'TOKEN_EXPIRADO');
});

test('Esquemas Zod validan UUIDs de params y roles permitidos', () => {
  assert.equal(userIdParamsSchema.safeParse({ id: 'no-es-uuid' }).success, false);
  assert.equal(
    userIdParamsSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' }).success,
    true
  );
  assert.equal(noteIdParamsSchema.safeParse({ id: '123' }).success, false);
  assert.equal(roleSchema.safeParse({ role: 'superadmin' }).success, false);
  assert.equal(roleSchema.safeParse({ role: 'admin' }).success, true);
});
