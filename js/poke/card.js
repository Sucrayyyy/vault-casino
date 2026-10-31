// Trading card rendering with holo foil, tilt and booster pack art.
import { TYPES, RARITY, isFullArt, setById, ART } from './data.js';
import { css, esc, fmt, COIN } from '../ui.js';

css('pcard', `
.pcard { --w: 150px; width: var(--w); aspect-ratio: 63/88; border-radius: calc(var(--w) * .05); position: relative; flex: none; transform-style: preserve-3d; transition: transform .15s ease-out, box-shadow .2s; box-shadow: 0 8px 20px rgba(0,0,0,.45); font-size: calc(var(--w) * .062); color: #1b1b1b; --mx: 50%; --my: 50%; --rx: 0deg; --ry: 0deg; transform: rotateX(var(--rx)) rotateY(var(--ry)); user-select: none; -webkit-user-select: none; }
.pcard .frame { position: absolute; inset: 0; border-radius: inherit; padding: calc(var(--w) * .035); background: linear-gradient(135deg, #e6e9ee, #b9c0c9 40%, #eef1f4 60%, #9aa3ad); overflow: hidden; }
.pcard.vintage .frame { background: linear-gradient(135deg, #ffe45c, #f2c21b); }
.pcard .inner { position: relative; height: 100%; border-radius: calc(var(--w) * .02); background: linear-gradient(170deg, var(--c1), var(--c2)); overflow: hidden; display: flex; flex-direction: column; padding: calc(var(--w) * .025); }
.pcard .top { display: flex; align-items: baseline; justify-content: space-between; font-weight: 900; line-height: 1.1; gap: 4px; }
.pcard .top .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1.15em; }
.pcard .top .hp { white-space: nowrap; font-size: .95em; display: flex; align-items: center; gap: 2px; }
.pcard .top .hp small { font-size: .62em; }
.pcard .en { width: 1.15em; height: 1.15em; border-radius: 50%; display: inline-block; background: radial-gradient(circle at 35% 30%, #fff8, transparent 50%), var(--c1); border: 1.5px solid rgba(0,0,0,.35); flex: none; }
.pcard .win { position: relative; margin-top: 3%; height: 46%; border: calc(var(--w) * .014) solid #d9b54a; background: radial-gradient(circle at 50% 60%, #fff, var(--c1)); box-shadow: inset 0 0 8px rgba(0,0,0,.3); overflow: hidden; }
.pcard .win img, .pcard .fa img { position: absolute; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 4px rgba(0,0,0,.35)); }
.pcard .win .fb, .pcard .fa .fb { position: absolute; inset: 0; display: grid; place-items: center; font-size: 2.6em; font-weight: 900; color: rgba(0,0,0,.25); }
.pcard .txt { flex: 1; margin-top: 4%; background: rgba(255,255,255,.55); border-radius: 3px; padding: 4% 5%; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.pcard .atk { display: flex; justify-content: space-between; font-weight: 900; font-size: .95em; align-items: center; gap: 4px; }
.pcard .atk .cost { display: flex; gap: 1px; }
.pcard .atk .cost .en { width: .9em; height: .9em; }
.pcard .flav { font-size: .66em; font-style: italic; opacity: .7; line-height: 1.25; font-weight: 600; }
.pcard .foot { display: flex; justify-content: space-between; align-items: center; font-size: .62em; font-weight: 800; margin-top: 3%; opacity: .85; }
.pcard .first { position: absolute; left: 5%; top: 52%; width: 1.7em; height: 1.7em; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-size: .7em; font-weight: 900; border: 1px solid #fff; z-index: 2; }

/* Full art family */
.pcard.full .inner { padding: 0; background: radial-gradient(circle at 30% 20%, var(--c1), var(--c2) 70%); }
.pcard.full .fa { position: absolute; inset: 0; }
.pcard.full .fa img { width: 150%; height: 150%; left: -25%; top: -6%; object-fit: contain; }
.pcard.full .top, .pcard.full .foot { position: relative; z-index: 2; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.8); padding: 4% 5% 0; }
.pcard.full .foot { position: absolute; left: 0; right: 0; bottom: 3%; padding: 0 5%; }
.pcard.full .bands { position: absolute; inset: 0; background: repeating-linear-gradient(115deg, rgba(255,255,255,.12) 0 6px, transparent 6px 18px); }
.pcard.r-SIR .inner { background: conic-gradient(from 200deg at 60% 40%, var(--c1), #ffd6f5, var(--c2), #b8f0ff, var(--c1)); }
.pcard.r-SIR .fa img { filter: saturate(1.25) drop-shadow(0 6px 10px rgba(0,0,0,.4)); }
.pcard.r-IR .inner { background: linear-gradient(160deg, #fdf3d3, var(--c1) 60%, var(--c2)); }
.pcard.r-HR .frame, .pcard.r-HR .inner { background: linear-gradient(135deg, #fff2b0, #e2b13c 30%, #fff5c9 50%, #b9861a 75%, #ffe9a3); }
.pcard.r-HR .fa img { filter: sepia(1) saturate(2.6) hue-rotate(-12deg) brightness(1.08) contrast(1.1) drop-shadow(0 4px 8px rgba(120,80,0,.5)); }
.pcard.r-HR .top, .pcard.r-HR .foot { color: #4a3200; text-shadow: 0 1px 0 rgba(255,255,255,.6); }
.pcard.r-UR .inner { background: linear-gradient(160deg, #e9edf3, var(--c1) 50%, #6b7280); }

/* foil */
.pcard .holo, .pcard .glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 5; }
.pcard .holo { opacity: 0; mix-blend-mode: color-dodge; background-image: repeating-linear-gradient(110deg, #ff3d6e 0%, #ffd23f 6%, #3dff9e 12%, #3dd6ff 18%, #b23dff 24%, #ff3d6e 30%); background-size: 300% 300%; background-position: var(--mx) var(--my); filter: brightness(.8) contrast(1.4); transition: opacity .3s; }
.pcard .glare { background: radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,.55), transparent 45%); mix-blend-mode: overlay; opacity: .7; }
.pcard.holo-on .holo { opacity: .45; }
.pcard.r-R .holo, .pcard.r-H .holo { opacity: .38; -webkit-mask: linear-gradient(#000,#000); }
.pcard.rev .holo { opacity: .28; background-image: repeating-radial-gradient(circle at var(--mx) var(--my), #fff 0 1px, transparent 1px 7px), repeating-linear-gradient(110deg, #ff3d6e 0%, #ffd23f 8%, #3dff9e 16%, #3dd6ff 24%, #b23dff 32%, #ff3d6e 40%); }
.pcard.r-SIR .holo, .pcard.r-HR .holo, .pcard.r-UR .holo { opacity: .62; }
.pcard.r-IR .holo, .pcard.r-RR .holo { opacity: .5; }
.pcard.r-SIR, .pcard.r-HR { box-shadow: 0 0 24px rgba(255,214,107,.55), 0 10px 26px rgba(0,0,0,.5); }

/* back */
.pcard.back .frame { background: linear-gradient(135deg, #1b3a6b, #0c1f3d); padding: calc(var(--w) * .05); }
.pcard.back .inner { background: radial-gradient(circle at 50% 50%, #2d6cdf, #10285a 60%, #0a1838); display: grid; place-items: center; }
.pcard.back .inner::before { content: ''; position: absolute; inset: 0; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,.06) 0 10deg, transparent 10deg 20deg); }
.pcard.back .logo-b { position: relative; width: 52%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #5dff5e, #00a801); box-shadow: 0 0 0 calc(var(--w) * .02) #fff, 0 0 30px rgba(0,231,1,.6); display: grid; place-items: center; font-weight: 900; font-style: italic; color: #013e01; font-size: 1.6em; }

.pcard-price { display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 4px; font-weight: 800; }
.pcard-price .rar { color: var(--txt3); font-size: 10px; white-space: nowrap; }
.pcard-price .rar.hit { color: #ffd66b; }
`);

