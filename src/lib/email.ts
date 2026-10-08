import { Resend } from 'resend';
import QRCode from 'qrcode';
import { env } from '../config/env.js';

let resend: Resend | null = null;
if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim() !== '') {
  resend = new Resend(env.RESEND_API_KEY);
}

export interface TicketEmailData {
  id: string;
  tipoNombre: string;
  tokenQr: string;
}

export interface SendTicketsEmailParams {
  to: string;
  nombreComprador: string;
  eventoTitulo: string;
  fechaEvento?: string;
  ubicacion?: string;
  tickets: TicketEmailData[];
}

export async function sendTicketsEmail({
  to,
  nombreComprador,
  eventoTitulo,
  fechaEvento,
  ubicacion,
  tickets,
}: SendTicketsEmailParams): Promise<boolean> {
  try {
    // Generar imágenes QR en formato Data URL para cada ticket
    const ticketsConQr = await Promise.all(
      tickets.map(async (t) => {
        const qrDataUrl = await QRCode.toDataURL(t.tokenQr, {
          width: 250,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        return {
          ...t,
          qrDataUrl,
        };
      })
    );

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
    .header { background: #1976d2; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 24px; }
    .ticket-card { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-top: 20px; text-align: center; background: #f8fafc; }
    .ticket-card img { width: 200px; height: 200px; margin: 10px auto; display: block; border-radius: 4px; }
    .ticket-type { font-size: 18px; font-weight: bold; color: #1976d2; margin-bottom: 5px; }
    .ticket-id { font-size: 12px; color: #64748b; font-family: monospace; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Tus entradas para ${eventoTitulo}!</h1>
    </div>
    <div class="body">
      <p>Hola <strong>${nombreComprador}</strong>,</p>
      <p>Tu compra ha sido confirmada con éxito. A continuación encontrarás tus códigos QR de acceso. Recuerda presentarlos desde tu celular o impresos en el ingreso:</p>
      
      ${fechaEvento ? `<p>📅 <strong>Fecha:</strong> ${fechaEvento}</p>` : ''}
      ${ubicacion ? `<p>📍 <strong>Lugar:</strong> ${ubicacion}</p>` : ''}

      ${ticketsConQr
        .map(
          (t, index) => `
        <div class="ticket-card">
          <div class="ticket-type">Entrada #${index + 1} — ${t.tipoNombre}</div>
          <img src="${t.qrDataUrl}" alt="Código QR Entrada ${index + 1}" />
          <div class="ticket-id">Código: ${t.tokenQr.substring(0, 18)}...</div>
        </div>
      `
        )
        .join('')}

      <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
        También puedes ver tus entradas en cualquier momento ingresando a tu cuenta en nuestra plataforma en la sección <strong>Mis Entradas</strong>.
      </p>
    </div>
    <div class="footer">
      JuanchoQR — Sistema de Control y Venta de Entradas
    </div>
  </div>
</body>
</html>
    `;

    if (resend) {
      await resend.emails.send({
        from: 'TicketQR <entradas@resend.dev>',
        to,
        subject: `Tus entradas para ${eventoTitulo}`,
        html: htmlContent,
      });
      console.log(`✉️ Email de entradas enviado con éxito a ${to}`);
    } else {
      console.log(`ℹ️ [Email Mock] RESEND_API_KEY no configurado. Email simulado exitosamente para ${to} (${tickets.length} tickets).`);
    }

    return true;
  } catch (error) {
    console.error('Error enviando email con tickets:', error);
    return false;
  }
}
