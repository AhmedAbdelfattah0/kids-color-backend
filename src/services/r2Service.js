import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a buffer to Cloudflare R2 and return the public URL.
 * @param {Buffer} buffer - Image data
 * @param {string} mimeType - e.g. 'image/png'
 * @param {string|null} key - Optional filename; auto-generated if omitted
 */
export async function uploadToR2(buffer, mimeType = 'image/png', key = null) {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  const filename = key || `${uuidv4()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }));

  return {
    filename,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${filename}`,
  };
}