const typeVars = (t) => `--c1:${TYPES[t].c1};--c2:${TYPES[t].c2}`;
const energy = (t) => `<i class="en" style="--c1:${TYPES[t].c1}"></i>`;
const img = (dex) => `<img src="${ART(dex)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="fb" style="display:none">?</div>`;

export function cardHTML(card, { rev = false, first = false, w = 150, cls = '' } = {}) {
  const set = setById[card.set];
  const R = RARITY[card.r];
  const full = isFullArt(card.r);
  const holo = card.r !== 'C' && card.r !== 'U' || rev;
  const classes = `pcard r-${card.r} ${full ? 'full' : ''} ${set?.vintage ? 'vintage' : ''} ${rev ? 'rev' : ''} ${holo ? 'holo-on' : ''} ${cls}`;
  const foot = `<div class="foot"><span>${set?.vintage ? 'Wizards' : 'VLT'} · ${String(card.no || 0).padStart(3, '0')}/${set?.cards.length || '???'}</span><span>${R.sym}</span></div>`;
  const body = full
    ? `<div class="fa">${img(card.dex)}</div><div class="bands"></div><div class="top"><span class="nm">${esc(card.name)}</span><span class="hp"><small>PV</small>${card.hp}${energy(card.t)}</span></div>${foot}`
    : `<div class="top"><span class="nm">${esc(card.name)}</span><span class="hp"><small>PV</small>${card.hp}${energy(card.t)}</span></div>
       <div class="win">${img(card.dex)}</div>
       <div class="txt"><div class="atk"><span class="cost">${energy(card.t)}${card.dmg > 50 ? energy('C') : ''}</span><span style="flex:1;margin-left:4px">${card.atk}</span><span>${card.dmg}</span></div><div class="flav">Pokémon de type ${TYPES[card.t].n}. ${card.r === 'PR' ? 'Carte promo exclusive.' : ''}</div></div>
       ${foot}`;
  return `<div class="${classes}" style="--w:${w}px;${typeVars(card.t)}"><div class="frame"><div class="inner">${body}</div></div>${first ? '<div class="first">1</div>' : ''}<div class="holo"></div><div class="glare"></div></div>`;
}

