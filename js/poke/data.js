// Real French TCG expansions (TCGdex images, Cardmarket EUR prices) with era-specific pull rates.
import { round2, cheatMul, cheats, saveCheats } from '../store.js';

export const INDEX = await fetch(new URL('../../data/poke/index.json', import.meta.url)).then((r) => r.json());
export const setMeta = Object.fromEntries(INDEX.map((s) => [s.id, s]));

export const TIER = {
  C: { n: 'Commune', lvl: 0 },
  U: { n: 'Peu commune', lvl: 0 },
  R: { n: 'Rare', lvl: 1 },
  H: { n: 'Rare Holo', lvl: 2 },
  RR: { n: 'Double Rare', lvl: 2 },
  SH: { n: 'Shiny Rare', lvl: 2 },
  UR: { n: 'Ultra Rare', lvl: 3 },
  IR: { n: 'Illustration Rare', lvl: 3 },
  SIR: { n: 'Illustration Spéciale', lvl: 4 },
  HR: { n: 'Secrète / Gold', lvl: 4 },
};

export const eraOf = (id) => (['base1', 'base2', 'base5', 'neo1'].includes(id) ? 'wotc' : id === 'cel25' ? 'cel' : id.startsWith('xy') || id === 'g1' ? 'xy' : id.startsWith('sm') ? 'sm' : id.startsWith('swsh') ? 'swsh' : 'sv');
export const ERA_NAME = { wotc: 'Wizards (1999-2000)', xy: 'XY', sm: 'Soleil et Lune', swsh: 'Épée et Bouclier', cel: 'Épée et Bouclier', sv: 'Écarlate et Violet / Méga' };

// Story mode: expansions unlock with net worth (modern & cheap first, vintage last)
const UNLOCK_ORDER = ['30th', 'sv08', 'sv03.5', 'sv10', 'sv03', 'me01', 'sv07', 'sv06.5', 'sv10.5w', 'me02', 'sv08.5', 'sv04.5', 'swsh12', 'swsh11', 'swsh9', 'swsh12.5', 'cel25', 'swsh4.5', 'swsh7', 'sm12', 'sm9', 'g1', 'xy12', 'neo1', 'base5', 'base2', 'base1'];
const UNLOCK_AT = [0, 0, 0, 2500, 5000, 5000, 10000, 10000, 25000, 25000, 25000, 50000, 50000, 75000, 75000, 100000, 100000, 150000, 250000, 250000, 400000, 500000, 750000, 1000000, 2000000, 3500000, 5000000];
export const setUnlock = (id) => { const i = UNLOCK_ORDER.indexOf(id); return i < 0 ? 0 : UNLOCK_AT[i]; };

export const logoURL = (s) => (s.logo ? `${s.logo}.webp` : null);
export const cardImg = (set, c, q = 'low') => `${c.img || set.base + '/' + c.lid}/${q}.webp`;

const cache = {};
export async function loadSet(id) {
  if (cache[id]) return cache[id];
  const d = await fetch(new URL(`../../data/poke/${id}.json`, import.meta.url)).then((r) => r.json());
  const set = { ...d, era: eraOf(id), cards: d.cards.map(([lid, name, tier, rar, price, rev, img]) => ({ lid, name, tier, rar, price, rev, img })) };
  set.byTier = {};
  for (const c of set.cards) (set.byTier[c.tier] ||= []).push(c);
  // Inside hit tiers, the most valuable cards (alt arts, chase cards) are the hardest to pull
  for (const [t, arr] of Object.entries(set.byTier)) {
    if (TIER[t].lvl < 2) continue;
    let acc = 0;
    arr.cum = arr.map((c) => (acc += 1 / Math.pow(c.price + 1, 0.7)));
  }
  set.byLid = Object.fromEntries(set.cards.map((c) => [c.lid, c]));
  set.ev = boosterEV(set);
  return (cache[id] = set);
}
export const loadedSet = (id) => cache[id];

const pickFrom = (arr, f) => {
  if (!arr.cum) return arr[Math.floor(f * arr.length) % arr.length];
  const x = f * arr.cum[arr.cum.length - 1];
  let lo = 0, hi = arr.cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr.cum[m] > x) hi = m; else lo = m + 1; }
  return arr[lo];
};
function pool(set, tier, fallbacks) {
  for (const t of [tier, ...fallbacks]) if (set.byTier[t]?.length) return set.byTier[t];
  return set.cards;
}
const take = (set, tier, f, fb = ['R', 'U', 'C']) => pickFrom(pool(set, tier, fb), f);

