import express from 'express';
import { enhancePrompt, normalizeKeyword } from '../services/promptService.js';
import { saveImageFromBuffer } from '../services/imageService.js';
import { insertImage } from '../services/galleryService.js';
import { generateImage } from '../services/aiService.js';

const router = express.Router();

// Rate limiting - simple in-memory store
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // 10 requests per hour per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(ip) || [];

  // Filter out old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  return true;
}

// Clean up old rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of rateLimitStore.entries()) {
    const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    if (recentRequests.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recentRequests);
    }
  }
}, 10 * 60 * 1000);

/**
 * POST /api/generate
 * Always generates a fresh image via AI and stores it in the DB.
 */
router.post('/', async (req, res) => {
  try {
    const { keyword, category } = req.body;

    // Validate input
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    if (keyword.length > 100) {
      return res.status(400).json({ error: 'Keyword too long (max 100 characters)' });
    }

    const normalizedKeyword = normalizeKeyword(keyword);

    // Rate limiting — all requests count
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 3600
      });
    }

    // AI generation
    const enhancedPrompt = enhancePrompt(keyword.trim(), category);
    console.log(`[Generate] Calling AI for: ${keyword}`);

    const { buffer, mimeType, providerName, modelUsed } = await generateImage(enhancedPrompt);
    console.log(`[Generate] Image generated using: ${providerName} - ${modelUsed}`);

    const imageFile = await saveImageFromBuffer(buffer, mimeType);
    const imageRecord = await insertImage({
      keyword: keyword.trim(),
      keyword_normalized: normalizedKeyword,
      category: category || null,
      prompt: enhancedPrompt,
      filename: imageFile.filename,
      imageUrl: `/images/${imageFile.filename}`,
      file_size: imageFile.fileSize,
      width: imageFile.width,
      height: imageFile.height,
      source: 'ai',
      image_data: buffer,
      mime_type: imageFile.mimeType
    });

    res.json({
      id: imageRecord.id,
      keyword: imageRecord.keyword,
      category: imageRecord.category,
      imageUrl: `/images/${imageRecord.filename}`,
      prompt: imageRecord.prompt,
      downloadCount: imageRecord.download_count,
      printCount: imageRecord.print_count,
      source: imageRecord.source,
      fromCache: false,
      fromLibrary: false,
      providerUsed: providerName,
      createdAt: imageRecord.created_at
    });

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      message: error.message
    });
  }
});

export default router;
