import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Use /tmp for Vercel compatibility — only writable directory in serverless
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'uploads');

// Create uploads dir only if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function saveImage(imageUrl) {
  const filename = `${uuidv4()}.png`;
  const filePath = path.join(uploadsDir, filename);

  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, response.data);

  return {
    filename,
    filePath,
    fileSize: response.data.length,
    publicUrl: `/images/${filename}`
  };
}

/**
 * Save image from buffer (for AI-generated images)
 */
export async function saveImageFromBuffer(buffer, mimeType = 'image/png') {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, buffer);

  return {
    filename,
    filePath,
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
 * Download image from URL and save to disk (for library images)
 * Detects SVG vs PNG from Content-Type and uses the correct extension.
 */
export async function saveImageFromUrl(imageUrl, keyword, category, source = 'library') {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000, headers: DOWNLOAD_HEADERS });
  const buffer = Buffer.from(response.data);

  const mimeType = response.headers['content-type']?.split(';')[0]?.trim() || 'image/png';
  const ext = mimeType === 'image/svg+xml' ? 'svg' : 'png';
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    filename,
    filePath,
    fileSize: buffer.length,
    publicUrl: `/images/${filename}`,
    mimeType,
    buffer,
    source
  };
}

/**
 * Get absolute path for uploads directory
 */
export function getUploadsPath() {
  return uploadsDir;
}
