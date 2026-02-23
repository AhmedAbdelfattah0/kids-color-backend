import pool from '../db/database.js';
import { runMigrations } from '../db/migrations.js';
import { searchLibrary } from '../services/libraryService.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const keywords = {
  animals: ['lion', 'elephant', 'dolphin', 'giraffe', 'penguin', 'rabbit', 'tiger', 'bear', 'cat', 'dog', 'horse', 'monkey'],
  vehicles: ['rocket', 'train', 'boat', 'helicopter', 'bicycle', 'truck', 'car', 'airplane', 'bus', 'submarine'],
  fantasy: ['dragon', 'unicorn', 'fairy', 'wizard', 'mermaid', 'phoenix', 'castle', 'knight'],
  nature: ['flower', 'tree', 'butterfly', 'mountain', 'rainbow', 'waterfall', 'sun', 'cloud', 'leaf'],
  space: ['astronaut', 'planet', 'alien', 'satellite', 'moon', 'comet', 'star', 'ufo'],
  food: ['pizza', 'cake', 'ice cream', 'burger', 'cupcake', 'apple', 'strawberry'],
  holidays: ['christmas tree', 'pumpkin', 'snowman', 'heart', 'star'],
  characters: ['robot', 'princess', 'superhero', 'pirate', 'knight', 'ninja']
};

const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000
  });
  return Buffer.from(response.data);
}

async function seedKeyword(keyword, category) {
  // Check if already seeded
  const existing = await pool.query(
    'SELECT id FROM images WHERE keyword_normalized = $1 LIMIT 1',
    [keyword.toLowerCase().trim()]
  );
  if (existing.rows.length > 0) {
    console.log(`[Seed] Skipping ${keyword} — already exists`);
    return;
  }

  const results = await searchLibrary(keyword, category);
  if (results.length === 0) {
    console.log(`[Seed] No results found for: ${keyword}`);
    return;
  }

  // Take first valid result
  const result = results[0];

  try {
    const buffer = await downloadImage(result.imageUrl);
    const filename = `${uuidv4()}.png`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    await pool.query(
      `INSERT INTO images (id, keyword, keyword_normalized, category, prompt, filename, image_url, file_size, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [
        uuidv4(),
        keyword,
        keyword.toLowerCase().trim(),
        category,
        `library result for: ${keyword}`,
        filename,
        result.imageUrl,
        buffer.length,
        result.source
      ]
    );
    console.log(`[Seed] ✓ Seeded: ${keyword} from ${result.source}`);
  } catch (err) {
    console.warn(`[Seed] Failed to seed ${keyword}:`, err.message);
  }
}

async function runSeed() {
  await runMigrations(pool);
  console.log('[Seed] Starting library seed...');

  for (const [category, words] of Object.entries(keywords)) {
    for (const keyword of words) {
      await seedKeyword(keyword, category);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('[Seed] Library seed complete');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
