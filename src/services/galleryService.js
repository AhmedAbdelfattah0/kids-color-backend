import pool from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Insert new image record into database
 */
export async function insertImage(imageData) {
  const id = uuidv4();

  const query = `
    INSERT INTO images (
      id, keyword, keyword_normalized, category, prompt,
      filename, image_url, file_size, width, height, source, image_data, mime_type,
      difficulty, age_range
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id, keyword, keyword_normalized, category, prompt,
              filename, image_url, file_size, width, height, source,
              download_count, print_count, created_at, is_active, mime_type,
              difficulty, age_range
  `;

  const values = [
    id,
    imageData.keyword,
    imageData.keyword_normalized,
    imageData.category || null,
    imageData.prompt,
    imageData.filename,
    imageData.imageUrl,
    imageData.file_size,
    imageData.width,
    imageData.height,
    imageData.source || 'ai',
    imageData.image_data || null,
    imageData.mime_type || 'image/png',
    imageData.difficulty || 'medium',
    imageData.age_range || '5-8'
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get image binary data by filename (for serving images from DB)
 */
export async function getImageByFilename(filename) {
  const query = 'SELECT id, filename, image_data, mime_type FROM images WHERE filename = $1 AND is_active = TRUE';
  const result = await pool.query(query, [filename]);
  return result.rows[0] || null;
}

/**
 * Get image by ID
 */
export async function getImageById(id) {
  const query = 'SELECT * FROM images WHERE id = $1 AND is_active = TRUE';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Search for existing images by keyword
 */
export async function searchByKeyword(keyword, category = null) {
  const normalized = keyword.toLowerCase().trim().replace(/\s+/g, ' ');

  let query = 'SELECT * FROM images WHERE keyword_normalized = $1 AND is_active = TRUE';
  const params = [normalized];

  if (category) {
    query += ' AND category = $2';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC LIMIT 1';

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

/**
 * Fuzzy search for similar keywords
 */
export async function fuzzySearchKeyword(keyword, limit = 5) {
  const normalized = keyword.toLowerCase().trim().replace(/\s+/g, ' ');
  const query = `
    SELECT * FROM images
    WHERE keyword_normalized LIKE $1 AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [`%${normalized}%`, limit]);
  return result.rows;
}

/**
 * Get paginated gallery
 */
export async function getGallery({ page = 1, limit = 24, category = null, sort = 'newest', search = null, source = null, exclude = null, difficulty = null, ageRange = null }) {
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM images WHERE is_active = TRUE';
  const params = [];
  let paramCount = 1;

  // Category filter
  if (category) {
    query += ` AND category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }

  // Search filter
  if (search) {
    const normalized = search.toLowerCase().trim().replace(/\s+/g, ' ');
    query += ` AND keyword_normalized LIKE $${paramCount}`;
    params.push(`%${normalized}%`);
    paramCount++;
  }

  // Exclude specific image by id
  if (exclude) {
    query += ` AND id != $${paramCount}`;
    params.push(exclude);
    paramCount++;
  }

  // Source filter
  if (source === 'ai') {
    query += ` AND source = 'ai'`;
  } else if (source === 'library') {
    query += ` AND source IN ('openclipart', 'wikimedia', 'library')`;
  }

  // Difficulty filter
  if (difficulty) {
    query += ` AND difficulty = $${paramCount}`;
    params.push(difficulty);
    paramCount++;
  }

  // Age range filter
  if (ageRange) {
    query += ` AND age_range = $${paramCount}`;
    params.push(ageRange);
    paramCount++;
  }

  // Sorting
  if (sort === 'popular') {
    query += ' ORDER BY download_count DESC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  // Pagination
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  const images = result.rows;

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM images WHERE is_active = TRUE';
  const countParams = [];
  let countParamCount = 1;

  if (category) {
    countQuery += ` AND category = $${countParamCount}`;
    countParams.push(category);
    countParamCount++;
  }

  if (search) {
    const normalized = search.toLowerCase().trim().replace(/\s+/g, ' ');
    countQuery += ` AND keyword_normalized LIKE $${countParamCount}`;
    countParams.push(`%${normalized}%`);
  }

  if (source === 'ai') {
    countQuery += ` AND source = 'ai'`;
  } else if (source === 'library') {
    countQuery += ` AND source IN ('openclipart', 'wikimedia', 'library')`;
  }

  if (difficulty) {
    countQuery += ` AND difficulty = $${countParamCount}`;
    countParams.push(difficulty);
    countParamCount++;
  }

  if (ageRange) {
    countQuery += ` AND age_range = $${countParamCount}`;
    countParams.push(ageRange);
    countParamCount++;
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

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
export async function getPopularImages(limit = 12) {
  const query = `
    SELECT * FROM images
    WHERE is_active = TRUE
    ORDER BY download_count DESC, created_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Get recent images
 */
export async function getRecentImages(limit = 12) {
  const query = `
    SELECT * FROM images
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Get images by category
 */
export async function getImagesByCategory(category, limit = 6) {
  const query = `
    SELECT * FROM images
    WHERE category = $1 AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [category, limit]);
  return result.rows;
}

/**
 * Increment download counter
 */
export async function incrementDownloadCount(id) {
  const query = 'UPDATE images SET download_count = download_count + 1 WHERE id = $1';
  await pool.query(query, [id]);
  return getImageById(id);
}

/**
 * Increment print counter
 */
export async function incrementPrintCount(id) {
  const query = 'UPDATE images SET print_count = print_count + 1 WHERE id = $1';
  await pool.query(query, [id]);
  return getImageById(id);
}

/**
 * Soft delete image
 */
export async function deleteImage(id) {
  const query = 'UPDATE images SET is_active = FALSE WHERE id = $1';
  await pool.query(query, [id]);
  return true;
}

/**
 * Get database statistics
 */
export async function getStats() {
  const totalQuery = 'SELECT COUNT(*) as total FROM images WHERE is_active = TRUE';
  const totalResult = await pool.query(totalQuery);
  const total = parseInt(totalResult.rows[0].total);

  const categoriesQuery = `
    SELECT category, COUNT(*) as count
    FROM images
    WHERE is_active = TRUE AND category IS NOT NULL
    GROUP BY category
  `;
  const categoriesResult = await pool.query(categoriesQuery);
  const categories = categoriesResult.rows;

  const downloadsQuery = 'SELECT SUM(download_count) as total FROM images WHERE is_active = TRUE';
  const downloadsResult = await pool.query(downloadsQuery);
  const totalDownloads = parseInt(downloadsResult.rows[0].total) || 0;

  return {
    totalImages: total,
    totalDownloads: totalDownloads,
    byCategory: categories
  };
}
