import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateTicketSchema } from '../schemas/ticket.schema.js';
import { verifyTokenQR } from '../lib/qr.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ─────────────────────────────────────────────
// GET /api/tickets/mis-tickets
// Listar todas las entradas adquiridas por el usuario logueado
// ─────────────────────────────────────────────
router.get(
  '/mis-tickets',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioId = req.user!.id;

      const tickets = await prisma.ticket.findMany({
        where: {
          orden: {
            usuarioId,
            estado: 'PAGADA',
          },
        },
        include: {
          tipoEntrada: {
            include: {
              evento: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({ tickets });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/validar',
  authenticate,
  authorize('ADMIN', 'VALIDADOR'),
  validate(validateTicketSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenQr } = req.body;
      const verification = verifyTokenQR(tokenQr);

      if (!verification.valid) {
        res.status(400).json({ valid: false, reason: 'INVALIDO', message: 'Código QR inválido' });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findUnique({
          where: { tokenQr },
          include: {
            tipoEntrada: { include: { evento: true } },
          },
        });

        if (!ticket) {
          return { kind: 'not_found' as const };
        }
        if (ticket.estado === 'UTILIZADO') {
          return { kind: 'used' as const, ticket };
        }
        if (ticket.estado !== 'ACTIVO') {
          return { kind: 'invalid' as const, ticket };
        }

        const updated = await tx.ticket.updateMany({
          where: { id: ticket.id, estado: 'ACTIVO' },
          data: {
            estado: 'UTILIZADO',
            fechaUso: new Date(),
            validadorId: req.user!.id,
          },
        });

        if (updated.count !== 1) {
          return { kind: 'race' as const };
        }

        return {
          kind: 'valid' as const,
          ticket: {
            ...ticket,
            estado: 'UTILIZADO' as const,
            fechaUso: new Date(),
            validadorId: req.user!.id,
          },
        };
      });

      if (result.kind === 'not_found') {
        res.status(404).json({ valid: false, reason: 'INEXISTENTE', message: 'Código QR no encontrado' });
        return;
      }
      if (result.kind === 'used') {
        res.status(409).json({
          valid: false,
          reason: 'YA_UTILIZADO',
          message: 'La entrada ya fue utilizada',
          fechaUso: result.ticket.fechaUso,
        });
        return;
      }
      if (result.kind === 'invalid' || result.kind === 'race') {
        res.status(409).json({ valid: false, reason: 'NO_DISPONIBLE', message: 'La entrada no está activa' });
        return;
      }

      res.json({
        valid: true,
        message: 'Entrada validada correctamente',
        ticket: result.ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/emitir', authenticate, authorize('ADMIN'), (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('La emisión manual se implementará en la Fase 6', 501));
});

export default router;
