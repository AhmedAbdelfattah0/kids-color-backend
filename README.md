# KidsColor Backend API

Backend server for KidsColor - Free printable coloring pages generator for kids.

## Tech Stack

- Node.js with Express
- SQLite (better-sqlite3)
- Pollinations.ai for image generation
- Sharp for image processing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (already exists with defaults)

3. Start the server:
```bash
npm run dev   # Development with auto-reload
npm start     # Production
```

## API Endpoints

### Generation
- `POST /api/generate` - Generate or retrieve coloring page

### Gallery
- `GET /api/gallery` - Paginated gallery with filters
- `GET /api/gallery/search?keyword=...` - Search for existing images
- `GET /api/gallery/popular` - Most downloaded images
- `GET /api/gallery/recent` - Recently generated images
- `GET /api/gallery/:id` - Get single image with related images
- `POST /api/gallery/:id/download` - Increment download counter
- `POST /api/gallery/:id/print` - Increment print counter
- `GET /api/gallery/stats` - Gallery statistics

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/random` - Get random keyword

### Health
- `GET /health` - Health check

## Database

SQLite database file: `./data/kidscolor.db`
Uploaded images: `./uploads/`

Both directories are created automatically on first run.

## Rate Limiting

Generation endpoint is rate-limited to 10 requests per hour per IP address.

## Environment Variables

See `.env` file for configuration options.
