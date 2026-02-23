import axios from 'axios';
import FormData from 'form-data';

const TIMEOUT_MS = 15000;
const TIMEOUT_MS_SLOW = 45000; // for providers known to be slower

/**
 * Validate that a buffer is a valid PNG image
 */
function isValidPNG(buffer) {
  return buffer && buffer.length > 1 && buffer[0] === 0x89 && buffer[1] === 0x50;
}

/**
 * 1. Pollinations.ai - FLUX model (requires POLLINATIONS_API_KEY)
 */
async function tryPollinationsFlux(prompt) {
  if (!process.env.POLLINATIONS_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT_MS_SLOW,
      headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` }
    });
    const buffer = Buffer.from(response.data);
    const mimeType = response.headers['content-type']?.split(';')[0]?.trim() || 'image/jpeg';

    if (buffer.length < 100) throw new Error('Response too small to be a valid image');

    return { buffer, mimeType, providerName: 'Pollinations.ai', modelUsed: 'FLUX' };
  } catch (err) {
    console.warn(`[AI] Provider Pollinations-FLUX failed: ${err.message}`);
    throw err;
  }
}

/**
 * 2. Pollinations.ai - Turbo model (requires POLLINATIONS_API_KEY)
 */
async function tryPollinationsTurbo(prompt) {
  if (!process.env.POLLINATIONS_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=turbo`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT_MS_SLOW,
      headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` }
    });
    const buffer = Buffer.from(response.data);
    const mimeType = response.headers['content-type']?.split(';')[0]?.trim() || 'image/jpeg';

    if (buffer.length < 100) throw new Error('Response too small to be a valid image');

    return { buffer, mimeType, providerName: 'Pollinations.ai', modelUsed: 'Turbo' };
  } catch (err) {
    console.warn(`[AI] Provider Pollinations-Turbo failed: ${err.message}`);
    throw err;
  }
}

/**
 * 3. fal.ai - FLUX.1-schnell (requires FAL_API_KEY)
 */
async function tryFal(prompt) {
  if (!process.env.FAL_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.post(
      'https://fal.run/fal-ai/flux/schnell',
      {
        prompt: prompt,
        image_size: 'square',
        num_inference_steps: 4,
        num_images: 1
      },
      {
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUT_MS
      }
    );

    // fal.ai returns JSON with image URL
    if (response.data && response.data.images && response.data.images.length > 0) {
      const imageUrl = response.data.images[0].url;

      // Download the image from the URL
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS
      });

      const buffer = Buffer.from(imageResponse.data);

      if (!isValidPNG(buffer)) {
        throw new Error('Invalid PNG response');
      }

      return { buffer, mimeType: 'image/png', providerName: 'fal.ai', modelUsed: 'FLUX.1-schnell' };
    }

    throw new Error('No images returned from fal.ai');
  } catch (err) {
    console.warn(`[AI] Provider fal.ai failed: ${err.message}`);
    throw err;
  }
}

/**
 * 4-6. Hugging Face providers - Currently disabled due to API migration
 * The router.huggingface.co endpoint is undergoing migration and models return 404
 */

/**
 * 7. Together.ai - FLUX.1-schnell-Free (requires TOGETHER_API_KEY)
 */
async function tryTogetherFlux(prompt) {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.together.xyz/v1/images/generations',
      {
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt: prompt,
        width: 1024,
        height: 1024,
        n: 1
      },
      {
        headers: { Authorization: `Bearer ${process.env.TOGETHER_API_KEY}` },
        timeout: TIMEOUT_MS
      }
    );
    const buffer = Buffer.from(response.data.data[0].b64_json, 'base64');

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Together.ai', modelUsed: 'FLUX.1-schnell-Free' };
  } catch (err) {
    console.warn(`[AI] Provider Together-FLUX failed: ${err.message}`);
    throw err;
  }
}

/**
 * 8. Together.ai - Stable Diffusion XL (requires TOGETHER_API_KEY)
 */
async function tryTogetherSDXL(prompt) {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.together.xyz/v1/images/generations',
      {
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt: prompt,
        width: 1024,
        height: 1024,
        n: 1
      },
      {
        headers: { Authorization: `Bearer ${process.env.TOGETHER_API_KEY}` },
        timeout: TIMEOUT_MS
      }
    );
    const buffer = Buffer.from(response.data.data[0].b64_json, 'base64');

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Together.ai', modelUsed: 'Stable Diffusion XL' };
  } catch (err) {
    console.warn(`[AI] Provider Together-SDXL failed: ${err.message}`);
    throw err;
  }
}

/**
 * 9. Segmind - FLUX schnell (requires SEGMIND_API_KEY)
 */
async function trySegmindFlux(prompt) {
  if (!process.env.SEGMIND_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.segmind.com/v1/flux-schnell',
      {
        prompt: prompt,
        steps: 4,
        seed: Math.floor(Math.random() * 99999),
        sampler_name: 'euler',
        scheduler: 'simple',
        samples: 1,
        width: 1024,
        height: 1024,
        base64: false
      },
      {
        headers: { 'x-api-key': process.env.SEGMIND_API_KEY },
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS
      }
    );
    const buffer = Buffer.from(response.data);

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Segmind', modelUsed: 'FLUX-schnell' };
  } catch (err) {
    console.warn(`[AI] Provider Segmind-FLUX failed: ${err.message}`);
    throw err;
  }
}

/**
 * 10. Segmind - SDXL (requires SEGMIND_API_KEY)
 */
async function trySegmindSDXL(prompt) {
  if (!process.env.SEGMIND_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.segmind.com/v1/sdxl1.0-txt2img',
      {
        prompt: prompt,
        steps: 4,
        seed: Math.floor(Math.random() * 99999),
        sampler_name: 'euler',
        scheduler: 'simple',
        samples: 1,
        width: 1024,
        height: 1024,
        base64: false
      },
      {
        headers: { 'x-api-key': process.env.SEGMIND_API_KEY },
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS
      }
    );
    const buffer = Buffer.from(response.data);

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Segmind', modelUsed: 'SDXL 1.0' };
  } catch (err) {
    console.warn(`[AI] Provider Segmind-SDXL failed: ${err.message}`);
    throw err;
  }
}

/**
 * 11. DeepAI (requires DEEPAI_API_KEY)
 */
async function tryDeepAI(prompt) {
  if (!process.env.DEEPAI_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const formData = new FormData();
    formData.append('text', prompt);

    const response = await axios.post(
      'https://api.deepai.org/api/text2img',
      formData,
      {
        headers: {
          'api-key': process.env.DEEPAI_API_KEY,
          ...formData.getHeaders()
        },
        timeout: TIMEOUT_MS
      }
    );

    const imageResponse = await axios.get(response.data.output_url, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT_MS
    });
    const buffer = Buffer.from(imageResponse.data);

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'DeepAI', modelUsed: 'Text2Image' };
  } catch (err) {
    console.warn(`[AI] Provider DeepAI failed: ${err.message}`);
    throw err;
  }
}

/**
 * 12. Getimg.ai (requires GETIMG_API_KEY)
 */
async function tryGetimg(prompt) {
  if (!process.env.GETIMG_API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.getimg.ai/v1/stable-diffusion-xl/text-to-image',
      {
        prompt: prompt,
        width: 1024,
        height: 1024,
        output_format: 'png'
      },
      {
        headers: { Authorization: `Bearer ${process.env.GETIMG_API_KEY}` },
        timeout: TIMEOUT_MS
      }
    );
    const buffer = Buffer.from(response.data.image, 'base64');

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Getimg.ai', modelUsed: 'Stable Diffusion XL' };
  } catch (err) {
    console.warn(`[AI] Provider Getimg failed: ${err.message}`);
    throw err;
  }
}

/**
 * 13. Replicate - FLUX.1-schnell (requires REPLICATE_API_TOKEN)
 */
async function tryReplicate(prompt) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('API key not configured');
  }

  try {
    const prediction = await axios.post(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        input: {
          prompt: prompt,
          num_outputs: 1,
          output_format: 'png',
          width: 1024,
          height: 1024
        }
      },
      {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
        timeout: TIMEOUT_MS
      }
    );

    const predictionId = prediction.data.id;
    let imageUrl = null;
    const startTime = Date.now();

    while (Date.now() - startTime < 60000) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        { headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` } }
      );

      if (status.data.status === 'succeeded') {
        imageUrl = status.data.output[0];
        break;
      }
      if (status.data.status === 'failed') throw new Error('Replicate prediction failed');
    }

    if (!imageUrl) throw new Error('Replicate timeout');

    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: TIMEOUT_MS });
    const buffer = Buffer.from(imageResponse.data);

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Replicate', modelUsed: 'FLUX.1-schnell' };
  } catch (err) {
    console.warn(`[AI] Provider Replicate failed: ${err.message}`);
    throw err;
  }
}

