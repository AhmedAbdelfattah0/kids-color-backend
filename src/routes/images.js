import express from 'express';
import { getImageByFilename, getPackImageByFilename } from '../services/galleryService.js';

const router = express.Router();

/**
 * GET /images/:filename
 * Serve image binary data from PostgreSQL, or redirect to R2 URL.
 * Checks the main images table first, then falls back to pack_images.
 * New images stored in R2 have image_data=NULL and a full https image_url — redirect those.
 */
router.get('/:filename', async (req, res) => {
  try {
    let image = await getImageByFilename(req.params.filename);

    if (!image || !image.image_data) {
      image = await getPackImageByFilename(req.params.filename);
    }

    if (!image) {
      return res.status(404).send('Image not found');
    }

    // R2-hosted image — redirect to the public URL
    if (!image.image_data && image.image_url?.startsWith('https://')) {
      return res.redirect(301, image.image_url);
    }

    if (!image.image_data) {
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
