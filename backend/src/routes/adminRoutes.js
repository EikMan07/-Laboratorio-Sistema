import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { verifyOrigin, verifyCsrfToken } from '../middlewares/csrf.js';
import { validar } from '../middlewares/validar.js';
import { roleSchema, userIdParamsSchema } from '../schemas/adminSchemas.js';

const router = Router();

// RF-07: Todas las rutas de administración exigen sesión válida, anti-CSRF y rol 'admin'
router.use(verifyOrigin, authMiddleware, verifyCsrfToken, requireRole('admin'));

router.get('/users', adminController.listUsers);
router.patch(
  '/users/:id/role',
  validar({ params: userIdParamsSchema, body: roleSchema }),
  adminController.updateUserRole
);
router.get('/audit-logs', adminController.listAuditLogs);

export default router;
