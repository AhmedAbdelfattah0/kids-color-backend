const categoryModifiers = {
  animals: "cute friendly animal, simple rounded shapes, expressive eyes",
  vehicles: "fun chunky vehicle, simple mechanical details, cartoon style",
  fantasy: "magical whimsical creature, fantasy details, enchanting",
  nature: "simple nature illustration, clean botanical style, peaceful",
  space: "space themed illustration, stars and cosmic elements, fun sci-fi",
  food: "cute kawaii food character, simple and fun, smiling face",
  holidays: "festive celebratory illustration, holiday themed, family friendly",
  characters: "character illustration, expressive, simple costume and props"
};

export function enhancePrompt(keyword, category = null) {
  const modifier = category ? categoryModifiers[category] || "" : "";
  const basePrompt = `black and white kids coloring page, ${keyword}, ${modifier},
    thick simple outlines, no shading, no gray fills, no color,
    pure white background, cartoon style, child friendly,
    printable coloring book style, clean line art, no text, no watermark,
    high contrast black lines on white`;

  return basePrompt.replace(/\s+/g, ' ').trim();
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
    animals: ["lion", "elephant", "dolphin", "giraffe", "penguin", "rabbit", "tiger", "koala", "panda", "fox"],
    vehicles: ["rocket", "train", "boat", "helicopter", "bicycle", "truck", "submarine", "airplane", "car", "bus"],
    fantasy: ["dragon", "unicorn", "fairy", "wizard", "mermaid", "phoenix", "pegasus", "elf", "castle", "wand"],
    nature: ["flower", "tree", "butterfly", "mountain", "rainbow", "waterfall", "sunset", "garden", "mushroom", "leaf"],
    space: ["astronaut", "planet", "alien", "satellite", "moon", "comet", "star", "rocket", "galaxy", "telescope"],
    food: ["pizza", "cake", "ice cream", "burger", "cupcake", "fruit basket", "donut", "cookie", "sandwich", "apple"],
    holidays: ["christmas tree", "pumpkin", "easter egg", "snowman", "heart", "fireworks", "gift", "ornament", "candy cane", "balloon"],
    characters: ["robot", "princess", "superhero", "pirate", "knight", "astronaut", "detective", "chef", "dancer", "musician"]
  };

  if (category && allKeywords[category]) {
    const keywords = allKeywords[category];
    return keywords[Math.floor(Math.random() * keywords.length)];
  }

  // Random from all categories
  const allCategories = Object.values(allKeywords).flat();
  return allCategories[Math.floor(Math.random() * allCategories.length)];
}
