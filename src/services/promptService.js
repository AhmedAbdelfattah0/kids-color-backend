const difficultyMap = {
  simple: 'very simple, thick bold outlines, minimal detail, large easy-to-color shapes, suitable for toddlers',
  medium: 'clean outlines, moderate detail, clear shapes, suitable for children',
  detailed: 'intricate details, fine outlines, complex patterns, suitable for older children'
};

const ageMap = {
  '2-4': 'extremely simple shapes, very thick lines (5px+), huge areas to color, no small details, toddler friendly',
  '5-8': 'medium complexity, clear outlines, recognizable shapes, child friendly',
  '9-12': 'detailed illustration, fine lines, complex scene, suitable for older kids and tweens'
};

const categoryMap = {
  animals: (keyword) => `${keyword} animal, cute cartoon style, friendly expression`,
  vehicles: (keyword) => `${keyword} vehicle, side view, cartoon style, simple mechanical details`,
  fantasy: (keyword) => `${keyword}, magical fantasy illustration, whimsical style`,
  nature: (keyword) => `${keyword}, natural illustration, organic shapes, botanical style`,
  space: (keyword) => `${keyword}, space illustration, cosmic setting, stars background`,
  food: (keyword) => `${keyword}, cute food illustration, kawaii style, simple shapes`,
  holidays: (keyword) => `${keyword}, festive holiday illustration, celebratory style`,
  characters: (keyword) => `${keyword} character, full body, cartoon style, expressive`,
  educational: (keyword) => `${keyword}, educational illustration, clear and simple, learning material`,
  alphabet: (keyword) => `letter ${keyword}, decorative alphabet, fun font style, with related objects`,
  numbers: (keyword) => `number ${keyword}, decorative numeral, fun style, with counting objects`,
  shapes: (keyword) => `${keyword} shape, geometric, clear outline, mathematical illustration`,
  geography: (keyword) => `${keyword}, geographic illustration, map style, educational`,
  science: (keyword) => `${keyword}, scientific illustration, educational diagram style`,
  seasons: (keyword) => `${keyword} season, nature scene, seasonal elements, weather details`
};

export function enhance(keyword, category, difficulty = 'medium', ageRange = '5-8') {
  const categoryFn = category ? categoryMap[category] : null;
  const categoryPrompt = categoryFn ? categoryFn(keyword) : keyword;
  const difficultyPrompt = difficultyMap[difficulty] || difficultyMap.medium;
  const agePrompt = ageMap[ageRange] || ageMap['5-8'];

  return `Black and white coloring page for kids, ${categoryPrompt}, ${difficultyPrompt}, ${agePrompt}, white background, no colors, no shading, only black outlines, printable coloring book style, clean line art`;
}

// Keep legacy export so any other callers still work
export function enhancePrompt(keyword, category = null) {
  return enhance(keyword, category, 'medium', '5-8');
}

export function normalizeKeyword(keyword) {
  return keyword.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function buildPollinationsUrl(prompt) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
}

export function getRandomKeyword(category = null) {
  const allKeywords = {
    animals: ['lion', 'elephant', 'dolphin', 'giraffe', 'penguin', 'rabbit', 'tiger', 'bear', 'cat', 'dog', 'horse', 'monkey', 'zebra', 'crocodile', 'owl'],
    vehicles: ['rocket', 'train', 'boat', 'helicopter', 'bicycle', 'truck', 'car', 'airplane', 'bus', 'submarine', 'tractor', 'ambulance', 'fire truck'],
    fantasy: ['dragon', 'unicorn', 'fairy', 'wizard', 'mermaid', 'phoenix', 'castle', 'knight', 'elf', 'dwarf', 'goblin', 'giant'],
    nature: ['flower', 'tree', 'butterfly', 'mountain', 'rainbow', 'waterfall', 'sun', 'cloud', 'leaf', 'mushroom', 'cactus', 'volcano'],
    space: ['astronaut', 'planet', 'alien', 'satellite', 'moon', 'comet', 'star', 'ufo', 'black hole', 'meteor', 'telescope'],
    food: ['pizza', 'cake', 'ice cream', 'burger', 'cupcake', 'apple', 'strawberry', 'sushi', 'taco', 'donut', 'watermelon'],
    holidays: ['christmas tree', 'pumpkin', 'snowman', 'heart', 'star', 'easter egg', 'fireworks', 'gift', 'santa', 'turkey'],
    characters: ['robot', 'princess', 'superhero', 'pirate', 'knight', 'ninja', 'cowboy', 'astronaut', 'wizard', 'clown'],
    educational: ['book', 'pencil', 'ruler', 'globe', 'microscope', 'calculator', 'backpack', 'school bus', 'teacher', 'chalkboard'],
    alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    shapes: ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'diamond', 'oval', 'hexagon', 'pentagon'],
    geography: ['map', 'compass', 'mountain', 'river', 'ocean', 'desert', 'forest', 'island', 'volcano', 'waterfall'],
    science: ['atom', 'dna', 'microscope', 'rocket', 'robot', 'magnet', 'solar system', 'dinosaur bones', 'telescope', 'chemistry'],
    seasons: ['spring flowers', 'summer beach', 'autumn leaves', 'winter snow', 'rain', 'sunshine', 'snowflake', 'rainbow']
  };

  if (category && allKeywords[category]) {
    const keywords = allKeywords[category];
    return keywords[Math.floor(Math.random() * keywords.length)];
  }

  const allCategories = Object.values(allKeywords).flat();
  return allCategories[Math.floor(Math.random() * allCategories.length)];
}
