import express from 'express';
import { getImageByFilename } from '../services/galleryService.js';

const router = express.Router();

/**
 * GET /images/:filename
 * Serve image binary data from PostgreSQL (Vercel-safe, persists across invocations)
 */
router.get('/:filename', async (req, res) => {
  try {
    const image = await getImageByFilename(req.params.filename);

    if (!image || !image.image_data) {
      return res.status(404).send('Image not found');
    }

    res.set('Content-Type', image.mime_type || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image.image_data);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send('Error serving image');
  }
});

export default router;
