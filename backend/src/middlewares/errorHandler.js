import { logger } from '../utils/logger.js';
import { AppError, NotFoundError } from '../utils/errors.js';

export function notFoundHandler(_req, _res, next) {
  return next(new NotFoundError('Recurso no encontrado.'));
}

// A10: Fail closed — firma cuádruple obligatoria en Express, nunca exponer err.stack al cliente
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Error interno del servidor.';
  let code = null;
  let details = null;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    status = 400;
    message = 'JSON inválido en el cuerpo de la solicitud.';
  } else if (err?.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    message = 'Conflicto: el recurso ya existe.';
  } else if (err?.name === 'SequelizeValidationError') {
    status = 400;
    message = 'Datos de entrada inválidos.';
  } else if (err?.status && err.status >= 400 && err.status < 500) {
    status = err.status;
    message = err.message;
  }

  logger.error(
    {
      errMessage: err?.message,
      errStack: err?.stack,
      statusCode: status,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    status >= 500 ? 'Error no controlado en solicitud' : 'Error operacional en solicitud'
  );

  const payload = { error: message };
  if (code) payload.code = code;
  if (details) payload.details = details;

  return res.status(status).json(payload);
}
