import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  apiRequest,
  clearCsrfToken,
  getCsrfToken,
  setCsrfToken,
  setSessionExpiredHandler,
} from '../api/client.js';

const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const inactivityTimerRef = useRef(null);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const handleSessionExpired = useCallback(
    (message = 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.') => {
      clearInactivityTimer();
      clearCsrfToken();
      setUser(null);
      setSessionMessage(message);
    },
    [clearInactivityTimer]
  );

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => setSessionExpiredHandler(null);
  }, [handleSessionExpired]);

  const loadSession = useCallback(async () => {
    try {
      const data = await apiRequest('/api/auth/me');
      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      } else if (!getCsrfToken()) {
        const csrfData = await apiRequest('/api/auth/csrf-token');
        if (csrfData?.csrfToken) {
          setCsrfToken(csrfData.csrfToken);
        }
      }
    } catch {
      clearCsrfToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return undefined;
    }

    const resetTimer = () => {
      clearInactivityTimer();
      inactivityTimerRef.current = setTimeout(() => {
        handleSessionExpired('Tu sesión expiró por inactividad. Inicia sesión nuevamente.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }

    return () => {
      clearInactivityTimer();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetTimer);
      }
    };
  }, [user, clearInactivityTimer, handleSessionExpired]);

  const login = useCallback(async ({ email, password }) => {
    setSessionMessage('');
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async ({ email, name, phone, password }) => {
    setSessionMessage('');
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, phone, password }),
    });
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      clearInactivityTimer();
      clearCsrfToken();
      setUser(null);
      setSessionMessage('');
    }
  }, [clearInactivityTimer]);

  const clearSessionMessage = useCallback(() => setSessionMessage(''), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        sessionMessage,
        clearSessionMessage,
        login,
        register,
        logout,
        loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }
  return ctx;
}
