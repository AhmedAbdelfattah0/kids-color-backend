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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║         🎨 KidsColor API Server           ║
║                                           ║
║  Server running on port ${PORT}            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                ║
║                                           ║
║  API: http://localhost:${PORT}             ║
║  Health: http://localhost:${PORT}/health   ║
║                                           ║
╚═══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('[DB] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
