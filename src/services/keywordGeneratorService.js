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

    // Fallback: pack-specific keyword lists so each pack stays on-theme
    return generateFallbackKeywords(pack);
  }
}

// Pack-specific fallbacks keyed by pack.id — prevents two "animals" packs
// from getting the same generic keyword list when Gemini is unavailable.
function generateFallbackKeywords(pack) {
  const packFallbacks = {
    'ocean-adventure': [
      'clownfish', 'blue whale', 'sea turtle', 'coral reef', 'octopus',
      'stingray', 'jellyfish', 'seahorse', 'crab', 'lobster',
      'dolphin', 'shark', 'starfish', 'anglerfish', 'narwhal',
      'manta ray', 'sea otter', 'pufferfish', 'barracuda', 'electric eel',
      'hermit crab', 'swordfish', 'hammerhead shark', 'flying fish'
    ],
    'jungle-safari': [
      'lion', 'elephant', 'giraffe', 'monkey', 'zebra',
      'tiger', 'leopard', 'gorilla', 'hippopotamus', 'rhinoceros',
      'cheetah', 'crocodile', 'parrot', 'toucan', 'wild boar',
      'flamingo', 'warthog', 'chimpanzee', 'baboon', 'wildebeest',
      'meerkat', 'aardvark', 'hyena', 'okapi'
    ],
    'space-explorer': [
      'astronaut', 'rocket launch', 'saturn planet', 'alien creature', 'moon landing',
      'shooting star', 'comet trail', 'space station', 'black hole', 'meteor shower',
      'telescope', 'nebula', 'galaxy spiral', 'sun flare', 'mars rover',
      'ufo hovering', 'solar panel', 'space helmet', 'asteroid belt', 'jupiter storm',
      'saturn rings', 'milky way', 'space shuttle', 'orbiting satellite'
    ],
    'fairy-tale': [
      'dragon', 'unicorn', 'fairy', 'wizard', 'mermaid',
      'phoenix', 'griffin', 'enchanted castle', 'brave knight', 'woodland elf',
      'cheerful dwarf', 'sneaky goblin', 'gentle giant', 'wicked witch', 'warlock',
      'centaur', 'flying pegasus', 'bridge troll', 'garden gnome', 'ocean siren',
      'sleeping basilisk', 'sea kraken', 'shield valkyrie', 'desert sphinx'
    ],
    'alphabet-fun': [
      'letter A apple', 'letter B butterfly', 'letter C cat',
      'letter D dragon', 'letter E elephant', 'letter F frog',
      'letter G giraffe', 'letter H horse', 'letter I igloo',
      'letter J jellyfish', 'letter K kangaroo', 'letter L lion',
      'letter M monkey', 'letter N narwhal', 'letter O owl',
      'letter P penguin', 'letter Q queen', 'letter R rabbit',
      'letter S star', 'letter T tiger', 'letter U umbrella',
      'letter V volcano', 'letter W whale', 'letter X xylophone'
    ],
    'toddler-first': [
      'big sun', 'fluffy cloud', 'round ball', 'little duck',
      'cute dog', 'happy cat', 'friendly fish', 'big tree',
      'red apple', 'yellow banana', 'bouncy ball', 'toy car',
      'teddy bear', 'rubber duck', 'colorful kite', 'little house',
      'bright star', 'big heart', 'smiling flower', 'baby bird',
      'soft bunny', 'round balloon', 'tiny bug', 'ice cream cone'
    ],
    'vehicles-world': [
      'car', 'truck', 'train', 'airplane', 'helicopter',
      'sailboat', 'bicycle', 'motorcycle', 'school bus', 'submarine',
      'rocket', 'tractor', 'ambulance', 'fire truck', 'police car',
      'hot air balloon', 'monster truck', 'bulldozer', 'scooter', 'jet ski',
      'cable car', 'space shuttle', 'speedboat', 'steam locomotive'
    ],
    'christmas-pack': [
      'santa claus', 'reindeer', 'christmas tree', 'snowman', 'elf',
      'gift box', 'candy cane', 'christmas stocking', 'gingerbread man', 'wreath',
      'snowflake', 'angel', 'nativity scene', 'christmas star', 'sleigh',
      'north pole', 'christmas bell', 'holly branch', 'nutcracker', 'ornament',
      'christmas village', 'fireplace', 'hot cocoa', 'winter cottage'
    ],
  };

  // Use pack-specific list if available; otherwise fall back by category
  if (packFallbacks[pack.id]) {
    return packFallbacks[pack.id];
  }

  const categoryFallbacks = {
    animals:  ['lion', 'elephant', 'giraffe', 'monkey', 'zebra', 'tiger', 'bear', 'dolphin', 'whale', 'penguin', 'owl', 'rabbit', 'fox', 'deer', 'wolf', 'koala', 'panda', 'parrot', 'crocodile', 'kangaroo', 'flamingo', 'cheetah', 'gorilla', 'seahorse'],
    vehicles: ['car', 'truck', 'train', 'airplane', 'helicopter', 'boat', 'bicycle', 'motorcycle', 'bus', 'submarine', 'rocket', 'tractor', 'ambulance', 'fire truck', 'police car', 'sailboat', 'hot air balloon', 'monster truck', 'forklift', 'bulldozer', 'scooter', 'jet ski', 'cable car', 'space shuttle'],
    fantasy:  ['dragon', 'unicorn', 'fairy', 'wizard', 'mermaid', 'phoenix', 'griffin', 'castle', 'knight', 'elf', 'dwarf', 'goblin', 'giant', 'witch', 'warlock', 'centaur', 'pegasus', 'troll', 'gnome', 'siren', 'basilisk', 'kraken', 'valkyrie', 'sphinx'],
    space:    ['astronaut', 'rocket', 'planet', 'alien', 'moon', 'star', 'comet', 'satellite', 'black hole', 'meteor', 'telescope', 'space station', 'nebula', 'galaxy', 'sun', 'mars rover', 'ufo', 'solar panel', 'space helmet', 'asteroid belt', 'jupiter', 'saturn rings', 'milky way', 'space shuttle'],
  };

  return categoryFallbacks[pack.category]
    || Array.from({ length: 24 }, (_, i) => `${pack.title} page ${i + 1}`);
}
