import { z } from 'zod';

export const roleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid('Identificador de usuario inválido'),
});
