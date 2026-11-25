# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added

### Fixed
- **cors:** corrige preflight y corp cross-origin
  - Configura `crossOriginResourcePolicy: { policy: 'cross-origin' }` en Helmet (`backend/src/app.js`) para habilitar respuestas de la API hacia el dominio del frontend.
  - Declara `corsOptions` explícito con `methods`, `allowedHeaders` (`Content-Type`, `X-CSRF-Token`), `optionsSuccessStatus: 204` y registra `app.options('*', cors(corsOptions))` antes de rate limiting y rutas.
  - Normaliza `CORS_ORIGIN` eliminando espacios, comillas y barras finales en `backend/src/app.js` y `backend/src/middlewares/csrf.js`.
  - Ajusta `frontend/src/api/client.js` para enviar `Content-Type: application/json` solo cuando existe `body`, evitando preflights `OPTIONS` innecesarios en peticiones `GET`.

### Changed

### Security

### Maintenance
