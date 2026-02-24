import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { uploadToR2 } from './r2Service.js';

// Local uploads dir — used as fallback when R2 is not configured
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'uploads');

const r2Enabled = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  process.env.R2_PUBLIC_URL
);

if (!r2Enabled && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Save image from buffer — upload to R2 (preferred) or fall back to local disk.
 */
export async function saveImageFromBuffer(buffer, mimeType = 'image/png') {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';

  if (r2Enabled) {
    const { filename, publicUrl } = await uploadToR2(buffer, mimeType);
    return { filename, publicUrl, fileSize: buffer.length, mimeType, width: 1024, height: 1024 };
  }

  // Local fallback
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    filename,
    filePath,
    publicUrl: `/images/${filename}`,
    fileSize: buffer.length,
    mimeType,
    width: 1024,
    height: 1024
  };
}

const DOWNLOAD_HEADERS = {
  'User-Agent': 'KidsColorApp/1.0 (https://kids-color-frontend.vercel.app; contact via github) axios/1.x'
};

/**
 * Download image from URL and save — upload to R2 or fall back to local disk.
 */
export async function saveImageFromUrl(imageUrl, keyword, category, source = 'library') {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000, headers: DOWNLOAD_HEADERS });
  const buffer = Buffer.from(response.data);

  const mimeType = response.headers['content-type']?.split(';')[0]?.trim() || 'image/png';
  const ext = mimeType === 'image/svg+xml' ? 'svg' : 'png';

  if (r2Enabled) {
    const { filename, publicUrl } = await uploadToR2(buffer, mimeType);
    return { filename, publicUrl, fileSize: buffer.length, mimeType, buffer, source };
  }

  // Local fallback
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    filename,
    filePath,
    publicUrl: `/images/${filename}`,
    fileSize: buffer.length,
    mimeType,
    buffer,
    source
  };
}

/**
 * Download image from URL (legacy wrapper used by older routes).
 */
export async function saveImage(imageUrl) {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);
  const mimeType = 'image/png';

  if (r2Enabled) {
    const { filename, publicUrl } = await uploadToR2(buffer, mimeType);
    return { filename, publicUrl, fileSize: buffer.length };
  }

  const filename = `${uuidv4()}.png`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return { filename, filePath, fileSize: buffer.length, publicUrl: `/images/${filename}` };
}

export function getUploadsPath() {
  return uploadsDir;
}
