export function validar({ body, params, query } = {}) {
  return (req, res, next) => {
    const issues = [];

    if (params) {
      const parsedParams = params.safeParse(req.params);
      if (!parsedParams.success) {
        issues.push(...parsedParams.error.issues);
      } else {
        req.params = parsedParams.data;
      }
    }

    if (query) {
      const parsedQuery = query.safeParse(req.query);
      if (!parsedQuery.success) {
        issues.push(...parsedQuery.error.issues);
      } else {
        req.query = parsedQuery.data;
      }
    }

    if (body) {
      const parsedBody = body.safeParse(req.body);
      if (!parsedBody.success) {
        issues.push(...parsedBody.error.issues);
      } else {
        req.body = parsedBody.data;
      }
    }

    if (issues.length > 0) {
      const details = issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      const detalles = issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      }));
      return res.status(400).json({
        error: 'Datos de entrada inválidos.',
        message: 'Los datos enviados no son válidos.',
        details,
        detalles,
      });
    }

    return next();
  };
}

export function validateBody(schema) {
  return validar({ body: schema });
}

export function validateParams(schema) {
  return validar({ params: schema });
}

export function validateQuery(schema) {
  return validar({ query: schema });
}
