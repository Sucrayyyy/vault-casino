// CS-style skins, weapon silhouettes (original vector art) and cases.
import { round2 } from '../store.js';

export const RAR = [
  { k: 'mil', name: 'Mil-Spec', color: '#4b69ff' },
  { k: 'res', name: 'Restricted', color: '#8847ff' },
  { k: 'cla', name: 'Classified', color: '#d32ce6' },
  { k: 'cov', name: 'Covert', color: '#eb4b4b' },
  { k: 'gold', name: '★ Rare Special', color: '#e4ae39' },
];
export const CASE_ODDS = [0.7992, 0.1598, 0.032, 0.0064, 0.0026];

export const WEARS = [
  { k: 'FN', name: 'Neuve', max: 0.07, mul: 1.8 },
  { k: 'MW', name: 'Très peu usée', max: 0.15, mul: 1.3 },
  { k: 'FT', name: 'Testée sur le terrain', max: 0.38, mul: 1 },
  { k: 'WW', name: 'Usée', max: 0.45, mul: 0.85 },
  { k: 'BS', name: 'Marquée par les combats', max: 1, mul: 0.72 },
];
export const wearOf = (f) => WEARS.find((w) => f < w.max) || WEARS[4];

// Silhouettes in a 200×80 box, muzzle to the right.
export const SHAPES = {
  ak: 'M2 36L44 28H50V40L10 50H2Z M48 26H128V22H134V26H198V30H160V35L128 36L48 40Z M66 38H78L74 58H62Z M92 36H108Q108 54 118 66L104 70Q94 56 92 36Z',
  m4: 'M2 32L36 30V42L2 46Z M36 32H52V38H36Z M50 26H126L130 30H190V33H198V37H190L130 38L50 40Z M60 21H120V26H60Z M66 38H78L72 58L60 56Z M92 38H106L108 64H94Z',
  awp: 'M2 34L14 30L50 32L56 38L50 46L26 44L6 52L2 50Z M50 30H130L198 32V35L130 37L56 40Z M60 14H64V22H60Z M64 16H120L124 12H134V24H124L120 20H64Z M80 20H84V30H80Z M104 20H108V30H104Z M56 38H66L62 54L52 52Z M82 37H96V48H82Z',
  deagle: 'M40 20H156V40H40Z M36 20L42 15L46 20Z M44 40H76L80 46L72 74H44L50 46Z M76 40H98Q98 56 84 56L78 52Z',
  pistol: 'M44 24H140V40H44Z M48 40H78L82 46L74 72H48L54 46Z M78 40H96Q96 54 84 54L80 50Z',
  usp: 'M30 26H120V40H30Z M120 28H192V38H120Z M34 40H62L66 46L58 70H34L40 46Z M62 40H80Q80 53 68 53L64 50Z',
  smg: 'M40 24H150V40H40Z M150 29H184V35H150Z M8 28H40V33H15V46H8Z M68 40H82L78 64L64 62Z M108 40H122L120 72H106Z M60 18H110V24H60Z',
  shotgun: 'M2 36L40 30H48V42L8 50H2Z M46 28H140V24H146V28H198V33H146V38H140L46 40Z M64 40H76L72 56H60Z M100 38H140V44H100Z',
  karambit: 'M84 40Q140 12 180 54Q170 52 160 46Q130 36 88 54Z M30 46Q60 40 86 42L84 56Q60 52 34 60Z M22 42A11 11 0 1 0 22.01 42Z',
  bayonet: 'M14 38L84 36V48L14 50Z M84 28H92V56H84Z M92 34H170L198 42L170 48H92Z',
  butterfly: 'M10 36H50V46H10Z M50 34H90V48H50Z M90 35H170L196 42L172 48H90Z',
};
// inner hole for the karambit ring
const HOLES = { karambit: 'M22 47A5 5 0 1 0 22.01 47Z' };

