// Pokémon TCG-style sets, pull rates, market prices and sealed products.
import { round2 } from '../store.js';

// Gen 1 French names (index = dex - 1)
const G1 = 'Bulbizarre,Herbizarre,Florizarre,Salamèche,Reptincel,Dracaufeu,Carapuce,Carabaffe,Tortank,Chenipan,Chrysacier,Papilusion,Aspicot,Coconfort,Dardargnan,Roucool,Roucoups,Roucarnage,Rattata,Rattatac,Piafabec,Rapasdepic,Abo,Arbok,Pikachu,Raichu,Sabelette,Sablaireau,Nidoran♀,Nidorina,Nidoqueen,Nidoran♂,Nidorino,Nidoking,Mélofée,Mélodelfe,Goupix,Feunard,Rondoudou,Grodoudou,Nosferapti,Nosferalto,Mystherbe,Ortide,Rafflesia,Paras,Parasect,Mimitoss,Aéromite,Taupiqueur,Triopikeur,Miaouss,Persian,Psykokwak,Akwakwak,Férosinge,Colossinge,Caninos,Arcanin,Ptitard,Têtarte,Tartard,Abra,Kadabra,Alakazam,Machoc,Machopeur,Mackogneur,Chétiflor,Boustiflor,Empiflor,Tentacool,Tentacruel,Racaillou,Gravalanch,Grolem,Ponyta,Galopa,Ramoloss,Flagadoss,Magnéti,Magnéton,Canarticho,Doduo,Dodrio,Otaria,Lamantine,Tadmorv,Grotadmorv,Kokiyas,Crustabri,Fantominus,Spectrum,Ectoplasma,Onix,Soporifik,Hypnomade,Krabby,Krabboss,Voltorbe,Électrode,Noeunoeuf,Noadkoko,Osselait,Ossatueur,Kicklee,Tygnon,Excelangue,Smogo,Smogogo,Rhinocorne,Rhinoféros,Leveinard,Saquedeneu,Kangourex,Hypotrempe,Hypocéan,Poissirène,Poissoroy,Stari,Staross,M. Mime,Insécateur,Lippoutou,Élektek,Magmar,Scarabrute,Tauros,Magicarpe,Léviator,Lokhlass,Métamorph,Évoli,Aquali,Voltali,Pyroli,Porygon,Amonita,Amonistar,Kabuto,Kabutops,Ptéra,Ronflex,Artikodin,Électhor,Sulfura,Minidraco,Draco,Dracolosse,Mewtwo,Mew'.split(',');
// TCG energy type per gen-1 dex (G grass, R fire, W water, L lightning, P psychic, F fighting, C colorless, N dragon)
const G1T = 'GGGRRRWWWGGGGGGCCCCCCCPPLLFFPPPPPPCCRRCCPPGGGGGGGFFCCWWFFRRWWWPPPFFFGGGWWFFFRRWWLLCCCWWPPWWPPPFPPWWLLGGFFFFCPPFFCGCWWWWWWPGPLRGCWWWCCWLRCWWWWFCWLRNNNPP';
const typeOf = (dex) => G1T[dex - 1] || 'C';
const NAMES = {
  172: ['Pichu', 'L'], 175: ['Togepi', 'Y'], 176: ['Togetic', 'Y'], 468: ['Togekiss', 'Y'], 196: ['Mentali', 'P'], 197: ['Noctali', 'D'], 470: ['Phyllali', 'G'], 471: ['Givrali', 'W'], 700: ['Nymphali', 'Y'],
  280: ['Tarsal', 'P'], 281: ['Kirlia', 'P'], 282: ['Gardevoir', 'P'], 371: ['Draby', 'N'], 372: ['Drackhaus', 'N'], 373: ['Drattak', 'N'], 443: ['Griknot', 'N'], 444: ['Carmache', 'N'], 445: ['Carchacrok', 'N'],
  610: ['Coupenotte', 'N'], 611: ['Incisache', 'N'], 612: ['Tranchodon', 'N'], 885: ['Fantyrm', 'N'], 886: ['Dispareptil', 'N'], 887: ['Lanssorien', 'N'],
  179: ['Wattouat', 'L'], 180: ['Lainergie', 'L'], 181: ['Pharamp', 'L'], 403: ['Lixy', 'L'], 404: ['Luxio', 'L'], 405: ['Luxray', 'L'], 894: ['Regieleki', 'L'], 895: ['Regidrago', 'N'],
  1007: ['Koraidon', 'F'], 1008: ['Miraidon', 'L'], 384: ['Rayquaza', 'N'], 380: ['Latias', 'N'], 381: ['Latios', 'N'], 704: ['Mucuuu', 'N'], 705: ['Colimucus', 'N'], 706: ['Muplodocus', 'N'],
  447: ['Riolu', 'F'], 448: ['Lucario', 'F'], 255: ['Poussifeu', 'R'], 256: ['Galifeu', 'R'], 257: ['Braségali', 'R'], 258: ['Gobou', 'W'], 259: ['Flobio', 'W'], 260: ['Laggron', 'W'],
  252: ['Arcko', 'G'], 253: ['Massko', 'G'], 254: ['Jungko', 'G'], 349: ['Barpau', 'W'], 350: ['Milobellus', 'W'], 656: ['Grenousse', 'W'], 657: ['Croâporal', 'W'], 658: ['Amphinobi', 'W'],
  778: ['Mimiqui', 'P'], 1019: ['Pomdorochi', 'N'], 978: ['Nigirigon', 'N'], 25: ['Pikachu', 'L'],
};
export const pokeName = (dex) => (dex <= 151 ? G1[dex - 1] : NAMES[dex]?.[0] || '???');
export const pokeType = (dex) => (dex <= 151 ? typeOf(dex) : NAMES[dex]?.[1] || 'C');