/**
 * 14. Craiyon (no key needed, last resort)
 */
async function tryCraiyon(prompt) {
  try {
    const response = await axios.post(
      'https://backend.craiyon.com/generate',
      { prompt: prompt },
      { timeout: 60000 }
    );
    const buffer = Buffer.from(response.data.images[0], 'base64');

    if (!isValidPNG(buffer)) {
      throw new Error('Invalid PNG response');
    }

    return { buffer, mimeType: 'image/png', providerName: 'Craiyon', modelUsed: 'Craiyon v3' };
  } catch (err) {
    console.warn(`[AI] Provider Craiyon failed: ${err.message}`);
    throw err;
  }
}

/**
 * Main function to generate image with automatic fallback chain
 */
export async function generateImage(prompt) {
  const providers = [
    { name: 'Pollinations-FLUX', fn: tryPollinationsFlux, requiresKey: false },
    { name: 'Pollinations-Turbo', fn: tryPollinationsTurbo, requiresKey: false },
    { name: 'fal.ai', fn: tryFal, requiresKey: true },
    // Hugging Face providers temporarily disabled due to API migration
    { name: 'Together-FLUX', fn: tryTogetherFlux, requiresKey: true },
    { name: 'Together-SDXL', fn: tryTogetherSDXL, requiresKey: true },
    { name: 'Segmind-FLUX', fn: trySegmindFlux, requiresKey: true },
    { name: 'Segmind-SDXL', fn: trySegmindSDXL, requiresKey: true },
    { name: 'DeepAI', fn: tryDeepAI, requiresKey: true },
    { name: 'Getimg', fn: tryGetimg, requiresKey: true },
    { name: 'Replicate', fn: tryReplicate, requiresKey: true },
    { name: 'Craiyon', fn: tryCraiyon, requiresKey: false }
  ];

  for (const provider of providers) {
    try {
      const result = await provider.fn(prompt);
      console.log(`[AI] Success with: ${result.providerName} - ${result.modelUsed}`);
      return result;
    } catch (err) {
      // Errors are already logged in individual provider functions
      continue;
    }
  }

  throw new Error('All AI providers are currently unavailable. Please try again in a few minutes.');
}

