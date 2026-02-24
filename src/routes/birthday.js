import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateImage } from '../services/aiService.js';
import { saveImageFromBuffer } from '../services/imageService.js';
import { getBirthdayKeywords } from '../services/birthdayKeywordService.js';

const router = express.Router();

function buildBirthdayPrompt(keyword, options) {
  const { age } = options;
  return `Black and white coloring page for kids, ${keyword}, birthday themed illustration,
    festive birthday decorations, balloons and stars in background,
    clean bold outlines, white background, no colors, no shading,
    printable coloring book style, child friendly,
    suitable for ${age} year old, fun and celebratory mood, line art only`;
}

// POST /api/birthday/generate — single image
router.post('/generate', async (req, res) => {
  const { childName, age, theme, themeLabel, message } = req.body;

  if (!theme || !childName) {
    return res.status(400).json({ error: 'childName and theme are required' });
  }

  try {
    const keywords = await getBirthdayKeywords(theme, themeLabel || theme, age);
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    const prompt = buildBirthdayPrompt(keyword, { childName, age, theme, message });

    const { buffer, mimeType } = await generateImage(prompt);
    const imageFile = await saveImageFromBuffer(buffer, mimeType);
    const imageUrl = imageFile.publicUrl;

    res.json({
      id: uuidv4(),
      keyword,
      imageUrl,
      prompt,
      childName,
      age,
      theme,
      message,
      downloadCount: 0,
      printCount: 0,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Birthday] Single generation failed:', err);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// GET /api/birthday/generate-pack-stream — SSE stream for full birthday pack
router.get('/generate-pack-stream', async (req, res) => {
  const { childName, age, theme, themeLabel, message } = req.query;

  if (!theme || !childName) {
    return res.status(400).json({ error: 'childName and theme are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    res.write(`data: ${JSON.stringify({ type: 'status', message: `Creating ${childName}'s birthday pack...` })}\n\n`);

    const keywords = await getBirthdayKeywords(theme, themeLabel || theme, parseInt(age));
    const total = keywords.length;

    res.write(`data: ${JSON.stringify({ type: 'status', message: `Generating ${total} birthday pages...` })}\n\n`);

    for (let i = 0; i < keywords.length; i++) {
      if (req.destroyed) break;

      const keyword = keywords[i];
      res.write(`data: ${JSON.stringify({ type: 'progress', current: i + 1, total, keyword })}\n\n`);

      try {
        const prompt = buildBirthdayPrompt(keyword, { childName, age, theme, message });

        const { buffer, mimeType } = await generateImage(prompt);
        const imageFile = await saveImageFromBuffer(buffer, mimeType);
        const imageUrl = imageFile.publicUrl;

        const image = {
          id: uuidv4(),
          keyword,
          imageUrl,
          prompt,
          childName,
          age,
          theme,
          message,
          downloadCount: 0,
          printCount: 0,
          createdAt: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify({ type: 'image', image })}\n\n`);

      } catch (err) {
        console.warn(`[Birthday Pack] Failed: ${keyword}`, err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', keyword, message: err.message })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', total })}\n\n`);

  } catch (err) {
    console.error('[Birthday Pack] Fatal error:', err);
    res.write(`data: ${JSON.stringify({ type: 'fatal', message: err.message })}\n\n`);
  }

  res.end();
});

export default router;
