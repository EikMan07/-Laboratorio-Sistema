import 'dotenv/config';
import { z } from 'zod';

const rawEnv = {
  ...process.env,
  PORT: process.env.PORT ?? process.env.PUERTO,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL,
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(10, 'DATABASE_URL es obligatoria'),
  DB_SSL_CA: z.string().optional().default(''),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  DATA_ENCRYPTION_KEY: z.string().min(40, 'DATA_ENCRYPTION_KEY debe ser 32 bytes en base64'),
  DATA_ENCRYPTION_KEY_VERSION: z.string().min(1).default('v1'),
  DATA_ENCRYPTION_KEY_PREV: z.string().optional().default(''),
  DATA_ENCRYPTION_KEY_PREV_VERSION: z.string().optional().default('v0'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().min(2).default('25m'),
  HMAC_SECRET: z.string().min(32, 'HMAC_SECRET debe tener al menos 32 caracteres'),
  CSRF_SECRET: z.string().optional().default(''),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('none'),
  COOKIE_SECURE: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  console.error('Error de configuración de entorno:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const keyBuf = Buffer.from(parsed.data.DATA_ENCRYPTION_KEY, 'base64');
if (keyBuf.length !== 32) {
  console.error('DATA_ENCRYPTION_KEY debe decodificar exactamente a 32 bytes (AES-256).');
  process.exit(1);
}

if (parsed.data.CSRF_SECRET && parsed.data.CSRF_SECRET.length < 32) {
  console.error('CSRF_SECRET debe tener al menos 32 caracteres cuando se define explícitamente.');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  // Respaldo seguro en HMAC_SECRET si CSRF_SECRET no fue configurada en despliegues previos
  CSRF_SECRET: parsed.data.CSRF_SECRET || parsed.data.HMAC_SECRET,
};