// [weapon, shape, skin name, rarity index, base price (FT), pattern, colors[]]
const S = (w, sh, n, r, p, pat, c) => ({ w, sh, n, r, p, pat, c });
export const SKINS = [
  // ---------- mil-spec ----------
  S('P250', 'pistol', 'Sable du désert', 0, 0.08, 'camo', ['#c8a46b', '#8a6a3c', '#e2c999']),
  S('MP9', 'smg', 'Rose Hydrique', 0, 0.12, 'stripes', ['#f472b6', '#1f2937']),
  S('Glock-18', 'pistol', 'Hex Océan', 0, 0.15, 'hex', ['#0e7490', '#67e8f9']),
  S('MAC-10', 'smg', 'Néon Bleu', 0, 0.2, 'line', ['#111827', '#38bdf8']),
  S('Nova', 'shotgun', 'Rouille', 0, 0.06, 'camo', ['#7c2d12', '#b45309', '#451a03']),
  S('Galil AR', 'ak', 'Brique', 0, 0.1, 'stripes', ['#991b1b', '#fca5a5']),
  S('FAMAS', 'm4', 'Commando', 0, 0.09, 'camo', ['#365314', '#65a30d', '#1a2e05']),
  S('UMP-45', 'smg', 'Arctique', 0, 0.07, 'camo', ['#e5e7eb', '#9ca3af', '#f9fafb']),
  S('Five-SeveN', 'pistol', 'Violet Électrique', 0, 0.22, 'line', ['#2e1065', '#c084fc']),
  S('SSG 08', 'awp', 'Abysse', 0, 0.3, 'solid', ['#0c4a6e', '#082f49']),
  S('Tec-9', 'pistol', 'Isotope', 0, 0.11, 'hex', ['#3f6212', '#bef264']),
  S('P90', 'smg', 'Carbone', 0, 0.14, 'hex', ['#18181b', '#52525b']),
  // ---------- restricted ----------
  S('M4A1-S', 'usp', 'Nitro', 1, 1.2, 'stripes', ['#1e3a8a', '#f97316']),
  S('USP-S', 'usp', 'Orion', 1, 1.6, 'line', ['#1e40af', '#93c5fd']),
  S('AK-47', 'ak', 'Élite Bleue', 1, 2.4, 'hex', ['#1d4ed8', '#bfdbfe']),
  S('Desert Eagle', 'deagle', 'Conspiration', 1, 1.1, 'stripes', ['#1f2937', '#a3e635']),
  S('P250', 'pistol', 'Asiimov', 1, 1.4, 'blocks', ['#f8fafc', '#f97316', '#111827']),
  S('MP9', 'smg', 'Illumination', 1, 0.9, 'fade', ['#22d3ee', '#a78bfa', '#f472b6']),
  S('Glock-18', 'pistol', 'Eau Sauvage', 1, 1.3, 'tiger', ['#0284c7', '#082f49']),
  S('AWP', 'awp', 'Atheris', 1, 3.1, 'tiger', ['#14532d', '#a3e635']),
  S('M4A4', 'm4', 'Évolution', 1, 1.8, 'marble', ['#0f766e', '#5eead4']),
  S('XM1014', 'shotgun', 'Incinérateur', 1, 0.8, 'fade', ['#facc15', '#f97316', '#b91c1c']),
  // ---------- classified ----------
  S('AK-47', 'ak', 'Redline', 2, 9.5, 'redline', ['#111111', '#dc2626']),
  S('M4A1-S', 'usp', 'Golden Coil', 2, 12, 'marble', ['#111827', '#facc15']),
  S('AWP', 'awp', 'Hyper Beast', 2, 18, 'blocks', ['#10b981', '#f43f5e', '#1e1b4b']),
  S('Desert Eagle', 'deagle', 'Code Rouge', 2, 8, 'redline', ['#111', '#ef4444']),
  S('USP-S', 'usp', 'Kill Confirmed', 2, 22, 'blocks', ['#e5e7eb', '#dc2626', '#111827']),
  S('M4A4', 'm4', 'Néo-Noir', 2, 14, 'line', ['#0f172a', '#e2e8f0']),
  S('Glock-18', 'pistol', 'Vogue', 2, 7, 'fade', ['#ec4899', '#a855f7', '#22d3ee']),
  S('MAC-10', 'smg', 'Neon Rider', 2, 6, 'fade', ['#f0abfc', '#22d3ee', '#fde047']),
  S('P90', 'smg', 'Asiimov', 2, 5.5, 'blocks', ['#f8fafc', '#f97316', '#111827']),
  // ---------- covert ----------
  S('AK-47', 'ak', 'Vulcan', 3, 95, 'blocks', ['#e5e7eb', '#0ea5e9', '#111827']),
  S('AWP', 'awp', 'Asiimov', 3, 120, 'blocks', ['#f8fafc', '#f97316', '#111827']),
  S('M4A4', 'm4', 'Howl', 3, 2400, 'tiger', ['#f97316', '#7f1d1d']),
  S('AK-47', 'ak', 'Fire Serpent', 3, 650, 'tiger', ['#4d7c0f', '#facc15']),
  S('Desert Eagle', 'deagle', 'Blaze', 3, 420, 'fade', ['#fde047', '#f97316', '#dc2626']),
  S('M4A1-S', 'usp', 'Printstream', 3, 140, 'marble', ['#f8fafc', '#111827']),
  S('AWP', 'awp', 'Dragon Lore', 3, 9500, 'dragon', ['#d6b26a', '#14532d', '#7f1d1d']),
  S('AK-47', 'ak', 'Wild Lotus', 3, 6200, 'marble', ['#14532d', '#f9a8d4']),
  S('Glock-18', 'pistol', 'Fade', 3, 1100, 'fade', ['#f472b6', '#a855f7', '#fde047']),
  S('AWP', 'awp', 'Gungnir', 3, 11000, 'marble', ['#1e3a8a', '#fde68a']),
  S('USP-S', 'usp', 'Printstream', 3, 90, 'marble', ['#111827', '#f8fafc']),
  // ---------- gold ----------
  S('★ Karambit', 'karambit', 'Doppler', 4, 950, 'doppler', ['#1e1b4b', '#db2777', '#38bdf8']),
  S('★ Karambit', 'karambit', 'Fade', 4, 1500, 'fade', ['#fde047', '#f472b6', '#a855f7']),
  S('★ Karambit', 'karambit', 'Lore', 4, 1800, 'dragon', ['#d6b26a', '#14532d', '#78350f']),
  S('★ Butterfly', 'butterfly', 'Crimson Web', 4, 1300, 'web', ['#991b1b', '#111']),
  S('★ Butterfly', 'butterfly', 'Tiger Tooth', 4, 1100, 'tiger', ['#facc15', '#78350f']),
  S('★ Butterfly', 'butterfly', 'Gamma Doppler', 4, 2800, 'doppler', ['#052e16', '#22c55e', '#a3e635']),
  S('★ M9 Bayonet', 'bayonet', 'Marble Fade', 4, 900, 'fade', ['#ef4444', '#facc15', '#3b82f6']),
  S('★ M9 Bayonet', 'bayonet', 'Slaughter', 4, 620, 'marble', ['#fda4af', '#b91c1c']),
  S('★ M9 Bayonet', 'bayonet', 'Safari Mesh', 4, 140, 'hex', ['#78716c', '#d6d3d1']),
  S('★ Karambit', 'karambit', 'Case Hardened', 4, 700, 'marble', ['#1e40af', '#ca8a04']),
  S('★ Bayonet', 'bayonet', 'Urban Masked', 4, 180, 'camo', ['#6b7280', '#d1d5db', '#374151']),
  S('★ Butterfly', 'butterfly', 'Emerald', 4, 9800, 'doppler', ['#022c22', '#10b981', '#6ee7b7']),
  S('★ Karambit', 'karambit', 'Sapphire', 4, 14000, 'doppler', ['#0c1445', '#2563eb', '#93c5fd']),
].map((s, i) => ({ ...s, id: i }));

