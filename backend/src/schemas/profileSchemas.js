import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(7).max(30),
});

export const profileQuerySchema = z.object({
  reveal: z.enum(['true', 'false']).optional(),
});
