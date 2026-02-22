import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from env or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/kidscolor.db');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Initialize schema
function initializeDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS images (
      id          TEXT PRIMARY KEY,
      keyword     TEXT NOT NULL,
      keyword_normalized TEXT NOT NULL,
      category    TEXT,
      prompt      TEXT NOT NULL,
      filename    TEXT NOT NULL,
      file_path   TEXT NOT NULL,
      file_size   INTEGER,
      width       INTEGER DEFAULT 1024,
      height      INTEGER DEFAULT 1024,
      download_count INTEGER DEFAULT 0,
      print_count    INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      is_active   INTEGER DEFAULT 1
    );
  `;

  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_keyword_normalized ON images(keyword_normalized);',
    'CREATE INDEX IF NOT EXISTS idx_category ON images(category);',
    'CREATE INDEX IF NOT EXISTS idx_created_at ON images(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_download_count ON images(download_count DESC);'
  ];

  try {
    db.exec(createTableSQL);
    createIndexes.forEach(sql => db.exec(sql));
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Initialize on module load
initializeDatabase();

export default db;
