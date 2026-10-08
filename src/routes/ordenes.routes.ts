import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrdenSchema } from '../schemas/orden.schema.js';
import { createOrder, confirmOrderPayment, rejectOrderPayment } from '../services/orden.service.js';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/ordenes
// Crear orden de compra y generar preferencia de Mercado Pago
// ─────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  validate(createOrdenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipoEntradaId, cantidad } = req.body;
      const usuario = req.user!;

      const result = await createOrder({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        tipoEntradaId,
        cantidad,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/ordenes/mis-ordenes
// Listar órdenes del usuario autenticado
// ─────────────────────────────────────────────
router.get(
  '/mis-ordenes',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioId = req.user!.id;

      const ordenes = await prisma.orden.findMany({
        where: { usuarioId },
        include: {
          tickets: {
            include: {
              tipoEntrada: {
                include: {
                  evento: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({ ordenes });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/ordenes/simular-pago
// Endpoint de desarrollo para simular aprobación/rechazo de pagos
// ─────────────────────────────────────────────
router.post(
  '/simular-pago',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ordenId, accion } = req.body;

      if (!ordenId) {
        res.status(400).json({ error: 'ordenId es requerido' });
        return;
      }

      if (accion === 'rechazar') {
        const orden = await rejectOrderPayment(ordenId);
        res.json({ message: 'Pago simulado como rechazado', orden });
        return;
      }

      // Por defecto aprobar
      const orden = await confirmOrderPayment(ordenId, `sim_pay_${Date.now()}`);
      res.json({ message: 'Pago simulado como aprobado con éxito', orden });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
