import axios from 'axios';

// Search OpenClipart API
// NOTE: openclipart.org /search/json/ currently redirects to homepage (API broken).
// Kept for future re-enablement — returns [] gracefully until fixed.
async function searchOpenClipart(keyword) {
  return [];
}

const WIKIMEDIA_HEADERS = {
  'User-Agent': 'KidsColorApp/1.0 (https://kids-color-frontend.vercel.app; contact via github) axios/1.x'
};

// Search Wikimedia Commons API
async function searchWikimedia(keyword) {
  try {
    // Try specific clipart query first, fall back to generic svg if no results
    let response = await axios.get(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword + ' clipart svg')}&srnamespace=6&srlimit=5&format=json&origin=*`,
      { timeout: 10000, headers: WIKIMEDIA_HEADERS }
    );
    let results = response.data?.query?.search || [];

    if (results.length === 0) {
      response = await axios.get(
        `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword + ' svg')}&srnamespace=6&srlimit=5&format=json&origin=*`,
        { timeout: 10000, headers: WIKIMEDIA_HEADERS }
      );
      results = response.data?.query?.search || [];
    }

    // Get image URLs for each result
    const images = await Promise.allSettled(
      results.map(async (result) => {
        const title = result.title;
        const infoResponse = await axios.get(
          `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`,
          { timeout: 10000, headers: WIKIMEDIA_HEADERS }
        );
        const pages = infoResponse.data?.query?.pages || {};
        const page = Object.values(pages)[0];
        const imageInfo = page?.imageinfo?.[0];
        if (!imageInfo) return null;
        // Only accept PNG and SVG
        if (!['image/png', 'image/svg+xml'].includes(imageInfo.mime)) return null;
        return {
          imageUrl: imageInfo.url,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
          title: result.title.replace('File:', ''),
          source: 'wikimedia'
        };
      })
    );

    return images
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
  } catch (err) {
    console.warn('[Library] Wikimedia search failed:', err.message);
    return [];
  }
}

// Main search function — tries both sources
export async function searchLibrary(keyword, category = null) {
  console.log(`[Library] Searching for: ${keyword}`);

  const [openclipartResults, wikimediaResults] = await Promise.allSettled([
    searchOpenClipart(keyword),
    searchWikimedia(keyword)
  ]);

  const results = [
    ...(openclipartResults.status === 'fulfilled' ? openclipartResults.value : []),
    ...(wikimediaResults.status === 'fulfilled' ? wikimediaResults.value : [])
  ];

  console.log(`[Library] Found ${results.length} results for: ${keyword}`);
  return results;
}
