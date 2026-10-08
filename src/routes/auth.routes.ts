import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { validate } from '../middleware/validate.js';
import { googleLoginSchema, adminLoginSchema, refreshTokenSchema } from '../schemas/auth.schema.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────
// POST /api/auth/google
// Login / registro automático para COMPRADORES
// ─────────────────────────────────────────────
router.post(
  '/google',
  validate(googleLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = req.body;

      // Verificar el token de Google
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID,
        });
      } catch (verifyError: any) {
        console.error('❌ Error al verificar idToken con Google:', verifyError.message || verifyError);
        throw new AppError(`Error al verificar token con Google: ${verifyError.message || 'Token inválido'}`, 401);
      }

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new AppError('Token de Google no contiene información de email', 401);
      }

      const { sub: googleId, email, name } = payload;

      // Buscar usuario existente o crear uno nuevo
      let usuario = await prisma.usuario.findUnique({
        where: { googleId: googleId },
      });

      if (!usuario) {
        // También verificar si existe un usuario con ese email (registrado previamente como admin o con password)
        const existingByEmail = await prisma.usuario.findUnique({
          where: { email },
        });

        if (existingByEmail) {
          // Si ya existe con ese email, vincular su Google ID
          usuario = await prisma.usuario.update({
            where: { email },
            data: { googleId },
          });
        } else {
          // Crear nuevo usuario comprador
          usuario = await prisma.usuario.create({
            data: {
              email,
              nombre: name || email.split('@')[0],
              googleId,
              rol: 'COMPRADOR',
            },
          });
        }
      }

      // Generar tokens
      const tokenPayload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.json({
        accessToken,
        refreshToken,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
        },
      });
    } catch (error: any) {
      console.error('❌ Error en POST /api/auth/google:', error);
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/auth/login
// Login con email + contraseña para ADMIN / VALIDADOR
// ─────────────────────────────────────────────
router.post(
  '/login',
  validate(adminLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!usuario || !usuario.passwordHash) {
        throw new AppError('Credenciales inválidas', 401);
      }

      // Solo admins y validadores pueden loguearse con contraseña
      if (usuario.rol === 'COMPRADOR') {
        throw new AppError('Usá el inicio de sesión con Google', 403);
      }

      const passwordValid = await bcrypt.compare(password, usuario.passwordHash);
      if (!passwordValid) {
        throw new AppError('Credenciales inválidas', 401);
      }

      // Generar tokens
      const tokenPayload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.json({
        accessToken,
        refreshToken,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// Renovar access token usando refresh token
// ─────────────────────────────────────────────
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      const payload = verifyRefreshToken(refreshToken);

      // Verificar que el usuario siga existiendo
      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.id },
      });

      if (!usuario) {
        throw new AppError('Usuario no encontrado', 401);
      }

      // Generar nuevo access token
      const tokenPayload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
      const newAccessToken = generateAccessToken(tokenPayload);

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/auth/logout
// Cerrar sesión (el cliente descarta los tokens)
// ─────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  // Con JWT stateless, el logout se maneja en el cliente descartando los tokens.
  // Si en el futuro se necesita invalidar tokens del lado servidor,
  // se puede implementar una blacklist en Redis.
  res.json({ message: 'Sesión cerrada correctamente' });
});

export default router;
