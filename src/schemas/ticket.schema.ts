import { z } from 'zod';

export const validateTicketSchema = z.object({
  tokenQr: z.string().trim().min(1, 'El código QR es requerido'),
});

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
