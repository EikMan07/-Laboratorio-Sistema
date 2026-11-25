import { Router } from 'express';
import * as profileController from '../controllers/profileController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verifyOrigin, verifyCsrfToken } from '../middlewares/csrf.js';
import { validateBody, validateQuery } from '../middlewares/validar.js';
import { updateProfileSchema, profileQuerySchema } from '../schemas/profileSchemas.js';

const router = Router();

router.use(verifyOrigin, authMiddleware, verifyCsrfToken);

router.get('/', validateQuery(profileQuerySchema), profileController.getProfile);
router.put('/', validateBody(updateProfileSchema), profileController.updateProfile);

export default router;
