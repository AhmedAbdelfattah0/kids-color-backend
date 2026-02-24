import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import generateRouter from './routes/generate.js';
import galleryRouter from './routes/gallery.js';
import categoriesRouter from './routes/categories.js';
import providersRouter from './routes/providers.js';
import libraryRouter from './routes/library.js';
import imagesRouter from './routes/images.js';
import packsRouter from './routes/packs.js';
import { runMigrations } from './db/migrations.js';
import pool from './db/database.js';

console.log('[App] Starting KidsColor backend...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('[App] Port:', PORT);
console.log('[App] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('[App] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');

// Health check endpoint - defined first to respond immediately
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// CORS configuration: Allow both production frontend URL and local development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:4200'
].filter(Boolean);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Migration setup for production (Vercel serverless)
let migrationsCompleted = false;
let migrationPromise = null;

function ensureMigrations() {
  if (!migrationPromise) {
    migrationPromise = runMigrations(pool)
      .then(() => {
        migrationsCompleted = true;
        console.log('[DB] Migrations completed');
      })
      .catch(err => {
        console.error('[DB] Migration error:', err.message);
        throw err;
      });
  }
  return migrationPromise;
}

// Middleware to ensure migrations run before any API request in production
if (process.env.NODE_ENV === 'production') {
  app.use(async (req, res, next) => {
    if (!migrationsCompleted) {
      try {
        await ensureMigrations();
      } catch (err) {
        return res.status(503).json({
          error: 'Database not ready',
          message: 'Migrations failed'
        });
      }
    }
    next();
  });
}

// Static file serving for uploaded images
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'uploads');

app.use('/uploads', express.static(uploadsDir));

// Image serving from DB (Vercel-safe — no ephemeral /tmp dependency)
app.use('/images', imagesRouter);

// API Routes
app.use('/api/generate', generateRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/providers', providersRouter);
app.use('/api/library', libraryRouter);
app.use('/api/packs', packsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'KidsColor API',
    version: '1.0.0',
    description: 'Free printable coloring pages generator for kids',
    endpoints: {
      health: '/health',
      generate: 'POST /api/generate',
      gallery: 'GET /api/gallery',
      gallerySearch: 'GET /api/gallery/search',
      galleryPopular: 'GET /api/gallery/popular',
      galleryRecent: 'GET /api/gallery/recent',
      categories: 'GET /api/categories',
      randomKeyword: 'GET /api/categories/random',
      providersStatus: 'GET /api/providers/status',
      librarySearch: 'GET /api/library/search'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Only listen when running locally, not on Vercel
if (process.env.NODE_ENV !== 'production') {
  async function startServer() {
    try {
      await runMigrations(pool);
      console.log('[DB] Database ready');
    } catch (err) {
      console.error('[DB] Migration error:', err.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  }
  startServer();
}

export default app;
