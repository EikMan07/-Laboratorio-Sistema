# Política de Seguridad

## Versiones Compatibles

| Versión | Soportada |
| :--- | :--- |
| 1.0.x | :white_check_mark: |

## Reporte de Vulnerabilidades

Si identificas una vulnerabilidad de seguridad en este repositorio, repórtala de manera responsable contactando al equipo propietario antes de abrir una incidencia pública.

## Directrices y Controles de Seguridad Implementados

- **Secretos y variables de entorno:** Cero credenciales, llaves o tokens en Git (`.env` excluido en `.gitignore`, escaneo automático con Gitleaks en CI).
- **Contraseñas y criptografía:** Hashing con `Argon2id`, cifrado autenticado `AES-256-GCM` con soporte de rotación de llaves y firmas `HMAC-SHA256` en la bitácora de auditoría.
- **Sesiones y cookies reforzadas:** JWT `HS256` almacenado exclusivamente en cookie `HttpOnly` (`__Host-sid` en producción, `Secure`, host-only, expiración deslizante de 25 minutos, revocación por `jti` en cierre de sesión y limpieza sin `maxAge`).
- **Defensa Anti-CSRF en 3 capas:** Atributo `SameSite`, validación estricta de `Origin`/`Referer` normalizado contra `CORS_ORIGIN` en métodos mutables, y token HMAC en `X-CSRF-Token` verificado en tiempo constante (`timingSafeEqual`).
- **CORS y encabezados HTTP:** Helmet con CSP estricta, HSTS y `Cross-Origin-Resource-Policy: cross-origin` para consumo seguro Vercel → Render; CORS restringido al origen explícito con `credentials: true`, `allowedHeaders: ['Content-Type', 'X-CSRF-Token']` y manejo explícito de preflight `OPTIONS`.
- **Auditoría continua:** Pruebas unitarias de seguridad, `npm audit` en CI y Dependabot activo.
