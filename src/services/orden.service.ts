import { prisma } from '../lib/prisma.js';
import { generateTokenQR } from '../lib/qr.js';
import { createCheckoutPreference } from '../lib/mercadopago.js';
import { AppError } from '../middleware/errorHandler.js';
import { EstadoOrden, EstadoTicket } from '@prisma/client';
import { sendTicketsEmail } from '../lib/email.js';

export interface CreateOrderParams {
  usuarioId: string;
  usuarioEmail: string;
  tipoEntradaId: string;
  cantidad: number;
}

export async function createOrder({
  usuarioId,
  usuarioEmail,
  tipoEntradaId,
  cantidad,
}: CreateOrderParams) {
  // 1. Crear la orden y reservar tickets de forma transaccional
  const { orden, tipoEntrada, evento } = await prisma.$transaction(async (tx) => {
    const tipo = await tx.tipoEntrada.findUnique({
      where: { id: tipoEntradaId },
      include: { evento: true },
    });

    if (!tipo) {
      throw new AppError('El tipo de entrada seleccionado no existe', 404);
    }

    if (tipo.evento.estado !== 'PUBLICADO') {
      throw new AppError('El evento no está disponible para la venta', 400);
    }

    if (cantidad > tipo.maxPorCompra) {
      throw new AppError(`El límite máximo por compra es de ${tipo.maxPorCompra} entradas`, 400);
    }

    if (tipo.stockDisponible < cantidad) {
      throw new AppError(`Stock insuficiente. Solo quedan ${tipo.stockDisponible} entradas disponibles`, 400);
    }

    // Descontar stock disponible inmediatamente para reservar
    await tx.tipoEntrada.update({
      where: { id: tipoEntradaId },
      data: {
        stockDisponible: {
          decrement: cantidad,
        },
      },
    });

    const total = Number(tipo.precio) * cantidad;

    // Crear orden en estado PENDIENTE
    const nuevaOrden = await tx.orden.create({
      data: {
        usuarioId,
        total,
        estado: EstadoOrden.PENDIENTE,
      },
    });

    // Generar tickets únicos asociados a la orden
    const ticketsData = Array.from({ length: cantidad }).map(() => ({
      ordenId: nuevaOrden.id,
      tipoEntradaId: tipo.id,
      tokenQr: generateTokenQR(),
      estado: EstadoTicket.ACTIVO,
    }));

    await tx.ticket.createMany({
      data: ticketsData,
    });

    return {
      orden: nuevaOrden,
      tipoEntrada: tipo,
      evento: tipo.evento,
    };
  });

  // 2. Generar preferencia de Mercado Pago (o Mock en desarrollo)
  const preference = await createCheckoutPreference({
    ordenId: orden.id,
    titulo: `${evento.titulo} - ${tipoEntrada.nombre}`,
    precioUnitario: Number(tipoEntrada.precio),
    cantidad,
    compradorEmail: usuarioEmail,
  });

  // 3. Guardar el ID de preferencia en la orden
  await prisma.orden.update({
    where: { id: orden.id },
    data: {
      mpPreferenceId: preference.preferenceId,
    },
  });

  return {
    ordenId: orden.id,
    total: orden.total,
    preferenceId: preference.preferenceId,
    initPoint: preference.initPoint,
  };
}

export async function confirmOrderPayment(ordenId: string, paymentId?: string) {
  const orden = await prisma.orden.findUnique({
    where: { id: ordenId },
  });

  if (!orden) {
    throw new AppError('Orden no encontrada', 404);
  }

  // Idempotente: si ya está pagada no hacemos nada
  if (orden.estado === EstadoOrden.PAGADA) {
    return orden;
  }

  const ordenActualizada = await prisma.orden.update({
    where: { id: ordenId },
    data: {
      estado: EstadoOrden.PAGADA,
      mpPaymentId: paymentId || `pay_sim_${Date.now()}`,
    },
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
      usuario: true,
    },
  });

  // Enviar email con los códigos QR en segundo plano
  if (ordenActualizada.tickets.length > 0) {
    const primerTicket = ordenActualizada.tickets[0];
    const evento = primerTicket.tipoEntrada.evento;

    sendTicketsEmail({
      to: ordenActualizada.usuario.email,
      nombreComprador: ordenActualizada.usuario.nombre,
      eventoTitulo: evento.titulo,
      fechaEvento: new Date(evento.fechaInicio).toLocaleDateString('es-AR'),
      ubicacion: evento.ubicacion || undefined,
      tickets: ordenActualizada.tickets.map((t) => ({
        id: t.id,
        tipoNombre: t.tipoEntrada.nombre,
        tokenQr: t.tokenQr,
      })),
    }).catch((err) => console.error('Error enviando email con tickets:', err));
  }

  return ordenActualizada;
}

export async function rejectOrderPayment(ordenId: string) {
  return await prisma.$transaction(async (tx) => {
    const orden = await tx.orden.findUnique({
      where: { id: ordenId },
      include: { tickets: true },
    });

    if (!orden || orden.estado === EstadoOrden.RECHAZADA) {
      return orden;
    }

    // Devolver el stock que había sido reservado
    if (orden.tickets.length > 0) {
      const tipoEntradaId = orden.tickets[0].tipoEntradaId;
      await tx.tipoEntrada.update({
        where: { id: tipoEntradaId },
        data: {
          stockDisponible: {
            increment: orden.tickets.length,
          },
        },
      });

      // Cancelar los tickets
      await tx.ticket.updateMany({
        where: { ordenId: orden.id },
        data: {
          estado: EstadoTicket.CANCELADO,
        },
      });
    }

    return await tx.orden.update({
      where: { id: ordenId },
      data: {
        estado: EstadoOrden.RECHAZADA,
      },
    });
  });
}

