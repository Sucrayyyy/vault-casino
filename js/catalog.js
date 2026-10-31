// Every playable thing in the app, with its section and story-mode unlock threshold (net worth).

export const GAMES = [
  { id: 'dice', name: 'Dice', sec: 'casino', unlock: 0, color: '#1f8a3b' },
  { id: 'mines', name: 'Mines', sec: 'casino', unlock: 0, color: '#1468d1' },
  { id: 'limbo', name: 'Limbo', sec: 'casino', unlock: 0, color: '#6c2bd9' },
  { id: 'plinko', name: 'Plinko', sec: 'casino', unlock: 250, color: '#d4136a' },
  { id: 'hilo', name: 'Hilo', sec: 'casino', unlock: 500, color: '#0f7f8c' },
  { id: 'keno', name: 'Keno', sec: 'casino', unlock: 500, color: '#5b3fd6' },
  { id: 'crash', name: 'Jet', sec: 'casino', unlock: 1000, color: '#c7182f' },
  { id: 'chicken', name: 'Poulet Express', sec: 'casino', unlock: 2500, color: '#e0a100' },
  { id: 'wheel', name: 'Roue', sec: 'casino', unlock: 2500, color: '#e05a00' },
  { id: 'blackjack', name: 'Blackjack', sec: 'table', unlock: 5000, color: '#0b6b3a' },
  { id: 'tower', name: 'Tour du Dragon', sec: 'casino', unlock: 10000, color: '#8a1fb5' },
  { id: 'roulette', name: 'Roulette', sec: 'table', unlock: 10000, color: '#7a0f1f' },
  { id: 'slots', name: 'Fruit Vault', sec: 'casino', unlock: 25000, color: '#e01f8a' },

  { id: 'cases', name: 'Caisses', sec: 'cs', unlock: 5000, color: '#d97706' },
  { id: 'upgrader', name: 'Upgrader', sec: 'cs', unlock: 10000, color: '#2563eb' },
  { id: 'battles', name: 'Case Battles', sec: 'cs', unlock: 25000, color: '#dc2626' },

  { id: 'boosters', name: 'Boosters', sec: 'poke', unlock: 1000, color: '#e11d48' },
  { id: 'etb', name: 'Coffrets ETB', sec: 'poke', unlock: 10000, color: '#7c3aed' },
  { id: 'display', name: 'Displays', sec: 'poke', unlock: 50000, color: '#0ea5e9' },
  { id: 'grading', name: 'Gradation', sec: 'poke', unlock: 25000, color: '#ca8a04' },
];

export const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));

// Story chapters: reach a net worth to finish the chapter.
export const CHAPTERS = [
  { goal: 250, title: 'Les premiers jetons', reward: 50 },
  { goal: 500, title: 'Débutant chanceux', reward: 100 },
  { goal: 1000, title: 'Le premier millier', reward: 150 },
  { goal: 2500, title: 'Habitué du Vault', reward: 300 },
  { goal: 5000, title: 'Joueur de table', reward: 600 },
  { goal: 10000, title: 'Cinq chiffres', reward: 1200 },
  { goal: 25000, title: 'High roller en herbe', reward: 2500 },
  { goal: 50000, title: 'Collectionneur', reward: 5000 },
  { goal: 100000, title: 'Six chiffres', reward: 10000 },
  { goal: 250000, title: 'Requin', reward: 20000 },
  { goal: 500000, title: 'Baleine', reward: 40000 },
  { goal: 1000000, title: 'Millionnaire', reward: 100000 },
  { goal: 10000000, title: 'Magnat', reward: 1000000 },
  { goal: 100000000, title: 'Légende', reward: 10000000 },
  { goal: 1000000000, title: 'Propriétaire du Vault', reward: 100000000 },
];

export const VIP = [
  { name: 'Aucun', at: 0, color: '#6f839b', rake: 0 },
  { name: 'Bronze', at: 1000, color: '#c47a3f', rake: 0.001 },
  { name: 'Argent', at: 5000, color: '#b6c3d1', rake: 0.0015 },
  { name: 'Or', at: 25000, color: '#ffc800', rake: 0.002 },
  { name: 'Platine I', at: 100000, color: '#5fd3e8', rake: 0.0025 },
  { name: 'Platine II', at: 250000, color: '#5fd3e8', rake: 0.003 },
  { name: 'Platine III', at: 1000000, color: '#5fd3e8', rake: 0.0035 },
  { name: 'Diamant', at: 5000000, color: '#9b8cff', rake: 0.004 },
  { name: 'Obsidienne', at: 25000000, color: '#ff4fd8', rake: 0.0045 },
  { name: 'Vault', at: 100000000, color: '#00e701', rake: 0.005 },
];
