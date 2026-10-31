// "Vaulty", the app mascot (an original smiling vault door), and its unlockable variants.
import { S, settings, saveSettings, cheats, netWorth, bus } from './store.js';

const ACC = {
  shades: '<path d="M16 24h32v4c0 4-3 6-7 6h-3c-3 0-4-2-6-2s-3 2-6 2h-3c-4 0-7-2-7-6z" fill="#0b0b14"/><path d="M19 25h9M37 25h9" stroke="#22d3ee" stroke-width="1.5" opacity=".9"/>',
  eyepatch: '<path d="M8 17l48 14" stroke="#111" stroke-width="2"/><ellipse cx="39" cy="27" rx="7" ry="7.5" fill="#111"/>',
  bandana: '<path d="M8 20c6-12 42-12 48 0-12-4-36-4-48 0z" fill="#dc2626"/><circle cx="20" cy="14" r="1.6" fill="#fff"/><circle cx="32" cy="12" r="1.6" fill="#fff"/><circle cx="44" cy="14" r="1.6" fill="#fff"/><path d="M56 20l6 3-5 3" fill="#dc2626"/>',
  crown: '<path d="M18 9l4 7 5-8 5 8 5-8 5 8 4-7 1 10H17z" fill="#ffd43b" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/><circle cx="32" cy="15" r="1.8" fill="#e11d48"/>',
  halo: '<ellipse cx="32" cy="3.5" rx="14" ry="3.2" fill="none" stroke="#fff7c2" stroke-width="2.4"/>',
  wings: '<path d="M5 30c-6-8-2-18 2-20 0 6 4 10 6 12z" fill="#fff" opacity=".9"/><path d="M59 30c6-8 2-18-2-20 0 6-4 10-6 12z" fill="#fff" opacity=".9"/>',
  visor: '<rect x="15" y="22" width="34" height="9" rx="4.5" fill="#111827"/><rect x="17" y="24" width="30" height="5" rx="2.5" fill="#ef4444"/><rect x="17" y="24" width="10" height="5" rx="2.5" fill="#fca5a5"/>',
  stars: '<path d="M8 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1z M56 48l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z M54 8l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff"/>',
  flames: '<path d="M14 56c-4-6 0-10 2-14 1 4 3 4 4 6 1-4 3-6 3-10 4 5 5 10 3 16z M50 56c4-6 0-10-2-14-1 4-3 4-4 6-1-4-3-6-3-10-4 5-5 10-3 16z" fill="#f97316" opacity=".9"/>',
  sparkles: '<path d="M54 12l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z M10 46l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#e0f2fe"/>',
  bow: '<path d="M32 10l-9-5v10zM32 10l9-5v10z" fill="#ec4899"/><circle cx="32" cy="10" r="2.6" fill="#be185d"/>',
  bolt: '<path d="M33 6l-8 12h6l-3 10 9-13h-6z" fill="#facc15" stroke="#a16207" stroke-width=".8"/>',
};

const RAW = [
  { id: 'gold', name: 'Classique', pal: ['#fff1a8', '#ffc83d', '#e48a00', '#b86a00'], acc: [], how: 'Disponible dès le départ', ok: () => true },
  { id: 'neon', name: 'Néon', pal: ['#cffafe', '#22d3ee', '#7c3aed', '#0e7490'], glow: '#22d3ee', acc: ['shades'], how: 'Place 100 paris', ok: () => S.stats.bets >= 100 },
  { id: 'emerald', name: 'Émeraude', pal: ['#d1fae5', '#34d399', '#047857', '#065f46'], acc: ['sparkles'], how: 'Atteins le VIP Or', ok: () => S.vip >= 3 },
  { id: 'pirate', name: 'Pirate', pal: ['#fde68a', '#d97706', '#78350f', '#7c2d12'], acc: ['bandana', 'eyepatch'], how: 'Ouvre 25 caisses CS', ok: () => S.stats.cases >= 25 },
  { id: 'kawaii', name: 'Kawaii', pal: ['#fce7f3', '#f9a8d4', '#db2777', '#be185d'], acc: ['bow'], how: 'Ouvre 50 boosters', ok: () => S.stats.packs >= 50 },
  { id: 'storm', name: 'Orage', pal: ['#e0e7ff', '#818cf8', '#3730a3', '#312e81'], acc: ['bolt'], how: 'Gagne un pari à ×100', ok: () => S.stats.bestMult >= 100 },
  { id: 'diamond', name: 'Diamant', pal: ['#f0f9ff', '#bae6fd', '#38bdf8', '#0369a1'], glow: '#7dd3fc', acc: ['sparkles'], how: 'Atteins 1 M de fortune', ok: () => S.peak >= 1e6 },
  { id: 'lava', name: 'Lave', pal: ['#fed7aa', '#f97316', '#991b1b', '#7f1d1d'], glow: '#f97316', acc: ['flames'], how: 'Gagne un pari à ×1 000', ok: () => S.stats.bestMult >= 1000 },
  { id: 'cyborg', name: 'Cyborg', pal: ['#f1f5f9', '#94a3b8', '#334155', '#1e293b'], acc: ['visor'], how: 'Ouvre un god pack', ok: () => !!S.ach.godpack },
  { id: 'cosmic', name: 'Cosmique', pal: ['#ede9fe', '#a78bfa', '#4c1d95', '#2e1065'], glow: '#a78bfa', acc: ['stars'], how: 'Débloque 15 succès', ok: () => Object.keys(S.ach).length >= 15 },
  { id: 'king', name: 'Roi', pal: ['#fff7cc', '#facc15', '#a16207', '#854d0e'], glow: '#facc15', acc: ['crown'], how: 'Atteins 100 M de fortune', ok: () => S.peak >= 1e8 },
  { id: 'god', name: 'God', pal: ['#ffffff', '#fef3c7', '#fbbf24', '#d97706'], glow: '#fff7c2', acc: ['wings', 'halo'], how: 'Déverrouille le god mode', ok: () => !!settings.godKey },
];
export const MASCOTS = RAW;
export const isMascotUnlocked = (m) => !!S && (!!cheats.once.allMascots || m.ok());
export const currentMascot = () => {
  const m = RAW.find((x) => x.id === settings.mascot) || RAW[0];
  return S && isMascotUnlocked(m) ? m : RAW[0];
};

