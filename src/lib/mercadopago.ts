import { MercadoPagoConfig, Preference } from 'mercadopago';
import { env } from '../config/env.js';

let client: MercadoPagoConfig | null = null;

if (env.MP_ACCESS_TOKEN && env.MP_ACCESS_TOKEN.trim() !== '') {
  client = new MercadoPagoConfig({
    accessToken: env.MP_ACCESS_TOKEN,
  });
}

export interface CreatePreferenceParams {
  ordenId: string;
  titulo: string;
  precioUnitario: number;
  cantidad: number;
  compradorEmail: string;
}

export async function createCheckoutPreference({
  ordenId,
  titulo,
  precioUnitario,
  cantidad,
  compradorEmail,
}: CreatePreferenceParams): Promise<{ preferenceId: string; initPoint: string }> {
  if (client) {
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: ordenId,
            title: titulo,
            unit_price: precioUnitario,
            quantity: cantidad,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: compradorEmail,
        },
        external_reference: ordenId,
        back_urls: {
          success: `${env.FRONTEND_URL}/pago/exitoso?orden_id=${ordenId}`,
          failure: `${env.FRONTEND_URL}/pago/fallido?orden_id=${ordenId}`,
          pending: `${env.FRONTEND_URL}/pago/pendiente?orden_id=${ordenId}`,
        },
        auto_return: 'approved',
        notification_url: `${env.FRONTEND_URL.replace('5173', '3001')}/api/webhooks/mercadopago`,
      },
    });

    return {
      preferenceId: result.id || '',
      initPoint: result.init_point || result.sandbox_init_point || '',
    };
  }

  // Modo desarrollo / Mock cuando no hay MP_ACCESS_TOKEN configurado aún
  const mockPreferenceId = `mock_pref_${ordenId}`;
  const mockInitPoint = `${env.FRONTEND_URL}/pago/simulador?orden_id=${ordenId}`;

  return {
    preferenceId: mockPreferenceId,
    initPoint: mockInitPoint,
  };
}
