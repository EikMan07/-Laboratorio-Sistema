import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verifyOrigin, verifyCsrfToken } from '../middlewares/csrf.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { validateBody } from '../middlewares/validar.js';
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  changePasswordSchema,
} from '../schemas/authSchemas.js';

const router = Router();

// Rutas públicas mutables (protegidas con Origin/Referer + rate limit + Zod)
router.post('/register', verifyOrigin, authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', verifyOrigin, authLimiter, validateBody(loginSchema), authController.login);
router.post('/forgot-password', verifyOrigin, authLimiter, validateBody(forgotSchema), authController.forgotPassword);
router.post('/reset-password', verifyOrigin, authLimiter, validateBody(resetSchema), authController.resetPassword);

// Rutas autenticadas de lectura (emiten/renuevan CSRF token en memoria)
router.get('/me', authMiddleware, authController.me);
router.get('/csrf-token', authMiddleware, authController.getCsrfToken);

// Rutas autenticadas mutables (anti-CSRF en 3 capas: SameSite + Origin + X-CSRF-Token)
router.post('/logout', verifyOrigin, authMiddleware, verifyCsrfToken, authController.logout);
router.post(
  '/change-password',
  verifyOrigin,
  authMiddleware,
  verifyCsrfToken,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;
