import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// Don't test connection immediately - let it connect lazily
// This prevents blocking server startup if DB is slow or unavailable

export default pool;
