import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

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

// Endpoints reservados para las siguientes fases
router.post('/validar', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/emitir', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
