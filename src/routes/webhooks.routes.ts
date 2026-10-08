import { Router, Request, Response } from 'express';
import { Payment, MercadoPagoConfig } from 'mercadopago';
import { env } from '../config/env.js';
import { confirmOrderPayment, rejectOrderPayment } from '../services/orden.service.js';

const router = Router();

let mpClient: MercadoPagoConfig | null = null;
if (env.MP_ACCESS_TOKEN && env.MP_ACCESS_TOKEN.trim() !== '') {
  mpClient = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
}

// ─────────────────────────────────────────────
// POST /api/webhooks/mercadopago
// Escucha notificaciones de pago de Mercado Pago
// ─────────────────────────────────────────────
router.post('/mercadopago', async (req: Request, res: Response) => {
  try {
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;
    const type = req.body?.type || req.query.type || req.query.topic;

    // Mercado Pago envía notificaciones de varios tipos; solo procesamos pagos
    if (type === 'payment' && paymentId && mpClient) {
      const paymentApi = new Payment(mpClient);
      const payment = await paymentApi.get({ id: String(paymentId) });

      const ordenId = payment.external_reference;

      if (ordenId) {
        if (payment.status === 'approved') {
          await confirmOrderPayment(ordenId, String(payment.id));
          console.log(`✅ Pago aprobado y orden ${ordenId} procesada exitosamente.`);
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
          await rejectOrderPayment(ordenId);
          console.log(`❌ Pago rechazado/cancelado para la orden ${ordenId}.`);
        }
      }
    }

    // Mercado Pago requiere siempre un status 200 para confirmar la recepción
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error);
    // Respondemos 200 de todas formas para evitar reintentos descontrolados
    res.status(200).send('ERROR_HANDLED');
  }
});

export default router;
