import * as authService from '../services/authService.js';
import { setSessionCookie, clearSessionCookie } from '../utils/cookies.js';
import { generateCsrfToken } from '../middlewares/csrf.js';

export async function register(req, res, next) {
  try {
    const { email, name, phone, password } = req.body;
    const { sessionToken, csrfToken, user } = await authService.registerUser({
      email,
      name,
      phone,
      password,
      ipAddress: req.ip,
    });
    setSessionCookie(res, sessionToken);
    return res.status(201).json({ user, csrfToken });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { sessionToken, csrfToken, user } = await authService.loginUser({
      email,
      password,
      ipAddress: req.ip,
    });
    setSessionCookie(res, sessionToken);
    return res.status(200).json({ user, csrfToken });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logoutUser({
      userId: req.user.id,
      jti: req.user.jti,
      exp: req.user.exp,
      ipAddress: req.ip,
    });
    clearSessionCookie(res);
    return res.status(200).json({ message: 'Sesión cerrada correctamente.' });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    const { user, csrfToken } = await authService.getCurrentUser({
      userId: req.user.id,
      jti: req.user.jti,
    });
    return res.status(200).json({ user, csrfToken });
  } catch (err) {
    return next(err);
  }
}

export async function getCsrfToken(req, res, next) {
  try {
    const csrfToken = generateCsrfToken(req.user.jti);
    return res.status(200).json({ csrfToken });
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
      ipAddress: req.ip,
    });
    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset({
      email,
      ipAddress: req.ip,
    });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword({
      token,
      newPassword,
      ipAddress: req.ip,
    });
    return res.status(200).json({ message: 'Contraseña restablecida correctamente.' });
  } catch (err) {
    return next(err);
  }
}
