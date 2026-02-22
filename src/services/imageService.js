import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Save image from buffer to uploads directory
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<{filename: string, filePath: string, fileSize: number, width: number, height: number}>}
 */
export async function saveImageFromBuffer(buffer) {
  try {
    // Generate unique filename
    const filename = `${uuidv4()}.png`;
    const filePath = path.join(uploadsDir, filename);

    // Use sharp to validate, optimize, and get dimensions
    const imageMetadata = await sharp(buffer)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(filePath);

    const fileStats = fs.statSync(filePath);

    return {
      filename,
      filePath,
      fileSize: fileStats.size,
      width: imageMetadata.width,
      height: imageMetadata.height
    };
  } catch (error) {
    console.error('Error saving image:', error.message);
    throw new Error(`Failed to save image: ${error.message}`);
  }
}

/**
 * Download image from URL and save to uploads directory
 * @param {string} imageUrl - URL of the image to download
 * @returns {Promise<{filename: string, filePath: string, fileSize: number, width: number, height: number}>}
 */
export async function downloadAndSaveImage(imageUrl) {
  try {
    // Download image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });

    const buffer = Buffer.from(response.data);
    return await saveImageFromBuffer(buffer);
  } catch (error) {
    console.error('Error downloading image:', error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Delete image file from uploads directory
 * @param {string} filename - Filename to delete
 */
export function deleteImage(filename) {
  try {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image:', error.message);
    return false;
  }
}

/**
 * Get absolute path for uploads directory
 */
export function getUploadsPath() {
  return uploadsDir;
}
