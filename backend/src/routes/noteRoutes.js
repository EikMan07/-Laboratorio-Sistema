import { Router } from 'express';
import * as noteController from '../controllers/noteController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verifyOrigin, verifyCsrfToken } from '../middlewares/csrf.js';
import { validar, validateBody, validateParams } from '../middlewares/validar.js';
import { noteSchema, noteIdParamsSchema } from '../schemas/noteSchemas.js';

const router = Router();

router.use(verifyOrigin, authMiddleware, verifyCsrfToken);

router.get('/', noteController.listNotes);
router.get('/:id', validateParams(noteIdParamsSchema), noteController.getNoteById);
router.post('/', validateBody(noteSchema), noteController.createNote);
router.put('/:id', validar({ params: noteIdParamsSchema, body: noteSchema }), noteController.updateNote);
router.delete('/:id', validateParams(noteIdParamsSchema), noteController.deleteNote);

export default router;