export const backHTML = (w = 150) => `<div class="pcard back" style="--w:${w}px"><div class="frame"><div class="inner"><div class="logo-b">V</div></div></div><div class="glare"></div></div>`;

// Mouse / touch tilt on a container of cards
export function enableTilt(root) {
  const move = (e) => {
    const card = e.target.closest?.('.pcard');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width), y = ((e.clientY - r.top) / r.height);
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
    card.style.setProperty('--rx', `${(0.5 - y) * 18}deg`);
    card.style.setProperty('--ry', `${(x - 0.5) * 22}deg`);
  };
  const reset = (e) => {
    const card = e.target.closest?.('.pcard');
    if (!card) return;
    card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
  };
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerleave', reset, true);
  root.addEventListener('pointerup', reset, true);
}

// Device tilt (iPhone needs an explicit permission prompt from a tap)
let motionOn = false;
export async function enableMotion() {
  if (motionOn) return;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      const p = await DeviceOrientationEvent.requestPermission();
      if (p !== 'granted') return;
    }
  } catch (e) { return; }
  motionOn = true;
  window.addEventListener('deviceorientation', (e) => {
    const g = Math.max(-30, Math.min(30, e.gamma || 0)), b = Math.max(-30, Math.min(30, (e.beta || 45) - 45));
    document.querySelectorAll('.pcard.holo-on, .pcard.big').forEach((c) => {
      c.style.setProperty('--mx', `${50 + g * 1.6}%`);
      c.style.setProperty('--my', `${50 + b * 1.6}%`);
    });
  });
}

