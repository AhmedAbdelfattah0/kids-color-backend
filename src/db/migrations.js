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
    console.log('[DB] Migrations completed successfully');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  }
}
