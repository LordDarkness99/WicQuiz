const adjectives = [
  "Galloping",
  "Thundering",
  "Speedy",
  "Majestic",
  "Mighty",
  "Blazing",
  "Dashing",
  "Prancing",
  "Charging",
  "Soaring",
  "Flying",
  "Turbo",
  "Cosmic",
  "Electric",
  "Atomic",
  "Sneaky",
  "Cheeky",
  "Fancy",
  "Lucky",
  "Zippy",
  "Wobbly",
  "Jolly",
  "Bouncy",
  "Sassy",
  "Plucky",
];

const nouns = [
  "Gary",
  "McQuiz",
  "Biscuit",
  "Thunder",
  "Nugget",
  "Tornado",
  "Sprinkles",
  "Waffles",
  "Pickles",
  "Rocket",
  "Noodle",
  "Muffin",
  "Bandit",
  "Pancake",
  "Pepper",
  "Cupcake",
  "Diesel",
  "Breezy",
  "Crumble",
  "Toffee",
  "Buttons",
  "Zigzag",
  "Mustard",
  "Truffle",
  "Pudding",
];

/**
 * Generate a random fun horse name like "Galloping Gary" or "Turbo Nugget".
 */
export function generateHorseName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

/**
 * Get a horse emoji variant for display.
 */
export function getHorseEmoji(): string {
  const horses = ["🐎", "🏇", "🐴", "🦄"];
  return horses[Math.floor(Math.random() * horses.length)];
}