// One booster; `next` returns uniform floats. Rarest cards come last, like in a real pack.
export const GOD_P = 1 / 2000;
export function openBooster(set, next, sim = false) {
  if (!sim && cheats.once.godpack) { delete cheats.once.godpack; saveCheats(); return godPack(set, next); } // GODPACK code
  const H = cheatMul('hits');
  if (next() < Math.min(1, GOD_P * cheatMul('god'))) return godPack(set, next);
  const out = [];
  const e = set.era;
  if (e === 'wotc') {
    const first = next() < 0.08;
    for (let i = 0; i < 7; i++) out.push({ c: take(set, 'C', next()) });
    for (let i = 0; i < 3; i++) out.push({ c: take(set, 'U', next()) });
    out.push({ c: take(set, next() < Math.min(1, H / 3) ? 'H' : 'R', next(), ['H', 'R']) });
    if (first) out.forEach((x) => (x.first = true));
    return out;
  }
  if (e === 'cel') {
    for (let i = 0; i < 3; i++) out.push({ c: take(set, 'R', next()) });
    const z = next();
    out.push({ c: take(set, z < 0.1 * H ? 'UR' : z < 0.5 * H ? 'RR' : 'R', next(), ['RR', 'R']) });
    return out;
  }
  const nC = e === 'xy' ? 6 : e === 'sv' ? 4 : 5;
  for (let i = 0; i < nC; i++) out.push({ c: take(set, 'C', next(), ['U']) });
  for (let i = 0; i < 3; i++) out.push({ c: take(set, 'U', next(), ['C']) });
  const rev = () => { const x = next(); return { c: take(set, x < 0.55 ? 'C' : x < 0.9 ? 'U' : 'R', next()), rev: true }; };
  if (e !== 'xy') out.push(rev());
  if (e === 'sv') {
    const y = next() / H;
    if (y < 1 / 86 && set.byTier.SIR) out.push({ c: take(set, 'SIR', next()) });
    else if (y < 1 / 86 + 1 / 12 && set.byTier.IR) out.push({ c: take(set, 'IR', next()) });
    else if (set.byTier.SH && y < 0.35) out.push({ c: take(set, 'SH', next()) });
    else out.push(rev());
  } else if (e === 'xy') out.push(rev());
  const z = next() / H;
  let r;
  if (e === 'sv') r = z < 1 / 120 ? 'HR' : z < 1 / 120 + 1 / 15 ? 'UR' : z < 1 / 120 + 1 / 15 + 1 / 5 ? 'RR' : 'R';
  else if (e === 'swsh') r = z < 1 / 45 ? 'HR' : z < 1 / 45 + 1 / 18 ? 'UR' : z < 1 / 45 + 1 / 18 + 1 / 4.5 ? 'RR' : 'R';
  else if (e === 'sm') r = z < 1 / 40 ? 'HR' : z < 1 / 40 + 1 / 4.5 ? 'UR' : 'R';
  else r = z < 1 / 60 ? 'HR' : z < 1 / 60 + 1 / 6 ? 'UR' : 'R';
  out.push({ c: take(set, r, next(), ['UR', 'RR', 'R', 'U']) });
  return out;
}

// God pack: every single card is a hit, the best one saved for last
function godPack(set, next) {
  const n = set.era === 'wotc' ? 11 : set.era === 'cel' ? 4 : 10;
  const hitTiers = Object.keys(TIER).filter((t) => TIER[t].lvl >= 3 && set.byTier[t]);
  const tiers = hitTiers.length ? hitTiers : Object.keys(TIER).filter((t) => TIER[t].lvl >= 2 && set.byTier[t]);
  const out = Array.from({ length: n }, () => ({ c: take(set, tiers[Math.floor(next() * tiers.length) % tiers.length], next(), ['UR', 'IR', 'RR', 'H', 'R']), god: true }));
  const top = ['HR', 'SIR', 'UR', 'H'].find((t) => set.byTier[t]);
  if (top) out[n - 1] = { c: take(set, top, next()), god: true };
  out.sort((a, b) => a.c.price - b.c.price);
  return out;
}

export function rawPrice(e) {
  const c = e.c;
  const base = e.rev ? Math.max(c.rev || 0, c.price * 1.4) : c.price;
  return base * (e.first ? 3 : 1);
}
export const cardPrice = (set, e) => round2(Math.max(0.02, rawPrice(e) * marketFactor(set.id + e.c.lid)));

function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// Daily market wobble ±10 %
export function marketFactor(key, day = Math.floor(Date.now() / 86400000)) {
  return 0.9 + ((hash(key + ':' + day) % 1000) / 1000) * 0.2;
}

function boosterEV(set) {
  let s = 12345, tot = 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const N = 3000;
  for (let i = 0; i < N; i++) tot += openBooster(set, rnd, true).reduce((a, e) => a + rawPrice(e), 0);
  return tot / N;
}
const nice = (x) => (x < 20 ? Math.ceil(x * 2) / 2 - 0.01 : Math.ceil(x) - 0.01);
export function products(set) {
  const vint = set.era === 'wotc';
  const booster = round2(Math.max(2.99, nice(set.ev / (vint ? 0.62 : 0.72))));
  return [
    { kind: 'booster', set: set.id, name: `Booster ${set.name}`, packs: 1, price: booster },
    { kind: 'etb', set: set.id, name: 'Coffret Dresseur d’Élite', packs: 9, price: round2(nice(booster * 9 * 0.97)) },
    { kind: 'display', set: set.id, name: 'Display 36 boosters', packs: 36, price: round2(nice(booster * 36 * 0.88)) },
  ];
}
// Sealed appreciation ~0.25 %/day
export function sealedValue(item) {
  const days = (Date.now() - item.t) / 86400000;
  return round2(item.paid * Math.pow(1.0025, days) * marketFactor(item.uid || 'x'));
}
