// Real CS2 cases, skins and market prices (Steam images, Skinport EUR prices), loaded once.
import { round2, cheatMul } from '../store.js';

const DB = await fetch(new URL('../../data/cs.json', import.meta.url)).then((r) => r.json());

export const RAR = [
  { k: 'mil', name: 'Mil-Spec', color: '#4b69ff' },
  { k: 'res', name: 'Restricted', color: '#8847ff' },
  { k: 'cla', name: 'Classified', color: '#d32ce6' },
  { k: 'cov', name: 'Covert', color: '#eb4b4b' },
  { k: 'gold', name: '★ Rare Special', color: '#e4ae39' },
];
export const CASE_ODDS = [0.7992, 0.1598, 0.032, 0.0064, 0.0026];

// Official CS wear-tier distribution
export const WEARS = [
  { k: 'FN', name: 'Neuve', min: 0, max: 0.07, w: 0.03 },
  { k: 'MW', name: 'Très peu usée', min: 0.07, max: 0.15, w: 0.24 },
  { k: 'FT', name: 'Testée sur le terrain', min: 0.15, max: 0.38, w: 0.33 },
  { k: 'WW', name: 'Usée', min: 0.38, max: 0.45, w: 0.24 },
  { k: 'BS', name: 'Marquée par les combats', min: 0.45, max: 1, w: 0.16 },
];
const ST_P = 0.1;

export const imgURL = (h, size = 256) => `https://community.akamai.steamstatic.com/economy/image/${h}/${size}fx${size}f`;

export const ITEMS = DB.items.map((x, i) => {
  const [w, n] = x.n.includes(' | ') ? x.n.split(' | ') : [x.n, 'Vanilla'];
  return { id: i, w, n, r: x.r, img: x.i, p: x.p, s: x.s };
});

function wearDist(it) {
  const av = WEARS.filter((w) => it.p[w.k] != null);
  const tot = av.reduce((a, w) => a + w.w, 0) || 1;
  return av.map((w) => ({ ...w, w: w.w / tot }));
}
function itemEV(it) {
  let ev = 0;
  for (const w of wearDist(it)) ev += w.w * ((1 - ST_P) * it.p[w.k] + ST_P * (it.s[w.k] ?? it.p[w.k]));
  return ev;
}

export const CASES = DB.cases.map((c) => {
  const groups = CASE_ODDS.map((o, r) => ({ r, o, items: c.items.filter((i) => ITEMS[i].r === r) })).filter((g) => g.items.length);
  const tot = groups.reduce((a, g) => a + g.o, 0);
  groups.forEach((g) => (g.o /= tot));
  const odds = [];
  for (const g of groups) for (const i of g.items) odds.push({ id: i, p: g.o / g.items.length });
  odds.sort((a, b) => itemEV(ITEMS[b.id]) - itemEV(ITEMS[a.id]));
  const ev = odds.reduce((a, o) => a + o.p * itemEV(ITEMS[o.id]), 0);
  return { id: c.id, name: c.name, img: c.img, items: c.items, odds, ev, price: round2(Math.max(0.49, ev * 1.12)) };
}).sort((a, b) => a.price - b.price);
export const caseById = Object.fromEntries(CASES.map((c) => [c.id, c]));

// One item from a case using 4 fair floats
export function rollCase(c, f1, f2, f3, f4) {
  const boost = cheatMul('rare');
  let odds = c.odds;
  if (boost > 1) {
    // god mode: covert and gold items become `boost` times more likely
    const w = c.odds.map((o) => o.p * (ITEMS[o.id].r >= 3 ? boost : 1));
    const t = w.reduce((a, b) => a + b, 0);
    odds = c.odds.map((o, i) => ({ id: o.id, p: w[i] / t }));
  }
  let x = f1, pick = odds[odds.length - 1];
  for (const o of odds) { x -= o.p; if (x < 0) { pick = o; break; } }
  return makeItem(pick.id, f2, f3 < ST_P, f4);
}
export function makeItem(itemId, fw, st, ff = Math.random()) {
  const it = ITEMS[itemId];
  const dist = wearDist(it);
  let x = fw, wear = dist[dist.length - 1];
  for (const w of dist) { x -= w.w; if (x < 0) { wear = w; break; } }
  const stOk = st && it.s[wear.k] != null;
  const price = stOk ? it.s[wear.k] : it.p[wear.k];
  return { kind: 'skin', k: itemId, wear: wear.k, float: +(wear.min + (wear.max - wear.min) * ff).toFixed(5), st: stOk, price: round2(Math.max(0.03, price)) };
}

export const fullName = (it) => { const s = ITEMS[it.k]; return `${it.st ? 'StatTrak™ ' : ''}${s.w} | ${s.n}`; };
export const itemEVof = (id) => itemEV(ITEMS[id]);

// Every (skin, wear, stattrak) combination with a market price, for the upgrader
export const TARGETS = ITEMS.flatMap((it) => WEARS.flatMap((w) => [
  it.p[w.k] != null ? { k: it.id, wear: w.k, st: false, price: it.p[w.k], float: (w.min + w.max) / 2 } : null,
  it.s[w.k] != null ? { k: it.id, wear: w.k, st: true, price: it.s[w.k], float: (w.min + w.max) / 2 } : null,
])).filter(Boolean).sort((a, b) => a.price - b.price);
