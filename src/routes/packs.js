import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import packs from '../data/packs.js';
import pool from '../db/database.js';
import { generatePackKeywords } from '../services/keywordGeneratorService.js';
import { generateImage } from '../services/aiService.js';
import { saveImageFromBuffer } from '../services/imageService.js';
import { enhance } from '../services/promptService.js';

const router = express.Router();

// GET /api/packs — list all packs with cache status
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pack_id, COUNT(*) as count FROM pack_images GROUP BY pack_id`
    );
    const cachedCounts = {};
    result.rows.forEach(row => {
      cachedCounts[row.pack_id] = parseInt(row.count);
    });

    const packsWithStatus = packs.map(pack => ({
      ...pack,
      cachedCount: cachedCounts[pack.id] || 0,
      isReady: (cachedCounts[pack.id] || 0) >= 24
    }));

    res.json({ packs: packsWithStatus });
  } catch (err) {
    console.error('[Packs] List error:', err);
    res.json({ packs });
  }
});

// GET /api/packs/:id — get pack metadata
router.get('/:id', async (req, res) => {
  const pack = packs.find(p => p.id === req.params.id);
  if (!pack) return res.status(404).json({ error: 'Pack not found' });

  const result = await pool.query(
    `SELECT COUNT(*) as count FROM pack_images WHERE pack_id = $1`,
    [pack.id]
  );
  const cachedCount = parseInt(result.rows[0].count);

  res.json({
    ...pack,
    cachedCount,
    isReady: cachedCount >= 24,
    totalPages: 24
  });
});

// GET /api/packs/:id/images — get cached images for a pack
router.get('/:id/images', async (req, res) => {
  const pack = packs.find(p => p.id === req.params.id);
  if (!pack) return res.status(404).json({ error: 'Pack not found' });

  const result = await pool.query(
    `SELECT * FROM pack_images WHERE pack_id = $1 ORDER BY position ASC`,
    [pack.id]
  );

  res.json({
    images: result.rows.map(row => ({
      id: row.id,
      keyword: row.keyword,
      imageUrl: row.image_url,
      prompt: row.prompt,
      difficulty: row.difficulty,
      ageRange: row.age_range,
      category: row.category,
      downloadCount: 0,
      printCount: 0,
      createdAt: row.created_at
    }))
  });
});

// GET /api/packs/:id/generate-stream — generate all images for a pack (SSE stream)
router.get('/:id/generate-stream', async (req, res) => {
  const pack = packs.find(p => p.id === req.params.id);
  if (!pack) return res.status(404).json({ error: 'Pack not found' });

  // Check if already cached
  const cacheCheck = await pool.query(
    `SELECT COUNT(*) as count FROM pack_images WHERE pack_id = $1`,
    [pack.id]
  );
  const cachedCount = parseInt(cacheCheck.rows[0].count);

  if (cachedCount >= 24) {
    const cached = await pool.query(
      `SELECT * FROM pack_images WHERE pack_id = $1 ORDER BY position ASC`,
      [pack.id]
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for (const row of cached.rows) {
      const image = {
        id: row.id,
        keyword: row.keyword,
        imageUrl: row.image_url,
        prompt: row.prompt,
        difficulty: row.difficulty,
        ageRange: row.age_range,
        category: row.category,
        downloadCount: 0,
        printCount: 0,
        createdAt: row.created_at
      };
      res.write(`data: ${JSON.stringify({ type: 'image', image })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', total: cached.rows.length })}\n\n`);
    res.end();
    return;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Generating ideas...' })}\n\n`);
    const keywords = await generatePackKeywords(pack);

    res.write(`data: ${JSON.stringify({ type: 'keywords', keywords, total: keywords.length })}\n\n`);

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];

      if (req.destroyed) break;

      res.write(`data: ${JSON.stringify({ type: 'progress', current: i + 1, total: keywords.length, keyword })}\n\n`);

      try {
        const prompt = enhance(keyword, pack.category, pack.difficulty, pack.ageRange);
        const { buffer, mimeType } = await generateImage(prompt);
        const imageFile = await saveImageFromBuffer(buffer, mimeType);

        const id = uuidv4();
        const imageUrl = `/images/${imageFile.filename}`;

        await pool.query(
          `INSERT INTO pack_images (id, pack_id, keyword, image_url, prompt, difficulty, age_range, category, position, image_data, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [id, pack.id, keyword, imageUrl, prompt, pack.difficulty, pack.ageRange, pack.category, i, buffer, mimeType]
        );

        const image = {
          id,
          keyword,
          imageUrl,
          prompt,
          difficulty: pack.difficulty,
          ageRange: pack.ageRange,
          category: pack.category,
          downloadCount: 0,
          printCount: 0,
          createdAt: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify({ type: 'image', image })}\n\n`);

      } catch (err) {
        console.warn(`[Pack] Failed to generate: ${keyword}`, err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', keyword, message: err.message })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', total: keywords.length })}\n\n`);

  } catch (err) {
    console.error('[Pack] Generation error:', err);
    res.write(`data: ${JSON.stringify({ type: 'fatal', message: err.message })}\n\n`);
  }

  res.end();
});

export default router;