const byName = (key) => {
  const [w, n] = key.split('|');
  const s = SKINS.find((x) => x.w.replace('★ ', '') === w && x.n === n);
  if (!s) throw new Error('skin? ' + key);
  return s.id;
};
const C = (id, name, color, keys, odds) => ({ id, name, color, odds, items: keys.map(byName) });

// Cases: odds per rarity use CASE_ODDS unless given.
export const CASES = [
  C('recrue', 'Caisse Recrue', '#64748b', ['P250|Sable du désert', 'MAC-10|Néon Bleu', 'Nova|Rouille', 'UMP-45|Arctique', 'Tec-9|Isotope', 'P90|Carbone',
    'M4A1-S|Nitro', 'P250|Asiimov', 'MP9|Illumination', 'XM1014|Incinérateur', 'Desert Eagle|Code Rouge', 'P90|Asiimov', 'MAC-10|Neon Rider',
    'AK-47|Vulcan', 'USP-S|Printstream', 'M9 Bayonet|Safari Mesh', 'Bayonet|Urban Masked']),
  C('spectre', 'Caisse Spectre', '#4b69ff', ['MP9|Rose Hydrique', 'Glock-18|Hex Océan', 'Galil AR|Brique', 'Five-SeveN|Violet Électrique', 'SSG 08|Abysse',
    'USP-S|Orion', 'AK-47|Élite Bleue', 'Glock-18|Eau Sauvage', 'AWP|Atheris', 'AK-47|Redline', 'AWP|Hyper Beast', 'M4A4|Néo-Noir',
    'AWP|Asiimov', 'M4A1-S|Printstream', 'Karambit|Case Hardened', 'M9 Bayonet|Slaughter', 'Butterfly|Crimson Web']),
  C('neon', 'Caisse Néon', '#d946ef', ['MAC-10|Néon Bleu', 'FAMAS|Commando', 'Five-SeveN|Violet Électrique', 'P90|Carbone', 'Tec-9|Isotope',
    'Desert Eagle|Conspiration', 'MP9|Illumination', 'M4A4|Évolution', 'XM1014|Incinérateur', 'Glock-18|Vogue', 'MAC-10|Neon Rider', 'USP-S|Kill Confirmed',
    'Desert Eagle|Blaze', 'Glock-18|Fade', 'Karambit|Fade', 'M9 Bayonet|Marble Fade', 'Butterfly|Gamma Doppler']),
  C('dragon', 'Caisse Dragon', '#dc2626', ['P250|Sable du désert', 'Glock-18|Hex Océan', 'SSG 08|Abysse', 'Galil AR|Brique',
    'AK-47|Élite Bleue', 'AWP|Atheris', 'M4A4|Évolution', 'AK-47|Redline', 'AWP|Hyper Beast', 'M4A1-S|Golden Coil',
    'AK-47|Fire Serpent', 'M4A4|Howl', 'Karambit|Lore', 'Butterfly|Tiger Tooth', 'Karambit|Doppler']),
  C('elite', 'Caisse Élite', '#eab308', ['AK-47|Élite Bleue', 'AWP|Atheris', 'M4A4|Évolution', 'USP-S|Orion',
    'AK-47|Redline', 'M4A1-S|Golden Coil', 'AWP|Hyper Beast', 'USP-S|Kill Confirmed', 'M4A4|Néo-Noir',
    'AWP|Asiimov', 'AK-47|Vulcan', 'Desert Eagle|Blaze', 'M4A1-S|Printstream', 'Karambit|Doppler', 'Butterfly|Tiger Tooth', 'M9 Bayonet|Marble Fade'], [0, 0.62, 0.27, 0.085, 0.025]),
  C('lames', 'Caisse des Lames', '#f59e0b', ['AK-47|Redline', 'AWP|Hyper Beast', 'USP-S|Kill Confirmed', 'AWP|Asiimov', 'AK-47|Vulcan', 'Glock-18|Fade',
    'Bayonet|Urban Masked', 'M9 Bayonet|Safari Mesh', 'M9 Bayonet|Slaughter', 'Karambit|Case Hardened', 'Karambit|Doppler', 'Butterfly|Tiger Tooth',
    'M9 Bayonet|Marble Fade', 'Butterfly|Crimson Web', 'Karambit|Fade'], [0, 0, 0.55, 0.3, 0.15]),
  C('milliard', 'Caisse Milliardaire', '#10b981', ['USP-S|Kill Confirmed', 'AWP|Hyper Beast', 'M4A4|Howl', 'AK-47|Fire Serpent', 'AK-47|Wild Lotus',
    'AWP|Dragon Lore', 'AWP|Gungnir', 'Desert Eagle|Blaze', 'Glock-18|Fade', 'Karambit|Lore', 'Butterfly|Gamma Doppler', 'Butterfly|Emerald', 'Karambit|Sapphire'], [0, 0, 0.6, 0.3, 0.1]),
];

