import { z } from 'zod';

export const tipoEntradaSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, 'El nombre del tipo de entrada es requerido'),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  stockTotal: z.coerce.number().int().min(1, 'El stock total debe ser al menos 1'),
  maxPorCompra: z.coerce.number().int().min(1, 'El límite por compra debe ser al menos 1').default(10),
});

export const createEventoSchema = z.object({
  titulo: z.string().min(1, 'El título del evento es requerido'),
  descripcion: z.string().optional().nullable(),
  imagenUrl: z.string().url('La foto del evento es requerida').min(1, 'La foto del evento es requerida'),
  fechaInicio: z.coerce.date({
    required_error: 'La fecha de inicio es requerida',
    invalid_type_error: 'Fecha de inicio inválida',
  }),
  fechaFin: z.coerce.date().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  estado: z.enum(['BORRADOR', 'PUBLICADO', 'FINALIZADO', 'CANCELADO']).default('BORRADOR'),
  tiposEntrada: z
    .array(tipoEntradaSchema)
    .min(1, 'Debe definir al menos un tipo de entrada para el evento'),
});

export const updateEventoSchema = z.object({
  titulo: z.string().min(1, 'El título del evento no puede estar vacío').optional(),
  descripcion: z.string().optional().nullable(),
  imagenUrl: z.string().url('La URL de la foto del evento no es válida').optional().nullable(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  estado: z.enum(['BORRADOR', 'PUBLICADO', 'FINALIZADO', 'CANCELADO']).optional(),
  tiposEntrada: z.array(tipoEntradaSchema).optional(),
});
