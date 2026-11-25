import { z } from 'zod';

export const passwordPolicy = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña es demasiado larga')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un símbolo');

export const registerSchema = z.object({
  email: z.string().trim().email('Correo inválido').max(255).toLowerCase(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal('')),
  password: passwordPolicy,
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255).toLowerCase(),
  password: z.string().min(1).max(128),
});

export const forgotSchema = z.object({
  email: z.string().trim().email().max(255).toLowerCase(),
});

export const resetSchema = z.object({
  token: z.string().trim().length(64),
  newPassword: passwordPolicy,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordPolicy,
});