export const TYPES = {
  G: { n: 'Plante', c1: '#6abe30', c2: '#2f7d14', atk: 'Tranch’Herbe' },
  R: { n: 'Feu', c1: '#ff7a3d', c2: '#c0280f', atk: 'Lance-Flammes' },
  W: { n: 'Eau', c1: '#4aa8ff', c2: '#145fb8', atk: 'Hydrocanon' },
  L: { n: 'Électrique', c1: '#ffd92e', c2: '#d79a00', atk: 'Tonnerre' },
  P: { n: 'Psy', c1: '#c77dff', c2: '#7b2cbf', atk: 'Psyko' },
  F: { n: 'Combat', c1: '#e08a4a', c2: '#8b4513', atk: 'Poing Karaté' },
  D: { n: 'Obscurité', c1: '#4b5d73', c2: '#1b2430', atk: 'Morsure' },
  M: { n: 'Métal', c1: '#b8c4d0', c2: '#6b7a89', atk: 'Griffe Acier' },
  N: { n: 'Dragon', c1: '#d4b44a', c2: '#7a5c10', atk: 'Draco-Charge' },
  C: { n: 'Incolore', c1: '#e8e2d0', c2: '#a59f8a', atk: 'Charge' },
  Y: { n: 'Fée', c1: '#ff9ed2', c2: '#d6338f', atk: 'Éclat Magique' },
};

export const RARITY = {
  C: { n: 'Commune', s: 'Commune', sym: '●', lvl: 0 },
  U: { n: 'Peu commune', s: 'Peu com.', sym: '◆', lvl: 0 },
  R: { n: 'Rare Holo', s: 'Holo', sym: '★', lvl: 1 },
  RR: { n: 'Double Rare', s: 'Double Rare', sym: '★★', lvl: 2 },
  IR: { n: 'Illustration Rare', s: 'Illus. Rare', sym: '★', lvl: 2, gold: true },
  UR: { n: 'Ultra Rare', s: 'Ultra Rare', sym: '★★', lvl: 3, silver: true },
  SIR: { n: 'Illustration Spéciale', s: 'SIR', sym: '★★', lvl: 4, gold: true },
  HR: { n: 'Hyper Rare', s: 'Gold', sym: '★★★', lvl: 4, gold: true },
  H: { n: 'Holo (1999)', s: 'Holo', sym: '★', lvl: 2 },
  PR: { n: 'Promo', s: 'Promo', sym: '★P', lvl: 1 },
};
export const isEx = (r) => r === 'RR' || r === 'UR' || r === 'SIR' || r === 'HR';
export const isFullArt = (r) => r === 'IR' || r === 'UR' || r === 'SIR' || r === 'HR';

const POP = { 6: 9, 25: 7, 151: 4, 150: 4, 133: 4, 197: 40, 196: 5, 94: 4, 9: 3, 3: 2.5, 143: 2.5, 149: 2.5, 130: 2.5, 448: 2, 384: 5, 700: 5, 134: 3, 135: 3, 136: 3, 470: 3, 471: 3, 282: 2.5, 445: 2.5, 1008: 2, 1007: 2, 65: 2, 145: 2, 172: 2, 381: 2, 380: 2 };
const BASE = { C: 0.05, U: 0.1, R: 0.35, RR: 2, IR: 5, UR: 6, SIR: 22, HR: 14, H: 30, PR: 3 };
const VBASE = { C: 0.6, U: 1.4, R: 7, H: 32 }; // vintage
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function mkCard(set, dex, r, vintage = false) {
  const id = `${set}-${dex}-${r}`;
  const h = hash(id);
  const jit = 0.75 + ((h % 1000) / 1000) * 0.6;
  const pop = POP[dex] || 1;
  const base = (vintage ? VBASE : BASE)[r];
  const lvl = RARITY[r].lvl;
  const price = round2(Math.max(0.03, base * jit * (lvl >= 1 ? Math.pow(pop, 0.85) : 1)));
  const t = pokeType(dex);
  const ex = isEx(r);
  const hp = ex ? 180 + (h % 16) * 10 : 50 + (h % 9) * 10 + (r === 'U' ? 30 : 0);
  return { id, set, dex, r, name: pokeName(dex) + (ex ? ' ex' : ''), t, hp, price, atk: TYPES[t].atk, dmg: ex ? 120 + (h % 12) * 20 : 10 + (h % 8) * 10 };
}

