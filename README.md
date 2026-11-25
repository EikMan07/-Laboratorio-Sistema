# SecureVault — Sistema Seguro en Node.js (OWASP Top 10:2025)

Aplicación web para resguardar notas privadas y datos personales sensibles aplicando las 10 categorías del OWASP Top 10:2025, hashing con Argon2id, cifrado autenticado AES-256-GCM con soporte de rotación de llaves y despliegue en producción con HTTPS.

## 1. Instalación local

```bash
# 1. Crear tablas en PostgreSQL / Supabase ejecutando backend/sql/schema.sql

# 2. Backend
cd backend
cp .env.example .env
# Completar las variables en .env (ver sección 2)
npm install
npm test
npm run dev

# 3. Frontend (en otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 2. Variables de entorno requeridas (solo nombres)

### Backend (`backend/.env` o panel de Render)
- `NODE_ENV` (`production` en Render)
- `PORT` (`3000` o el puerto asignado por Render)
- `DATABASE_URL`
- `DB_SSL_CA` (opcional, certificado CA de Supabase en PEM o base64)
- `CORS_ORIGIN` (URL de Vercel sin barra final, ej. `https://laboratorio-sistema.vercel.app`)
- `DATA_ENCRYPTION_KEY` (32 bytes en base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `DATA_ENCRYPTION_KEY_VERSION` (`v1`)
- `DATA_ENCRYPTION_KEY_PREV` (opcional, para rotación sin pérdida de datos)
- `DATA_ENCRYPTION_KEY_PREV_VERSION` (opcional, `v0`)
- `JWT_SECRET` (mínimo 32 caracteres aleatorios)
- `JWT_EXPIRES_IN` (`25m`, expiración deslizante por inactividad)
- `HMAC_SECRET` (mínimo 32 caracteres aleatorios)
- `CSRF_SECRET` (opcional, mínimo 32 caracteres; si se omite respalda con `HMAC_SECRET`)
- `COOKIE_SAME_SITE` (`none` en producción cross-site entre Vercel y Render)
- `COOKIE_SECURE` (`true` en producción)

### Frontend (`frontend/.env` o panel de Vercel)
- `VITE_API_URL` (URL pública del backend en Render, sin barra final)

> **Importante:** Nunca subas archivos `.env` al repositorio ni incluyas credenciales de prueba en este README.

## 3. Pasos de despliegue (Supabase → Render → Vercel)

1. **Supabase (Base de datos):**
   - Crea un proyecto en Supabase y abre **SQL Editor**.
   - Pega y ejecuta `backend/sql/schema.sql`.
   - En **Settings → Database**, copia la cadena de conexión del **Transaction/Session Pooler** (PostgreSQL con SSL) y activa **SSL Enforcement**.
2. **GitHub:**
   - Inicializa el repositorio y sube el proyecto a la rama `main` verificando que `.env` no aparezca en `git status`.
3. **Render (Backend):**
   - Crea un **Web Service** apuntando al repositorio, con **Root Directory:** `backend`, **Build Command:** `npm ci`, **Start Command:** `npm start` (o despliega con `backend/Dockerfile`).
   - Carga las variables de entorno en **Environment** y verifica `GET https://<tu-backend>.onrender.com/health` (`{"status":"ok"}`).
4. **Vercel (Frontend):**
   - Importa el repositorio con **Root Directory:** `frontend`, framework **Vite**.
   - Define `VITE_API_URL=https://<tu-backend>.onrender.com` y despliega.
   - Copia la URL de Vercel y actualiza `CORS_ORIGIN` en Render (y en `frontend/vercel.json` si usas dominio propio).
5. **Promover usuario administrador (en Supabase SQL Editor):**
   - Registra dos cuentas desde la app (usuario y admin) y promueve el admin con:
     `UPDATE users SET role = 'admin' WHERE email = 'tu-admin@correo.com';`
   - Entrega ambas credenciales de prueba al docente únicamente por canal privado.

## 4. Modelo de amenazas breve (STRIDE — A06)

| Amenaza | Escenario en SecureVault | Mitigación implementada |
| :--- | :--- | :--- |
| **Spoofing** | Fuerza bruta o robo de sesión | Argon2id, `express-rate-limit` (HTTP 429), bloqueo progresivo, cookies `HttpOnly/Secure/SameSite`, JWT `HS256` fijo y revocación en logout. |
| **Tampering** | Alterar notas en BD o registros de bitácora | AES-256-GCM con tag de 16 bytes + firma `HMAC-SHA256` en `security_events`. |
| **Repudiation** | Cambios de rol o accesos sin rastro | Bitácora persistente en `security_events` + logs JSON estructurados con Pino. |
| **Information Disclosure** | Fuga de BD, stack traces o IDOR | Cifrado AES-256-GCM en notas/nombre/teléfono, máscara `***-***-1234`, `WHERE owner_id = $userId`, `NODE_ENV=production` sin stack traces. |
| **Denial of Service** | Abuso de endpoints o notas gigantes | Rate limit global y en login, límite de 32 KB por JSON, máx. 50 notas/usuario y 4,000 caracteres/nota, timeouts en PostgreSQL. |
| **Elevation of Privilege** | Usuario común accediendo a `/api/admin` | Middleware `requireRole('admin')` validando el rol directamente contra PostgreSQL en cada petición. |

## 5. Pruebas de verificación post-despliegue (solo contra tu propia app)

- **Cabeceras:** Analizar la URL de Vercel y Render en `securityheaders.com` (meta: A/A+).
- **TLS:** Analizar el dominio en `ssllabs.com/ssltest`.
- **Dependencias:** Ejecutar `npm audit` en `backend/` y `frontend/`.
- **OWASP ZAP:** `docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://<tu-app>.vercel.app`.
- **Pruebas manuales:**
  1. **IDOR (A01):** Con sesión del usuario A, solicitar `GET /api/notes/<id-de-nota-de-B>` → debe responder `404`.
  2. **Inyección / XSS (A05):** Enviar `' OR 1=1 --` en login y `<script>alert(1)</script>` en una nota → rechazado/neutralizado sin ejecución.
  3. **Fuerza bruta (A07):** Realizar 6 intentos fallidos de login → debe responder `429 Too Many Requests`.

## 6. Historial de cambios y política de seguridad
- Consulta [CHANGELOG.md](./CHANGELOG.md) para el historial detallado de versiones y correcciones.
- Consulta [SECURITY.md](./SECURITY.md) para la política de seguridad y reporte responsable de vulnerabilidades.

