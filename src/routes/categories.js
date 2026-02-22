import express from 'express';
import { getRandomKeyword } from '../services/promptService.js';

const router = express.Router();

const CATEGORIES = [
  {
    id: "animals",
    label: "Animals",
    icon: "🐾",
    examples: ["lion", "elephant", "dolphin", "giraffe", "penguin", "rabbit"]
  },
  {
    id: "vehicles",
    label: "Vehicles",
    icon: "🚗",
    examples: ["rocket", "train", "boat", "helicopter", "bicycle", "truck"]
  },
  {
    id: "fantasy",
    label: "Fantasy",
    icon: "🦄",
    examples: ["dragon", "unicorn", "fairy", "wizard", "mermaid", "phoenix"]
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🌿",
    examples: ["flower", "tree", "butterfly", "mountain", "rainbow", "waterfall"]
  },
  {
    id: "space",
    label: "Space",
    icon: "🚀",
    examples: ["astronaut", "planet", "alien", "satellite", "moon", "comet"]
  },
  {
    id: "food",
    label: "Food",
    icon: "🍕",
    examples: ["pizza", "cake", "ice cream", "burger", "cupcake", "fruit basket"]
  },
  {
    id: "holidays",
    label: "Holidays",
    icon: "🎄",
    examples: ["christmas tree", "pumpkin", "easter egg", "snowman", "heart", "fireworks"]
  },
  {
    id: "characters",
    label: "Characters",
    icon: "🧸",
    examples: ["robot", "princess", "superhero", "pirate", "knight", "astronaut"]
  }
];

/**
 * GET /api/categories
 * Get all available categories
 */
router.get('/', (req, res) => {
  res.json({ categories: CATEGORIES });
});

/**
 * GET /api/categories/random
 * Get a random keyword, optionally from a specific category
 */
router.get('/random', (req, res) => {
  const category = req.query.category || null;
  const keyword = getRandomKeyword(category);
  res.json({ keyword, category });
});

export default router;