const STAT_MUL = 1.6, STAT_P = 0.1;
const WEAR_EV = (() => { let prev = 0, ev = 0; for (const w of WEARS) { ev += (w.max - prev) * w.mul; prev = w.max; } return ev; })();

export function caseRarities(c) {
  const odds = c.odds || CASE_ODDS;
  return odds.map((o, r) => ({ r, o, items: c.items.filter((id) => SKINS[id].r === r) })).filter((x) => x.o > 0 && x.items.length);
}
export function caseEV(c) {
  const groups = caseRarities(c);
  const tot = groups.reduce((a, g) => a + g.o, 0);
  let ev = 0;
  for (const g of groups) {
    const avg = g.items.reduce((a, id) => a + SKINS[id].p, 0) / g.items.length;
    ev += (g.o / tot) * avg;
  }
  return ev * WEAR_EV * (1 - STAT_P + STAT_P * STAT_MUL);
}
// Price includes ~10 % margin like real case sites.
CASES.forEach((c) => { c.price = round2(caseEV(c) * 1.1); });

export function itemOdds(c) {
  const groups = caseRarities(c);
  const tot = groups.reduce((a, g) => a + g.o, 0);
  const out = [];
  for (const g of groups) for (const id of g.items) out.push({ id, p: g.o / tot / g.items.length });
  return out.sort((a, b) => SKINS[b.id].p - SKINS[a.id].p);
}

// Roll one item from a case with 3 floats [rarity/item, wear, stattrak].
export function rollCase(c, f1, f2, f3) {
  const odds = itemOdds(c);
  let x = f1;
  let pick = odds[odds.length - 1];
  for (const o of odds) { x -= o.p; if (x < 0) { pick = o; break; } }
  return makeItem(pick.id, f2, f3 < STAT_P);
}

export function makeItem(skinId, float, st) {
  const s = SKINS[skinId];
  const wear = wearOf(float);
  return { kind: 'skin', sid: skinId, float: +float.toFixed(4), wear: wear.k, st: !!st, price: round2(Math.max(0.03, s.p * wear.mul * (st ? STAT_MUL : 1))) };
}

export const fullName = (it) => { const s = SKINS[it.sid]; return `${it.st ? 'StatTrak™ ' : ''}${s.w} | ${s.n}`; };
