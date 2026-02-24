import express from 'express';
import { getRandomKeyword } from '../services/promptService.js';

const router = express.Router();

const CATEGORIES = [
  { id: 'animals', label: 'Animals', emoji: '🐾', keywords: ['lion', 'elephant', 'dolphin', 'giraffe', 'penguin', 'rabbit', 'tiger', 'bear', 'cat', 'dog', 'horse', 'monkey', 'zebra', 'crocodile', 'owl'] },
  { id: 'vehicles', label: 'Vehicles', emoji: '🚗', keywords: ['rocket', 'train', 'boat', 'helicopter', 'bicycle', 'truck', 'car', 'airplane', 'bus', 'submarine', 'tractor', 'ambulance', 'fire truck'] },
  { id: 'fantasy', label: 'Fantasy', emoji: '🦄', keywords: ['dragon', 'unicorn', 'fairy', 'wizard', 'mermaid', 'phoenix', 'castle', 'knight', 'elf', 'dwarf', 'goblin', 'giant'] },
  { id: 'nature', label: 'Nature', emoji: '🌿', keywords: ['flower', 'tree', 'butterfly', 'mountain', 'rainbow', 'waterfall', 'sun', 'cloud', 'leaf', 'mushroom', 'cactus', 'volcano'] },
  { id: 'space', label: 'Space', emoji: '🚀', keywords: ['astronaut', 'planet', 'alien', 'satellite', 'moon', 'comet', 'star', 'ufo', 'black hole', 'meteor', 'telescope'] },
  { id: 'food', label: 'Food', emoji: '🍕', keywords: ['pizza', 'cake', 'ice cream', 'burger', 'cupcake', 'apple', 'strawberry', 'sushi', 'taco', 'donut', 'watermelon'] },
  { id: 'holidays', label: 'Holidays', emoji: '🎄', keywords: ['christmas tree', 'pumpkin', 'snowman', 'heart', 'star', 'easter egg', 'fireworks', 'gift', 'santa', 'turkey'] },
  { id: 'characters', label: 'Characters', emoji: '🧸', keywords: ['robot', 'princess', 'superhero', 'pirate', 'knight', 'ninja', 'cowboy', 'astronaut', 'wizard', 'clown'] },
  { id: 'educational', label: 'Educational', emoji: '📚', keywords: ['book', 'pencil', 'ruler', 'globe', 'microscope', 'calculator', 'backpack', 'school bus', 'teacher', 'chalkboard'] },
  { id: 'alphabet', label: 'Alphabet', emoji: '🔤', keywords: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] },
  { id: 'numbers', label: 'Numbers', emoji: '🔢', keywords: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { id: 'shapes', label: 'Shapes', emoji: '🔷', keywords: ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'diamond', 'oval', 'hexagon', 'pentagon'] },
  { id: 'geography', label: 'Geography', emoji: '🌍', keywords: ['map', 'compass', 'mountain', 'river', 'ocean', 'desert', 'forest', 'island', 'volcano', 'waterfall'] },
  { id: 'science', label: 'Science', emoji: '🔬', keywords: ['atom', 'dna', 'microscope', 'rocket', 'robot', 'magnet', 'solar system', 'dinosaur bones', 'telescope', 'chemistry'] },
  { id: 'seasons', label: 'Seasons', emoji: '🌦️', keywords: ['spring flowers', 'summer beach', 'autumn leaves', 'winter snow', 'rain', 'sunshine', 'snowflake', 'rainbow'] }
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
