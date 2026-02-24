/**
 * Migrate existing BYTEA images from PostgreSQL to Cloudflare R2.
 *
 * For each row in `images` and `pack_images` that has image_data (binary),
 * this script uploads the buffer to R2, updates image_url to the R2 public URL,
 * and nulls out image_data to free DB space.
 *
 * Run once after deploying R2 support:
 *   npm run migrate-r2
 */

import 'dotenv/config';
import path from 'path';
import pool from '../db/database.js';
import { uploadToR2 } from '../services/r2Service.js';

const BATCH_SIZE = 10;

async function migrateImages() {
  let migrated = 0;
  let offset = 0;

  while (true) {
    const result = await pool.query(
      `SELECT id, filename, image_url, image_data, mime_type
       FROM images
       WHERE image_data IS NOT NULL
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );

    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      try {
        const mimeType = row.mime_type || 'image/png';
        const { publicUrl } = await uploadToR2(row.image_data, mimeType, row.filename);

        await pool.query(
          `UPDATE images SET image_url = $1, image_data = NULL WHERE id = $2`,
          [publicUrl, row.id]
        );

        console.log(`[images] ${row.filename} → ${publicUrl}`);
        migrated++;
      } catch (err) {
        console.error(`[images] Failed for ${row.id}: ${err.message}`);
      }
    }

    offset += BATCH_SIZE;
  }

  return migrated;
}

async function migratePackImages() {
  let migrated = 0;
  let offset = 0;

  while (true) {
    // pack_images has no filename column — extract it from image_url
    const result = await pool.query(
      `SELECT id, image_url, image_data, mime_type
       FROM pack_images
       WHERE image_data IS NOT NULL
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );

    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      try {
        const mimeType = row.mime_type || 'image/png';
        // Derive filename from image_url, e.g. "/images/abc.png" → "abc.png"
        const key = path.basename(row.image_url);
        const { publicUrl } = await uploadToR2(row.image_data, mimeType, key);

        await pool.query(
          `UPDATE pack_images SET image_url = $1, image_data = NULL WHERE id = $2`,
          [publicUrl, row.id]
        );

        console.log(`[pack_images] ${key} → ${publicUrl}`);
        migrated++;
      } catch (err) {
        console.error(`[pack_images] Failed for ${row.id}: ${err.message}`);
      }
    }

    offset += BATCH_SIZE;
  }

  return migrated;
}

async function run() {
  console.log('Starting R2 migration...\n');

  const imagesCount = await migrateImages();
  console.log(`\nMigrated ${imagesCount} rows from images table.`);

  const packImagesCount = await migratePackImages();
  console.log(`Migrated ${packImagesCount} rows from pack_images table.`);

  console.log('\nMigration complete.');
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
