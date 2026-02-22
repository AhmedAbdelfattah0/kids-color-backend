import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import generateRouter from './routes/generate.js';
import galleryRouter from './routes/gallery.js';
import categoriesRouter from './routes/categories.js';
import { getUploadsPath } from './services/imageService.js';
import { runMigrations } from './db/migrations.js';
import pool from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Static file serving for uploaded images
app.use('/uploads', express.static(getUploadsPath()));

// API Routes
app.use('/api/generate', generateRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/categories', categoriesRouter);

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
      randomKeyword: 'GET /api/categories/random'
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

// Start server with database migrations
async function startServer() {
  try {
    await runMigrations(pool);
    console.log('[DB] Database ready');
  } catch (err) {
    console.error('[DB] Migration error — continuing anyway:', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}

startServer();

export default app;