function buildSet(code, { commons, uncommons, R = [], RR = [], IR = [], UR = [], SIR = [], HR = [], H = [] }, vintage = false) {
  const cards = [];
  const add = (list, r) => list.forEach((d) => cards.push(mkCard(code, d, r, vintage)));
  add(commons, 'C'); add(uncommons, 'U'); add(R, 'R'); add(RR, 'RR'); add(IR, 'IR'); add(UR, 'UR'); add(SIR, 'SIR'); add(HR, 'HR'); add(H, 'H');
  cards.forEach((c, i) => (c.no = i + 1));
  return cards;
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const BASIC1 = new Set([1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 107, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133, 137, 138, 140, 142, 143, 144, 145, 146, 147, 150, 151]);
const all151 = range(1, 151);

export const SETS = [
  {
    id: 's151', name: '151', era: 'Écarlate & Violet', color: '#e11d48', color2: '#1d4ed8', cover: 6, year: 2023,
    cards: buildSet('s151', {
      commons: all151.filter((d) => BASIC1.has(d)), uncommons: all151.filter((d) => !BASIC1.has(d)),
      R: [26, 38, 59, 62, 68, 94, 97, 130, 131, 134, 135, 136, 144, 146, 149, 143],
      RR: [3, 6, 9, 24, 40, 65, 76, 115, 124, 145, 150],
      IR: [1, 2, 4, 5, 7, 8, 25, 35, 52, 94, 129, 133, 143, 147, 148, 54],
      UR: [3, 6, 9, 65, 145, 150],
      SIR: [3, 6, 9, 65, 145],
      HR: [151, 150],
    }),
  },
  {
    id: 'prism', name: 'Évolutions Prismatiques', era: 'Écarlate & Violet', color: '#a855f7', color2: '#ec4899', cover: 197, year: 2025,
    cards: buildSet('prism', {
      commons: [133, 16, 19, 39, 52, 129, 172, 175, 280, 371, 443, 610, 885, 147],
      uncommons: [17, 20, 40, 53, 176, 281, 372, 444, 611, 886, 148],
      R: [130, 143, 149, 468, 282, 373, 445, 612, 887],
      RR: [134, 135, 136, 196, 197, 470, 471, 700, 445, 373],
      IR: [133, 172, 175, 143, 129, 25, 280, 885],
      UR: [134, 135, 136, 196, 197, 470, 471, 700],
      SIR: [134, 135, 136, 196, 197, 470, 471, 700],
      HR: [133, 197],
    }),
  },
  {
    id: 'surge', name: 'Étincelles Déferlantes', era: 'Écarlate & Violet', color: '#f59e0b', color2: '#0ea5e9', cover: 25, year: 2024,
    cards: buildSet('surge', {
      commons: [25, 172, 179, 403, 447, 255, 258, 252, 349, 656, 704, 778, 978],
      uncommons: [180, 404, 256, 259, 253, 657, 705, 26],
      R: [181, 405, 257, 260, 254, 350, 658, 706, 448, 1019],
      RR: [25, 894, 895, 384, 381, 380, 448, 1008],
      IR: [172, 179, 447, 255, 258, 252, 349, 704, 778, 978],
      UR: [25, 384, 1008, 448, 894],
      SIR: [25, 384, 1008, 380, 381],
      HR: [25, 1008],
    }),
  },
  {
    id: 'base', name: 'Set de Base', era: 'Wizards · 1999', color: '#2563eb', color2: '#facc15', cover: 6, year: 1999, vintage: true,
    cards: buildSet('base', {
      commons: [63, 1, 10, 4, 50, 84, 96, 92, 109, 66, 81, 11, 32, 95, 16, 25, 60, 77, 19, 27, 7, 121, 120, 114, 100, 37, 13],
      uncommons: [87, 147, 83, 58, 93, 2, 124, 64, 14, 67, 129, 126, 33, 61, 137, 20, 86, 8, 5],
      R: [15, 148, 51, 125, 101, 17],
      H: [65, 9, 113, 6, 35, 130, 107, 68, 82, 150, 34, 38, 62, 26, 3, 145],
    }, true),
  },
];
export const setById = Object.fromEntries(SETS.map((s) => [s.id, s]));
export const cardById = {};
SETS.forEach((s) => s.cards.forEach((c) => (cardById[c.id] = c)));
// Special promos for ETBs
export const PROMOS = { s151: mkCard('s151', 151, 'PR'), prism: mkCard('prism', 133, 'PR'), surge: mkCard('surge', 25, 'PR'), base: mkCard('base', 25, 'PR', true) };
Object.values(PROMOS).forEach((c) => (cardById[c.id] = c));

const pool = (set, r) => set.cards.filter((c) => c.r === r);
const pickFrom = (arr, f) => arr[Math.floor(f * arr.length) % arr.length];

// One booster from a float stream. Returns card list (rarest last) with reverse flags.
export function openBooster(set, next) {
  const out = [];
  if (set.vintage) {
    // 11 cards: 7 C, 3 U, 1 rare slot (holo 1/3). 1st edition stamp 8 %.
    const first = next() < 0.08;
    for (let i = 0; i < 7; i++) out.push({ c: pickFrom(pool(set, 'C'), next()) });
    for (let i = 0; i < 3; i++) out.push({ c: pickFrom(pool(set, 'U'), next()) });
    out.push({ c: pickFrom(pool(set, next() < 1 / 3 ? 'H' : 'R'), next()) });
    if (first) out.forEach((x) => (x.first = true));
    return out;
  }
  for (let i = 0; i < 4; i++) out.push({ c: pickFrom(pool(set, 'C'), next()) });
  for (let i = 0; i < 3; i++) out.push({ c: pickFrom(pool(set, 'U'), next()) });
  // reverse holo slot 1
  const rv = () => { const x = next(); return { c: pickFrom(pool(set, x < 0.55 ? 'C' : x < 0.9 ? 'U' : 'R'), next()), rev: true }; };
  out.push(rv());
  // slot 2: reverse or illustration hits
  const y = next();
  if (y < 1 / 90) out.push({ c: pickFrom(pool(set, 'SIR'), next()) });
  else if (y < 1 / 90 + 1 / 12) out.push({ c: pickFrom(pool(set, 'IR'), next()) });
  else out.push(rv());
  // rare slot
  const z = next();
  const r = z < 1 / 140 ? 'HR' : z < 1 / 140 + 1 / 16 ? 'UR' : z < 1 / 140 + 1 / 16 + 1 / 5 ? 'RR' : 'R';
  out.push({ c: pickFrom(pool(set, r), next()) });
  return out;
}

export function cardPrice(entry) {
  return round2(entry.c.price * (entry.rev ? 2.2 : 1) * (entry.first ? 4 : 1) * marketFactor(entry.c.id));
}

// Daily market wobble ±12 % per card
export function marketFactor(id, day = Math.floor(Date.now() / 86400000)) {
  const h = hash(id + ':' + day);
  return 0.88 + (h % 1000) / 1000 * 0.24;
}

// Expected booster value (Monte Carlo, cached) used to price sealed products.
const evCache = {};
export function boosterEV(set) {
  if (evCache[set.id]) return evCache[set.id];
  let tot = 0;
  const N = 4000;
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < N; i++) tot += openBooster(set, rnd).reduce((a, e) => a + e.c.price * (e.rev ? 2.2 : 1) * (e.first ? 4 : 1), 0);
  return (evCache[set.id] = tot / N);
}
const nice = (x) => (x < 20 ? Math.ceil(x * 2) / 2 - 0.01 : Math.ceil(x) - 0.01);
export function products(set) {
  const ev = boosterEV(set);
  const booster = round2(nice(ev / (set.vintage ? 0.62 : 0.7)));
  const list = [
    { kind: 'booster', set: set.id, name: `Booster ${set.name}`, packs: 1, price: booster, icon: '🎴' },
    { kind: 'etb', set: set.id, name: `Coffret Dresseur d’Élite`, packs: 9, promo: true, price: round2(nice(booster * 9 * 0.98)), icon: '🎁' },
    { kind: 'display', set: set.id, name: `Display 36 boosters`, packs: 36, price: round2(nice(booster * 36 * 0.88)), icon: '📦' },
  ];
  return list;
}
// Sealed appreciation: ~0.25 %/day with noise, from purchase time.
export function sealedValue(item) {
  const days = (Date.now() - item.t) / 86400000;
  return round2(item.paid * Math.pow(1.0025, days) * marketFactor(item.uid || 'x'));
}

export const ART = (dex) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;
