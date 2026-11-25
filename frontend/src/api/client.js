const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Token anti-CSRF almacenado exclusivamente en memoria (prohibido localStorage/sessionStorage)
let csrfTokenMemory = null;
let sessionExpiredHandler = null;

export function setCsrfToken(token) {
  csrfTokenMemory = token || null;
}

export function clearCsrfToken() {
  csrfTokenMemory = null;
}

export function getCsrfToken() {
  return csrfTokenMemory;
}

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = typeof handler === 'function' ? handler : null;
}

export async function apiRequest(path, options = {}) {
  const { headers = {}, method = 'GET', ...restOptions } = options;
  const upperMethod = String(method).toUpperCase();

  const mergedHeaders = { ...headers };

  // Solo enviar Content-Type JSON cuando hay cuerpo (evita preflight OPTIONS innecesario en GET)
  if (restOptions.body !== undefined && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  if (MUTATING_METHODS.has(upperMethod) && csrfTokenMemory) {
    mergedHeaders['X-CSRF-Token'] = csrfTokenMemory;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    method: upperMethod,
    credentials: 'include',
    headers: mergedHeaders,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (data && typeof data.csrfToken === 'string' && data.csrfToken) {
    csrfTokenMemory = data.csrfToken;
  }

  if (!response.ok) {
    if (response.status === 401 && data.code === 'TOKEN_EXPIRADO') {
      clearCsrfToken();
      if (sessionExpiredHandler) {
        sessionExpiredHandler('Tu sesión expiró por inactividad. Inicia sesión nuevamente.');
      }
    }

    const err = new Error(data.error || 'Error en la solicitud.');
    err.status = response.status;
    err.code = data.code || null;
    err.details = data.details || data.detalles || null;
    throw err;
  }

  return data;
}
