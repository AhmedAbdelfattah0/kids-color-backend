import express from 'express';
import { getProvidersStatus } from '../services/aiService.js';

const router = express.Router();

/**
 * GET /api/providers/status
 * Returns the status of all AI providers
 */
router.get('/status', (req, res) => {
  try {
    const status = getProvidersStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting provider status:', error);
    res.status(500).json({
      error: 'Failed to get provider status',
      message: error.message
    });
  }
});

export default router;
