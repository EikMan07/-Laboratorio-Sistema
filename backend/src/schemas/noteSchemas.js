import { z } from 'zod';

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio').max(120),
  content: z.string().trim().min(1, 'El contenido es obligatorio').max(4000),
});

export const noteIdParamsSchema = z.object({
  id: z.string().uuid('Identificador de nota inválido'),
});
