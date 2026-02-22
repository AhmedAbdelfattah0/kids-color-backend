import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Insert new image record into database
 */
export function insertImage(imageData) {
  const stmt = db.prepare(`
    INSERT INTO images (
      id, keyword, keyword_normalized, category, prompt,
      filename, file_path, file_size, width, height
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = uuidv4();
  const info = stmt.run(
    id,
    imageData.keyword,
    imageData.keyword_normalized,
    imageData.category || null,
    imageData.prompt,
    imageData.filename,
    imageData.file_path,
    imageData.file_size,
    imageData.width,
    imageData.height
  );

  return getImageById(id);
}

/**
 * Get image by ID
 */
export function getImageById(id) {
  const stmt = db.prepare('SELECT * FROM images WHERE id = ? AND is_active = 1');
  return stmt.get(id);
}

/**
 * Search for existing images by keyword
 */
export function searchByKeyword(keyword, category = null) {
  const normalized = keyword.toLowerCase().trim().replace(/\s+/g, ' ');

  let query = 'SELECT * FROM images WHERE keyword_normalized = ? AND is_active = 1';
  const params = [normalized];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC LIMIT 1';

  const stmt = db.prepare(query);
  return stmt.get(...params);
}

/**
 * Fuzzy search for similar keywords
 */
export function fuzzySearchKeyword(keyword, limit = 5) {
  const normalized = keyword.toLowerCase().trim().replace(/\s+/g, ' ');
  const stmt = db.prepare(`
    SELECT * FROM images
    WHERE keyword_normalized LIKE ? AND is_active = 1
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return stmt.all(`%${normalized}%`, limit);
}

/**
 * Get paginated gallery
 */
export function getGallery({ page = 1, limit = 24, category = null, sort = 'newest', search = null }) {
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM images WHERE is_active = 1';
  const params = [];

  // Category filter
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  // Search filter
  if (search) {
    const normalized = search.toLowerCase().trim().replace(/\s+/g, ' ');
    query += ' AND keyword_normalized LIKE ?';
    params.push(`%${normalized}%`);
  }

  // Sorting
  if (sort === 'popular') {
    query += ' ORDER BY download_count DESC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  // Pagination
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const images = stmt.all(...params);

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM images WHERE is_active = 1';
  const countParams = [];

  if (category) {
    countQuery += ' AND category = ?';
    countParams.push(category);
  }

  if (search) {
    const normalized = search.toLowerCase().trim().replace(/\s+/g, ' ');
    countQuery += ' AND keyword_normalized LIKE ?';
    countParams.push(`%${normalized}%`);
  }

  const countStmt = db.prepare(countQuery);
  const { total } = countStmt.get(...countParams);

  return {
    images,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total
  };
}

/**
 * Get popular images (most downloaded)
 */
export function getPopularImages(limit = 12) {
  const stmt = db.prepare(`
    SELECT * FROM images
    WHERE is_active = 1
    ORDER BY download_count DESC, created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Get recent images
 */
export function getRecentImages(limit = 12) {
  const stmt = db.prepare(`
    SELECT * FROM images
    WHERE is_active = 1
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Get images by category
 */
export function getImagesByCategory(category, limit = 6) {
  const stmt = db.prepare(`
    SELECT * FROM images
    WHERE category = ? AND is_active = 1
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(category, limit);
}

/**
 * Increment download counter
 */
export function incrementDownloadCount(id) {
  const stmt = db.prepare('UPDATE images SET download_count = download_count + 1 WHERE id = ?');
  stmt.run(id);
  return getImageById(id);
}

/**
 * Increment print counter
 */
export function incrementPrintCount(id) {
  const stmt = db.prepare('UPDATE images SET print_count = print_count + 1 WHERE id = ?');
  stmt.run(id);
  return getImageById(id);
}

/**
 * Soft delete image
 */
export function deleteImage(id) {
  const stmt = db.prepare('UPDATE images SET is_active = 0 WHERE id = ?');
  stmt.run(id);
  return true;
}

/**
 * Get database statistics
 */
export function getStats() {
  const totalStmt = db.prepare('SELECT COUNT(*) as total FROM images WHERE is_active = 1');
  const { total } = totalStmt.get();

  const categoriesStmt = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM images
    WHERE is_active = 1 AND category IS NOT NULL
    GROUP BY category
  `);
  const categories = categoriesStmt.all();

  const downloadsStmt = db.prepare('SELECT SUM(download_count) as total FROM images WHERE is_active = 1');
  const { total: totalDownloads } = downloadsStmt.get();

  return {
    totalImages: total,
    totalDownloads: totalDownloads || 0,
    byCategory: categories
  };
}
