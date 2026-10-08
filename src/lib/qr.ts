import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { env } from '../config/env.js';

export function generateTokenQR(): string {
  const uuid = uuidv4();
  const signature = crypto
    .createHmac('sha256', env.QR_HMAC_SECRET)
    .update(uuid)
    .digest('hex');
  return `${uuid}.${signature}`;
}

function verifySignature(uuid: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(uuid)
    .digest('hex');

  const providedSignature = Buffer.from(signature, 'hex');
  return providedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      providedSignature,
      Buffer.from(expectedSignature, 'hex')
    );
}

export function verifyTokenQR(token: string): { valid: boolean; uuid: string } {
  const [uuid, signature] = token.split('.');
  if (!uuid || !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return { valid: false, uuid: '' };
  }

  const valid = verifySignature(uuid, signature, env.QR_HMAC_SECRET) ||
    (env.QR_HMAC_SECRET_PREVIOUS
      ? verifySignature(uuid, signature, env.QR_HMAC_SECRET_PREVIOUS)
      : false);

  return { valid, uuid };
}
