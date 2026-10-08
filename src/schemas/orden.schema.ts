import { z } from 'zod';

export const createOrdenSchema = z.object({
  tipoEntradaId: z.string().uuid('ID de tipo de entrada inválido'),
  cantidad: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

export type CreateOrdenInput = z.infer<typeof createOrdenSchema>;
