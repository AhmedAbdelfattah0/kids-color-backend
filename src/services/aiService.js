import axios from 'axios';

const TIMEOUT_MS = 10000; // 10 seconds
const HUGGING_FACE_MODEL = 'black-forest-labs/FLUX.1-schnell';
const HUGGING_FACE_API_URL = `https://router.huggingface.co/models/${HUGGING_FACE_MODEL}`;

/**
 * Try to generate image using Pollinations.ai
 */
async function tryPollinations(prompt) {
  try {
    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

    console.log('[AI Service] Trying Pollinations.ai...');

    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      timeout: TIMEOUT_MS
    });

    console.log('[AI Service] ✓ Pollinations.ai succeeded');
    return {
      success: true,
      buffer: Buffer.from(response.data),
      provider: 'Pollinations.ai'
    };
  } catch (error) {
    console.log(`[AI Service] ✗ Pollinations.ai failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Try to generate image using Hugging Face Inference API
 */
async function tryHuggingFace(prompt) {
  const apiToken = process.env.HUGGING_FACE_API_TOKEN;

  if (!apiToken || apiToken.trim() === '') {
    console.log('[AI Service] ✗ Hugging Face skipped: No API token configured');
    return {
      success: false,
      error: 'No Hugging Face API token configured'
    };
  }

  try {
    console.log('[AI Service] Trying Hugging Face...');

    const response = await axios({
      method: 'POST',
      url: HUGGING_FACE_API_URL,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        inputs: prompt,
        parameters: {
          width: 1024,
          height: 1024,
          num_inference_steps: 4 // FLUX.1-schnell is optimized for 4 steps
        }
      },
      responseType: 'arraybuffer',
      timeout: TIMEOUT_MS
    });

    console.log('[AI Service] ✓ Hugging Face succeeded');
    return {
      success: true,
      buffer: Buffer.from(response.data),
      provider: 'Hugging Face (FLUX.1-schnell)'
    };
  } catch (error) {
    console.log(`[AI Service] ✗ Hugging Face failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Try to generate image using fal.ai
 */
async function tryFal(prompt) {
  const apiKey = process.env.FAL_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.log('[AI Service] ✗ fal.ai skipped: No API key configured');
    return {
      success: false,
      error: 'No fal.ai API key configured'
    };
  }

  try {
    console.log('[AI Service] Trying fal.ai...');

    const response = await axios({
      method: 'POST',
      url: 'https://fal.run/fal-ai/flux/schnell',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        prompt: prompt,
        image_size: 'square',
        num_inference_steps: 4,
        num_images: 1
      },
      timeout: TIMEOUT_MS
    });

    // fal.ai returns JSON with image URL
    if (response.data && response.data.images && response.data.images.length > 0) {
      const imageUrl = response.data.images[0].url;

      // Download the image from the URL
      const imageResponse = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS
      });

      console.log('[AI Service] ✓ fal.ai succeeded');
      return {
        success: true,
        buffer: Buffer.from(imageResponse.data),
        provider: 'fal.ai (FLUX.1-schnell)'
      };
    }

    throw new Error('No images returned from fal.ai');
  } catch (error) {
    console.log(`[AI Service] ✗ fal.ai failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate image with automatic fallback
 * Tries Pollinations → Hugging Face → fal.ai
 *
 * @param {string} prompt - The enhanced prompt for image generation
 * @returns {Promise<{buffer: Buffer, provider: string}>}
 * @throws {Error} If all providers fail
 */
export async function generateImage(prompt) {
  console.log('[AI Service] Starting image generation with fallback chain');

  // Try Pollinations first (fastest, free)
  const pollinationsResult = await tryPollinations(prompt);
  if (pollinationsResult.success) {
    return {
      buffer: pollinationsResult.buffer,
      provider: pollinationsResult.provider
    };
  }

  // Try Hugging Face as second fallback
  const huggingFaceResult = await tryHuggingFace(prompt);
  if (huggingFaceResult.success) {
    return {
      buffer: huggingFaceResult.buffer,
      provider: huggingFaceResult.provider
    };
  }

  // Try fal.ai as third fallback
  const falResult = await tryFal(prompt);
  if (falResult.success) {
    return {
      buffer: falResult.buffer,
      provider: falResult.provider
    };
  }

  // All providers failed
  console.log('[AI Service] ✗ All providers failed');

  // Build error message based on what was tried
  const triedProviders = [];
  if (!pollinationsResult.success) triedProviders.push('Pollinations.ai');
  if (!huggingFaceResult.error?.includes('No Hugging Face')) triedProviders.push('Hugging Face');
  if (!falResult.error?.includes('No fal.ai')) triedProviders.push('fal.ai');

  throw new Error(
    `All image generation providers are currently unavailable (tried: ${triedProviders.join(', ')}). ` +
    'Please try again in a few moments.'
  );
}
