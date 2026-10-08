import { z } from 'zod';

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'El token de Google es requerido'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});
