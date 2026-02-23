import express from 'express';
import { enhancePrompt, normalizeKeyword } from '../services/promptService.js';
import { saveImageFromBuffer, saveImageFromUrl } from '../services/imageService.js';
import { insertImage, searchByKeyword } from '../services/galleryService.js';
import { generateImage } from '../services/aiService.js';
import { searchLibrary } from '../services/libraryService.js';

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
 * Hybrid flow: database cache → library → AI as last resort
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

    // Check rate limit only for forced new generations (bypasses cache and library)
    if (forceNew) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600 // 1 hour in seconds
        });
      }
    }

    // Step 1 — Check database cache
    if (!forceNew) {
      const cached = await searchByKeyword(normalizedKeyword, category);
      if (cached) {
        console.log(`[Generate] Cache hit for: ${keyword}`);
        return res.json({
          id: cached.id,
          keyword: cached.keyword,
          category: cached.category,
          imageUrl: `/uploads/${cached.filename}`,
          prompt: cached.prompt,
          downloadCount: cached.download_count,
          printCount: cached.print_count,
          source: cached.source,
          fromCache: true,
          createdAt: cached.created_at
        });
      }
    }

    // Step 2 — Search library
    if (!forceNew) {
      console.log(`[Generate] Cache miss — searching library for: ${keyword}`);
      const libraryResults = await searchLibrary(keyword.trim(), category);
      if (libraryResults.length > 0) {
        const result = libraryResults[0];
        const imageFile = await saveImageFromUrl(result.imageUrl, keyword.trim(), category, result.source);
        const imageRecord = await insertImage({
          keyword: keyword.trim(),
          keyword_normalized: normalizedKeyword,
          category: category || null,
          prompt: `library result for: ${keyword.trim()}`,
          filename: imageFile.filename,
          imageUrl: imageFile.publicUrl,
          file_size: imageFile.fileSize,
          width: null,
          height: null,
          source: result.source
        });
        console.log(`[Generate] Library hit for: ${keyword} from ${result.source}`);
        return res.json({
          id: imageRecord.id,
          keyword: imageRecord.keyword,
          category: imageRecord.category,
          imageUrl: imageFile.publicUrl,
          prompt: imageRecord.prompt,
          downloadCount: imageRecord.download_count,
          printCount: imageRecord.print_count,
          source: imageRecord.source,
          fromCache: false,
          fromLibrary: true,
          createdAt: imageRecord.created_at
        });
      }
    }

    // Step 3 — AI generation as last resort
    const enhancedPrompt = enhancePrompt(keyword.trim(), category);
    console.log(`[Generate] Library miss — calling AI for: ${keyword}`);

    const { buffer, providerName, modelUsed } = await generateImage(enhancedPrompt);
    console.log(`[Generate] Image generated using: ${providerName} - ${modelUsed}`);

    const imageFile = await saveImageFromBuffer(buffer);
    const imageRecord = await insertImage({
      keyword: keyword.trim(),
      keyword_normalized: normalizedKeyword,
      category: category || null,
      prompt: enhancedPrompt,
      filename: imageFile.filename,
      imageUrl: `/uploads/${imageFile.filename}`,
      file_size: imageFile.fileSize,
      width: imageFile.width,
      height: imageFile.height,
      source: 'ai'
    });

    res.json({
      id: imageRecord.id,
      keyword: imageRecord.keyword,
      category: imageRecord.category,
      imageUrl: `/uploads/${imageRecord.filename}`,
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
