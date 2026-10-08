import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const uploadEventImage = (buffer: Buffer): Promise<{ secureUrl: string; publicId: string }> => {
  if (!cloudinaryConfigured) {
    throw new AppError('Cloudinary no está configurado en el servidor', 503);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'sistemaqr/eventos',
        resource_type: 'image',
        transformation: [{ width: 1600, height: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError('No se pudo subir la foto del evento', 502));
          return;
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

export const deleteEventImage = async (publicId?: string | null): Promise<void> => {
  if (!publicId || !cloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
};