/**
 * Get status of all AI providers
 */
export function getProvidersStatus() {
  return {
    providers: [
      { name: 'pollinations-flux', keyRequired: true, configured: !!process.env.POLLINATIONS_API_KEY },
      { name: 'pollinations-turbo', keyRequired: true, configured: !!process.env.POLLINATIONS_API_KEY },
      { name: 'fal-flux', keyRequired: true, configured: !!process.env.FAL_API_KEY },
      { name: 'together-flux', keyRequired: true, configured: !!process.env.TOGETHER_API_KEY },
      { name: 'together-sdxl', keyRequired: true, configured: !!process.env.TOGETHER_API_KEY },
      { name: 'segmind-flux', keyRequired: true, configured: !!process.env.SEGMIND_API_KEY },
      { name: 'segmind-sdxl', keyRequired: true, configured: !!process.env.SEGMIND_API_KEY },
      { name: 'deepai', keyRequired: true, configured: !!process.env.DEEPAI_API_KEY },
      { name: 'getimg', keyRequired: true, configured: !!process.env.GETIMG_API_KEY },
      { name: 'replicate-flux', keyRequired: true, configured: !!process.env.REPLICATE_API_TOKEN },
      { name: 'craiyon', keyRequired: false, configured: true }
    ]
  };
}
