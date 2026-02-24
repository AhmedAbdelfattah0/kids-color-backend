export async function runMigrations(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id                TEXT PRIMARY KEY,
        keyword           TEXT NOT NULL,
        keyword_normalized TEXT NOT NULL,
        category          TEXT,
        prompt            TEXT NOT NULL,
        filename          TEXT NOT NULL,
        image_url         TEXT NOT NULL,
        file_size         INTEGER,
        width             INTEGER DEFAULT 1024,
        height            INTEGER DEFAULT 1024,
        download_count    INTEGER DEFAULT 0,
        print_count       INTEGER DEFAULT 0,
        created_at        TIMESTAMP DEFAULT NOW(),
        is_active         BOOLEAN DEFAULT TRUE
      );

      CREATE INDEX IF NOT EXISTS idx_keyword_normalized ON images(keyword_normalized);
      CREATE INDEX IF NOT EXISTS idx_category ON images(category);
      CREATE INDEX IF NOT EXISTS idx_created_at ON images(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_download_count ON images(download_count DESC);
    `);

    await pool.query(`
      ALTER TABLE images ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai';
    `);

    await pool.query(`
      ALTER TABLE images ADD COLUMN IF NOT EXISTS image_data BYTEA;
    `);

    await pool.query(`
      ALTER TABLE images ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/png';
    `);

    await pool.query(`
      ALTER TABLE images ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
    `);

    await pool.query(`
      ALTER TABLE images ADD COLUMN IF NOT EXISTS age_range TEXT DEFAULT '5-8';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pack_images (
        id TEXT PRIMARY KEY,
        pack_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        image_url TEXT NOT NULL,
        prompt TEXT,
        difficulty TEXT,
        age_range TEXT,
        category TEXT,
        position INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_pack_images_pack_id ON pack_images(pack_id);
    `);

    await pool.query(`
      ALTER TABLE pack_images ADD COLUMN IF NOT EXISTS image_data BYTEA;
    `);

    await pool.query(`
      ALTER TABLE pack_images ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/png';
    `);

    console.log('[DB] Migrations completed successfully');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  }
}
