import express from 'express';
import {
  getGallery,
  getImageById,
  getPopularImages,
  getRecentImages,
  getImagesByCategory,
  incrementDownloadCount,
  incrementPrintCount,
  fuzzySearchKeyword,
  searchByKeyword,
  getStats
} from '../services/galleryService.js';

const router = express.Router();

/**
 * GET /api/gallery
 * Get paginated gallery with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const category = req.query.category || null;
    const sort = req.query.sort || 'newest';
    const search = req.query.search || null;

    const result = await getGallery({ page, limit, category, sort, search });

    // Format response
    const formattedImages = result.images.map(img => ({
      id: img.id,
      keyword: img.keyword,
      category: img.category,
      imageUrl: `/uploads/${img.filename}`,
      prompt: img.prompt,
      downloadCount: img.download_count,
      printCount: img.print_count,
      createdAt: img.created_at
    }));

    res.json({
      images: formattedImages,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

/**
 * GET /api/gallery/popular
 * Get most downloaded images
 */
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const images = await getPopularImages(limit);

    const formattedImages = images.map(img => ({
      id: img.id,
      keyword: img.keyword,
      category: img.category,
      imageUrl: `/uploads/${img.filename}`,
      downloadCount: img.download_count,
      printCount: img.print_count,
      createdAt: img.created_at
    }));

    res.json({ images: formattedImages });
  } catch (error) {
    console.error('Error fetching popular images:', error);
    res.status(500).json({ error: 'Failed to fetch popular images' });
  }
});

/**
 * GET /api/gallery/recent
 * Get recently generated images
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const images = await getRecentImages(limit);

    const formattedImages = images.map(img => ({
      id: img.id,
      keyword: img.keyword,
      category: img.category,
      imageUrl: `/uploads/${img.filename}`,
      downloadCount: img.download_count,
      printCount: img.print_count,
      createdAt: img.created_at
    }));

    res.json({ images: formattedImages });
  } catch (error) {
    console.error('Error fetching recent images:', error);
    res.status(500).json({ error: 'Failed to fetch recent images' });
  }
});

/**
 * GET /api/gallery/search
 * Search for images by keyword
 */
router.get('/search', async (req, res) => {
  try {
    const keyword = req.query.keyword;
    const category = req.query.category || null;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    // Try exact match first
    const exactMatch = await searchByKeyword(keyword, category);

    if (exactMatch) {
      return res.json({
        found: true,
        exact: true,
        images: [{
          id: exactMatch.id,
          keyword: exactMatch.keyword,
          category: exactMatch.category,
          imageUrl: `/uploads/${exactMatch.filename}`,
          downloadCount: exactMatch.download_count,
          printCount: exactMatch.print_count,
          createdAt: exactMatch.created_at
        }]
      });
    }

    // Try fuzzy search
    const fuzzyResults = await fuzzySearchKeyword(keyword, 5);

    if (fuzzyResults.length > 0) {
      const formattedImages = fuzzyResults.map(img => ({
        id: img.id,
        keyword: img.keyword,
        category: img.category,
        imageUrl: `/uploads/${img.filename}`,
        downloadCount: img.download_count,
        printCount: img.print_count,
        createdAt: img.created_at
      }));

      return res.json({
        found: true,
        exact: false,
        images: formattedImages
      });
    }

    res.json({
      found: false,
      exact: false,
      images: []
    });

  } catch (error) {
    console.error('Error searching images:', error);
    res.status(500).json({ error: 'Failed to search images' });
  }
});

/**
 * GET /api/gallery/stats
 * Get gallery statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/gallery/:id
 * Get single image by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await getImageById(id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get related images (same category)
    let relatedImages = [];
    if (image.category) {
      const related = await getImagesByCategory(image.category, 6);
      relatedImages = related
        .filter(img => img.id !== image.id)
        .map(img => ({
          id: img.id,
          keyword: img.keyword,
          category: img.category,
          imageUrl: `/uploads/${img.filename}`,
          downloadCount: img.download_count,
          createdAt: img.created_at
        }));
    }

    res.json({
      id: image.id,
      keyword: image.keyword,
      category: image.category,
      imageUrl: `/uploads/${image.filename}`,
      prompt: image.prompt,
      downloadCount: image.download_count,
      printCount: image.print_count,
      createdAt: image.created_at,
      relatedImages
    });

  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

/**
 * POST /api/gallery/:id/download
 * Increment download counter
 */
router.post('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await incrementDownloadCount(id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ success: true, downloadCount: image.download_count });
  } catch (error) {
    console.error('Error incrementing download count:', error);
    res.status(500).json({ error: 'Failed to update download count' });
  }
});

/**
 * POST /api/gallery/:id/print
 * Increment print counter
 */
router.post('/:id/print', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await incrementPrintCount(id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ success: true, printCount: image.print_count });
  } catch (error) {
    console.error('Error incrementing print count:', error);
    res.status(500).json({ error: 'Failed to update print count' });
  }
});

export default router;
