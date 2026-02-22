import express from 'express';
import { enhancePrompt, normalizeKeyword } from '../services/promptService.js';
import { saveImageFromBuffer } from '../services/imageService.js';
import { insertImage, searchByKeyword } from '../services/galleryService.js';
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
 * Generate a new coloring page or return existing one from gallery
 */
router.post('/', async (req, res) => {
  try {
    const { keyword, category, forceNew = false } = req.body;

    // Validate input
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    if (keyword.length > 100) {
      return res.status(400).json({ error: 'Keyword too long (max 100 characters)' });
    }

    const normalizedKeyword = normalizeKeyword(keyword);

    // Check rate limit only for new generations
    if (forceNew) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600 // 1 hour in seconds
        });
      }
    }

    // Check if image already exists in gallery (unless forceNew is true)
    if (!forceNew) {
      const existingImage = await searchByKeyword(normalizedKeyword, category);
      if (existingImage) {
        return res.json({
          id: existingImage.id,
          keyword: existingImage.keyword,
          category: existingImage.category,
          imageUrl: `/uploads/${existingImage.filename}`,
          prompt: existingImage.prompt,
          downloadCount: existingImage.download_count,
          printCount: existingImage.print_count,
          fromCache: true,
          createdAt: existingImage.created_at
        });
      }
    }

    // Generate new image
    const enhancedPrompt = enhancePrompt(keyword.trim(), category);

    console.log(`Generating image for keyword: "${keyword}" (category: ${category || 'none'})`);

    // Generate image using AI service with automatic fallback
    const { buffer, provider } = await generateImage(enhancedPrompt);
    console.log(`[Generate Route] Image generated using: ${provider}`);

    // Save image from buffer
    const imageFile = await saveImageFromBuffer(buffer);

    // Save to database
    const imageRecord = await insertImage({
      keyword: keyword.trim(),
      keyword_normalized: normalizedKeyword,
      category: category || null,
      prompt: enhancedPrompt,
      filename: imageFile.filename,
      imageUrl: `/uploads/${imageFile.filename}`,
      file_size: imageFile.fileSize,
      width: imageFile.width,
      height: imageFile.height
    });

    res.json({
      id: imageRecord.id,
      keyword: imageRecord.keyword,
      category: imageRecord.category,
      imageUrl: `/uploads/${imageRecord.filename}`,
      prompt: imageRecord.prompt,
      downloadCount: imageRecord.download_count,
      printCount: imageRecord.print_count,
      fromCache: false,
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
