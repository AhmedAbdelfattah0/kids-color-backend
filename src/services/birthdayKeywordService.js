import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../db/database.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getBirthdayKeywords(themeId, themeLabel, age) {

  // Check cache first
  const cached = await pool.query(
    `SELECT keywords FROM birthday_theme_keywords WHERE theme_id = $1 AND age = $2`,
    [themeId, age]
  );

  if (cached.rows.length > 0) {
    console.log(`[BirthdayKeywords] Cache hit: ${themeId} age ${age}`);
    return cached.rows[0].keywords;
  }

  // Generate via Gemini
  console.log(`[BirthdayKeywords] Generating: ${themeId} age ${age}`);
  const keywords = await generateKeywordsViaGemini(themeId, themeLabel, age);

  // Save to cache
  await pool.query(
    `INSERT INTO birthday_theme_keywords (theme_id, age, keywords)
     VALUES ($1, $2, $3)
     ON CONFLICT (theme_id, age) DO UPDATE SET keywords = $3`,
    [themeId, age, JSON.stringify(keywords)]
  );

  return keywords;
}

async function generateKeywordsViaGemini(themeId, themeLabel, age) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are helping generate birthday coloring page ideas for children.

Generate exactly 6 unique, specific, and creative coloring page subjects for a "${themeLabel}" birthday theme.
The birthday child is turning ${age} years old.

Rules:
- Each subject should be a short 1-4 word noun phrase (e.g. "dancing unicorn", "birthday rocket", "party dinosaur")
- Make them birthday-themed and festive — include birthday elements like cakes, balloons, party hats where it fits naturally
- Keep them fun and appropriate for a ${age} year old child
- Vary the subjects — avoid repeating similar ideas
- Do NOT include numbering, bullet points, or extra text
- Return ONLY a JSON array of 6 strings, nothing else

Example format:
["subject one", "subject two", "subject three", "subject four", "subject five", "subject six"]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in Gemini response');

    const keywords = JSON.parse(match[0]);
    if (!Array.isArray(keywords) || keywords.length === 0) throw new Error('Invalid keywords array');

    return keywords.slice(0, 6);

  } catch (err) {
    console.error('[BirthdayKeywords] Gemini failed:', err.message);
    return getFallbackKeywords(themeId);
  }
}

function getFallbackKeywords(themeId) {
  const fallbacks = {
    unicorn:   ['birthday unicorn', 'unicorn cake', 'rainbow unicorn', 'unicorn balloon', 'magical unicorn', 'unicorn crown'],
    dinosaur:  ['party dinosaur', 'birthday trex', 'dinosaur cake', 'triceratops balloon', 'dinosaur hat', 'raptor celebrating'],
    princess:  ['birthday princess', 'princess cake', 'princess crown', 'fairy princess', 'princess carriage', 'princess balloon'],
    superhero: ['birthday superhero', 'superhero cape', 'superhero cake', 'flying superhero', 'superhero badge', 'hero celebrating'],
    space:     ['birthday rocket', 'party astronaut', 'alien celebrating', 'planet birthday', 'space cake', 'moon celebration'],
    mermaid:   ['birthday mermaid', 'mermaid cake', 'underwater party', 'mermaid crown', 'mermaid balloon', 'ocean celebration'],
    pirate:    ['pirate birthday', 'treasure birthday', 'pirate cake', 'party ship', 'pirate hat', 'treasure chest cake'],
    animals:   ['birthday lion', 'party elephant', 'celebrating giraffe', 'birthday bear', 'party penguin', 'birthday monkey'],
    cars:      ['birthday race car', 'party truck', 'monster truck cake', 'racing birthday', 'birthday bus', 'party vehicle'],
    fairy:     ['birthday fairy', 'fairy cake', 'party fairy', 'fairy balloon', 'magical fairy', 'flower fairy party'],
    dragon:    ['birthday dragon', 'baby dragon cake', 'party dragon', 'dragon balloon', 'dragon celebrating', 'dragon with cake'],
    ocean:     ['birthday dolphin', 'party whale', 'celebrating octopus', 'birthday seahorse', 'party starfish', 'ocean birthday']
  };
  return fallbacks[themeId] || ['birthday cake', 'party balloon', 'birthday hat', 'celebration', 'birthday candles', 'party confetti'];
}
