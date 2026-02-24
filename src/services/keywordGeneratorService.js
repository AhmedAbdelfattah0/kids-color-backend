import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePackKeywords(pack) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are helping generate coloring page ideas for children.

Generate exactly 24 unique, specific, and creative coloring page subjects for a pack called "${pack.title}".

Pack description: ${pack.description}
Category: ${pack.category}
Age range: ${pack.ageRange} years old
Difficulty: ${pack.difficulty}

Rules:
- Each subject should be a short 1-3 word noun phrase (e.g. "flying dolphin", "angry crab", "dancing octopus")
- Make them specific and varied — avoid repeating similar ideas
- Keep them appropriate and fun for children aged ${pack.ageRange}
- Do NOT include numbering, bullet points, or extra text
- Return ONLY a JSON array of 24 strings, nothing else

Example format:
["subject one", "subject two", "subject three"]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found in Gemini response');

    const keywords = JSON.parse(match[0]);

    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('Invalid keywords array from Gemini');
    }

    // Ensure exactly 24, trim if more
    return keywords.slice(0, 24);

  } catch (err) {
    console.error('[KeywordGenerator] Gemini failed:', err.message);

    // Fallback: return generic keywords based on pack category
    return generateFallbackKeywords(pack);
  }
}

function generateFallbackKeywords(pack) {
  const fallbacks = {
    animals: ['lion', 'elephant', 'giraffe', 'monkey', 'zebra', 'tiger', 'bear', 'dolphin', 'whale', 'penguin', 'owl', 'rabbit', 'fox', 'deer', 'wolf', 'koala', 'panda', 'parrot', 'crocodile', 'kangaroo', 'flamingo', 'cheetah', 'gorilla', 'seahorse'],
    vehicles: ['car', 'truck', 'train', 'airplane', 'helicopter', 'boat', 'bicycle', 'motorcycle', 'bus', 'submarine', 'rocket', 'tractor', 'ambulance', 'fire truck', 'police car', 'sailboat', 'hot air balloon', 'monster truck', 'forklift', 'bulldozer', 'scooter', 'jet ski', 'cable car', 'space shuttle'],
    fantasy: ['dragon', 'unicorn', 'fairy', 'wizard', 'mermaid', 'phoenix', 'griffin', 'castle', 'knight', 'elf', 'dwarf', 'goblin', 'giant', 'witch', 'warlock', 'centaur', 'pegasus', 'troll', 'gnome', 'siren', 'basilisk', 'kraken', 'valkyrie', 'sphinx'],
    space: ['astronaut', 'rocket', 'planet', 'alien', 'moon', 'star', 'comet', 'satellite', 'black hole', 'meteor', 'telescope', 'space station', 'nebula', 'galaxy', 'sun', 'mars rover', 'ufo', 'solar panel', 'space helmet', 'asteroid belt', 'jupiter', 'saturn rings', 'milky way', 'space shuttle'],
    default: Array.from({ length: 24 }, (_, i) => `${pack.category} illustration ${i + 1}`)
  };

  return fallbacks[pack.category] || fallbacks.default;
}
