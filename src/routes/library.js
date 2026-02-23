import express from 'express';
import { searchLibrary } from '../services/libraryService.js';

const router = express.Router();

/**
 * GET /api/library/search
 * Search OpenClipart and Wikimedia for coloring page images
 */
router.get('/search', async (req, res) => {
  const { keyword, category } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  const results = await searchLibrary(keyword, category);
  res.json({ keyword, results });
});

export default router;