// Booster pack art
let pid = 0;
export function packSVG(set, w = 140) {
  const id = `pk${++pid}`;
  const zigTop = Array.from({ length: 15 }, (_, i) => `L${i * 10 + 5} 12 L${i * 10 + 10} 16`).join(' ');
  const zigBot = Array.from({ length: 15 }, (_, i) => `L${145 - i * 10} 238 L${140 - i * 10} 234`).join(' ');
  return `<svg viewBox="0 0 150 250" width="${w}" class="pack" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${set.color}"/><stop offset=".55" stop-color="${set.color2}"/><stop offset="1" stop-color="${set.color}"/></linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".45"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="${id}c"><path d="M0 16 ${zigTop} L150 234 ${zigBot} Z"/></clipPath></defs>
    <g clip-path="url(#${id}c)">
      <rect width="150" height="250" fill="url(#${id}a)"/>
      <path d="M-20 200 L170 60 L170 110 L-20 250Z" fill="rgba(255,255,255,.12)"/>
      <circle cx="75" cy="118" r="54" fill="rgba(255,255,255,.18)"/>
      <image href="${ART(set.cover)}" x="15" y="58" width="120" height="120"/>
      <rect x="0" y="16" width="150" height="34" fill="rgba(0,0,0,.35)"/>
      <text x="75" y="38" text-anchor="middle" font-family="Inter" font-weight="900" font-style="italic" font-size="${set.name.length > 14 ? 11 : 15}" fill="#fff">${esc(set.name.toUpperCase())}</text>
      <rect x="0" y="196" width="150" height="38" fill="rgba(0,0,0,.4)"/>
      <text x="75" y="214" text-anchor="middle" font-family="Inter" font-weight="900" font-size="11" fill="#ffd66b" letter-spacing="2">VAULT TCG</text>
      <text x="75" y="227" text-anchor="middle" font-family="Inter" font-weight="700" font-size="7.5" fill="#fff" opacity=".8">${set.vintage ? '11' : '10'} CARTES · ${esc(set.era.toUpperCase())}</text>
      <rect width="150" height="250" fill="url(#${id}b)" class="shine"/>
    </g>
    <path d="M0 16 ${zigTop}" stroke="rgba(255,255,255,.6)" fill="none"/>
  </svg>`;
}

export function boxSVG(set, kind, w = 150) {
  const id = `bx${++pid}`;
  const label = kind === 'etb' ? 'COFFRET DRESSEUR D’ÉLITE' : '36 BOOSTERS';
  return `<svg viewBox="0 0 180 150" width="${w}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${set.color}"/><stop offset="1" stop-color="${set.color2}"/></linearGradient></defs>
    <ellipse cx="90" cy="140" rx="74" ry="7" fill="rgba(0,0,0,.4)"/>
    <path d="M14 40 L90 18 L166 40 L166 120 L90 142 L14 120Z" fill="url(#${id})"/>
    <path d="M14 40 L90 62 L166 40 L90 18Z" fill="rgba(255,255,255,.28)"/>
    <path d="M90 62 V142" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <path d="M90 62 L166 40 L166 120 L90 142Z" fill="rgba(0,0,0,.18)"/>
    ${kind === 'etb' ? `<image href="${ART(set.cover)}" x="20" y="54" width="68" height="68"/>` : Array.from({ length: 6 }, (_, i) => `<rect x="${22 + i * 11}" y="${50 + (i % 2) * 3}" width="9" height="40" rx="1.5" fill="${i % 2 ? set.color2 : set.color}" stroke="rgba(255,255,255,.6)" stroke-width=".8" transform="skewY(16)"/>`).join('')}
    <text x="128" y="86" text-anchor="middle" font-family="Inter" font-weight="900" font-size="8" fill="#fff" transform="skewY(-16) translate(0 36)">${label.length > 14 ? 'ETB' : '×36'}</text>
    <text x="52" y="132" text-anchor="middle" font-family="Inter" font-weight="900" font-size="7" fill="#fff" transform="skewY(16) translate(0 -14)">${esc(set.name.toUpperCase())}</text>
  </svg>`;
}

export const priceRow = (price, r) => `<div class="pcard-price"><span class="amt">${COIN}${fmt(price)}</span><span class="rar ${RARITY[r].lvl >= 2 ? 'hit' : ''}">${RARITY[r].s}</span></div>`;