let uid = 0;
export function mascotSVG(m = currentMascot(), size = 30, cls = 'logo-mark') {
  const id = `ms${++uid}`;
  const [c1, c2, c3, st] = m.pal;
  const below = m.acc.filter((a) => a === 'wings' || a === 'flames').map((a) => ACC[a]).join('');
  const above = m.acc.filter((a) => a !== 'wings' && a !== 'flames').map((a) => ACC[a]).join('');
  const covered = m.acc.includes('shades') || m.acc.includes('visor');
  return `<svg class="${cls}" viewBox="0 0 64 64" width="${size}" height="${size}" style="${m.glow ? `--mg:${m.glow}` : ''}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>
    ${below}
    <circle cx="32" cy="35" r="26" fill="#000" opacity=".3"/><circle cx="32" cy="33" r="26" fill="url(#${id})" stroke="${st}" stroke-width="2.5"/>
    <circle cx="32" cy="33" r="19.5" fill="none" stroke="${st}" stroke-width="1.3" opacity=".7"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<circle cx="${32 + Math.cos((a * Math.PI) / 180) * 23}" cy="${33 + Math.sin((a * Math.PI) / 180) * 23}" r="1.4" fill="${st}"/>`).join('')}
    ${covered ? '' : `<ellipse cx="25" cy="27" rx="5" ry="6" fill="#fff"/><ellipse cx="39" cy="27" rx="5" ry="6" fill="#fff"/><circle cx="26" cy="28.5" r="2.8" fill="#1b1033"/><circle cx="40" cy="28.5" r="2.8" fill="#1b1033"/><circle cx="27" cy="27.2" r="1" fill="#fff"/><circle cx="41" cy="27.2" r="1" fill="#fff"/>`}
    <path d="M32 31v8M28 35h8" stroke="${st}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M23 42c3 6 15 6 18 0" fill="#5b1d0a" stroke="${st}" stroke-width="1.5"/>
    <ellipse cx="19" cy="37" rx="3" ry="1.8" fill="#ff7a59" opacity=".45"/><ellipse cx="45" cy="37" rx="3" ry="1.8" fill="#ff7a59" opacity=".45"/>
    ${above}</svg>`;
}

export function equipMascot(id) {
  settings.mascot = id;
  saveSettings();
  bus.emit('mascot', id);
  updateHomeIcon();
}

// The home-screen icon is read when the app is added to the home screen: point it at the equipped mascot
export function updateHomeIcon() {
  try {
    const m = currentMascot();
    if (m.id === 'gold') return;
    const svg = mascotSVG(m, 180, '').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 180;
      const g = cv.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 180, 180); bg.addColorStop(0, '#7c3aed'); bg.addColorStop(1, '#06b6d4');
      g.fillStyle = bg; g.fillRect(0, 0, 180, 180);
      g.drawImage(img, 18, 14, 144, 144);
      const link = document.querySelector('link[rel="apple-touch-icon"]');
      if (link) link.href = cv.toDataURL('image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  } catch (e) {}
}

// Announce newly unlocked mascots
const seen = () => (S.mascotsSeen ||= {});
export function checkNewMascots() {
  if (!S) return [];
  const fresh = RAW.filter((m) => m.id !== 'gold' && isMascotUnlocked(m) && !seen()[m.id]);
  fresh.forEach((m) => (seen()[m.id] = 1));
  return fresh;
}
