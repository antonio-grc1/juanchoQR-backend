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

export function verifyTokenQR(token: string): { valid: boolean; uuid: string } {
  const [uuid, signature] = token.split('.');
  if (!uuid || !signature) {
    return { valid: false, uuid: '' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.QR_HMAC_SECRET)
    .update(uuid)
    .digest('hex');

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  return { valid, uuid };
}
