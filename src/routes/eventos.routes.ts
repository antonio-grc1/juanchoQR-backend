import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createEventoSchema, updateEventoSchema } from '../schemas/evento.schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { EstadoEvento } from '@prisma/client';

const router = Router();

// ─────────────────────────────────────────────
// GET /api/eventos
// Listar eventos (público: por defecto solo PUBLICADO; admin puede filtrar)
// ─────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estadoQuery = req.query.estado as string | undefined;

    const whereClause: { estado?: EstadoEvento } = {};

    if (estadoQuery && Object.values(EstadoEvento).includes(estadoQuery as EstadoEvento)) {
      whereClause.estado = estadoQuery as EstadoEvento;
    } else if (estadoQuery === 'ALL') {
      // No filtrar por estado
    } else {
      // Público: por defecto eventos publicados
      whereClause.estado = EstadoEvento.PUBLICADO;
    }

    const eventos = await prisma.evento.findMany({
      where: whereClause,
      include: {
        tiposEntrada: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            stockTotal: true,
            stockDisponible: true,
            maxPorCompra: true,
          },
        },
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    });

    res.json({ eventos });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// GET /api/eventos/:id
// Detalle de un evento con sus tipos de entrada (público)
// ─────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        tiposEntrada: {
          orderBy: {
            precio: 'asc',
          },
        },
      },
    });

    if (!evento) {
      throw new AppError('Evento no encontrado', 404);
    }

    res.json({ evento });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// POST /api/eventos
// Crear nuevo evento con tipos de entrada (solo ADMIN)
// ─────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createEventoSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tiposEntrada, ...eventoData } = req.body;

      const evento = await prisma.evento.create({
        data: {
          ...eventoData,
          tiposEntrada: {
            create: tiposEntrada.map((tipo: {
              nombre: string;
              precio: number;
              stockTotal: number;
              maxPorCompra?: number;
            }) => ({
              nombre: tipo.nombre,
              precio: tipo.precio,
              stockTotal: tipo.stockTotal,
              stockDisponible: tipo.stockTotal,
              maxPorCompra: tipo.maxPorCompra ?? 10,
            })),
          },
        },
        include: {
          tiposEntrada: true,
        },
      });

      res.status(201).json({
        message: 'Evento creado exitosamente',
        evento,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// PUT /api/eventos/:id
// Actualizar evento existente (solo ADMIN)
// ─────────────────────────────────────────────
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateEventoSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { tiposEntrada, ...eventoData } = req.body;

      const eventoExistente = await prisma.evento.findUnique({
        where: { id },
      });

      if (!eventoExistente) {
        throw new AppError('Evento no encontrado', 404);
      }

      // Actualizar datos del evento
      const eventoActualizado = await prisma.$transaction(async (tx) => {
        // Si se enviaron tipos de entrada para actualizar o agregar
        if (tiposEntrada && Array.isArray(tiposEntrada)) {
          for (const tipo of tiposEntrada) {
            if (tipo.id) {
              // Actualizar tipo existente
              await tx.tipoEntrada.update({
                where: { id: tipo.id },
                data: {
                  nombre: tipo.nombre,
                  precio: tipo.precio,
                  stockTotal: tipo.stockTotal,
                  maxPorCompra: tipo.maxPorCompra,
                },
              });
            } else {
              // Crear nuevo tipo dentro del evento
              await tx.tipoEntrada.create({
                data: {
                  eventoId: id,
                  nombre: tipo.nombre,
                  precio: tipo.precio,
                  stockTotal: tipo.stockTotal,
                  stockDisponible: tipo.stockTotal,
                  maxPorCompra: tipo.maxPorCompra ?? 10,
                },
              });
            }
          }
        }

        return tx.evento.update({
          where: { id },
          data: eventoData,
          include: {
            tiposEntrada: true,
          },
        });
      });

      res.json({
        message: 'Evento actualizado exitosamente',
        evento: eventoActualizado,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────
// DELETE /api/eventos/:id
// Eliminar o cancelar evento (solo ADMIN)
// ─────────────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const evento = await prisma.evento.findUnique({
        where: { id },
        include: {
          tiposEntrada: {
            include: {
              _count: {
                select: { tickets: true },
              },
            },
          },
        },
      });

      if (!evento) {
        throw new AppError('Evento no encontrado', 404);
      }

      // Verificar si ya se emitieron tickets para este evento
      const totalTickets = evento.tiposEntrada.reduce(
        (acc, curr) => acc + curr._count.tickets,
        0
      );

      if (totalTickets > 0) {
        // Soft delete: cambiar a CANCELADO para preservar auditoría de tickets existentes
        const eventoCancelado = await prisma.evento.update({
          where: { id },
          data: { estado: EstadoEvento.CANCELADO },
        });

        res.json({
          message:
            'El evento no se eliminó físicamente porque ya posee tickets emitidos. Su estado fue cambiado a CANCELADO.',
          evento: eventoCancelado,
        });
        return;
      }

      // Si no tiene tickets emitidos, se puede borrar completamente
      await prisma.evento.delete({
        where: { id },
      });

      res.json({ message: 'Evento eliminado exitosamente' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
