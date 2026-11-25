export class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = options.code || null;
    this.details = options.details || null;
    this.isOperational = options.isOperational ?? statusCode < 500;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud inválida.', options = {}) {
    super(message, 400, options);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos de entrada inválidos.', options = {}) {
    super(message, 400, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Autenticación requerida.', options = {}) {
    super(message, 401, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado.', options = {}) {
    super(message, 403, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado.', options = {}) {
    super(message, 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual del recurso.', options = {}) {
    super(message, 409, options);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Demasiadas solicitudes. Intenta nuevamente más tarde.', options = {}) {
    super(message, 429, options);
  }
}
