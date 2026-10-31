// Card / booster / box visuals built on the real card scans (lightweight for mobile GPUs).
import { TIER, cardImg, logoURL } from './data.js';
import { css, esc, fmt, COIN } from '../ui.js';

css('tcard', `
.tc { --w: 150px; width: var(--w); aspect-ratio: 63/88; position: relative; border-radius: calc(var(--w) * .045); overflow: hidden; background: #1b2a36; box-shadow: 0 6px 16px rgba(0,0,0,.45); flex: none; contain: layout paint; }
.tc img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.tc .ph { position: absolute; inset: 0; background: linear-gradient(110deg, #1b2a36 30%, #253b4b 50%, #1b2a36 70%) 0 0 / 300% 100%; animation: phShimmer 1.2s linear infinite; }
@keyframes phShimmer { to { background-position: -150% 0; } }
.tc .foil { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: color-dodge; opacity: .32; background: linear-gradient(115deg, transparent 20%, #ff5c8a 32%, #ffd84d 40%, #5cffb1 48%, #5cc8ff 56%, #b45cff 64%, transparent 76%) var(--fx, 50%) 0 / 260% 100%; }
.tc.rev .foil { opacity: .22; }
.tc.lvl3 .foil, .tc.lvl4 .foil { opacity: .42; }
.tc .shine { position: absolute; inset: -20%; pointer-events: none; background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.55) 50%, transparent 60%); transform: translateX(-120%); }
.tc.sweep .shine { animation: sweep 1.1s .1s ease-out forwards; }
@keyframes sweep { to { transform: translateX(120%); } }
.tc .first { position: absolute; left: 6%; top: 52%; padding: 2px 5px; border-radius: 4px; background: #111; color: #fff; font-size: 9px; font-weight: 900; border: 1px solid #fff; }
.tc.lvl4 { box-shadow: 0 0 22px rgba(255,214,107,.55), 0 8px 20px rgba(0,0,0,.5); }
.tc.lvl3 { box-shadow: 0 0 16px rgba(196,181,253,.45), 0 8px 20px rgba(0,0,0,.5); }
.tc.missing img { filter: grayscale(1) brightness(.28) contrast(.9); }
.tc.missing::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0 6px, transparent 6px 12px); }
.tc .lockic { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,.35); }

.cprice { display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 4px; font-weight: 800; gap: 4px; }
.cprice .rar { color: var(--txt3); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cprice .rar.hit { color: #ffd66b; }

.pack { position: relative; width: var(--pw, 180px); aspect-ratio: 0.56; border-radius: 4px 4px 6px 6px; overflow: hidden; background: hsl(var(--h) 60% 25%); box-shadow: 0 18px 30px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.25); }
.pack .art { position: absolute; inset: 0; }
.pack .art img { position: absolute; height: 182%; width: auto; max-width: none; left: 50%; top: -11%; transform: translateX(-50%); }
.pack .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.55) 0%, transparent 26%, transparent 66%, rgba(0,0,0,.7) 100%); }
.pack .foilpat { position: absolute; inset: 0; background: repeating-linear-gradient(100deg, rgba(255,255,255,.06) 0 2px, transparent 2px 9px); mix-blend-mode: overlay; }
.pack .crimp { position: absolute; left: 0; right: 0; height: 6.5%; z-index: 3; background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(190,200,210,.35)), repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 5px); background-blend-mode: multiply; background-color: hsl(var(--h) 50% 70%); }
.pack .crimp.t { top: 0; border-bottom: 1px solid rgba(0,0,0,.25); } .pack .crimp.b { bottom: 0; border-top: 1px solid rgba(0,0,0,.25); }
.pack .logo { position: absolute; left: 7%; right: 7%; top: 8.5%; height: 17%; display: grid; place-items: center; z-index: 2; }
.pack .logo img { max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 3px 5px rgba(0,0,0,.7)); }
.pack .logo b { font-weight: 900; font-style: italic; color: #fff; font-size: calc(var(--pw, 180px) * .1); text-align: center; line-height: 1.05; text-shadow: 0 2px 6px rgba(0,0,0,.8); }
.pack .band { position: absolute; left: 0; right: 0; bottom: 7.5%; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 0 8%; font-weight: 900; font-size: calc(var(--pw, 180px) * .055); color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.8); letter-spacing: .5px; }
.pack .band span:last-child { color: #ffe08a; }
.pack .sheen { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.4) 48%, transparent 60%); transform: translateX(-100%); animation: packSheen 3.5s ease-in-out infinite; z-index: 4; }
@keyframes packSheen { 60%, 100% { transform: translateX(100%); } }

.box3d { position: relative; width: var(--bw, 200px); aspect-ratio: 1.25; perspective: 600px; }
.box3d .face { position: absolute; inset: 8% 6% 4%; border-radius: 8px; overflow: hidden; background: linear-gradient(160deg, hsl(var(--h) 75% 50%), hsl(calc(var(--h) + 40) 70% 25%)); box-shadow: 0 18px 30px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.2); transform: rotateX(8deg) rotateY(-14deg); }
.box3d .face .art { position: absolute; right: 6%; top: 10%; width: 44%; aspect-ratio: 63/88; border-radius: 5px; overflow: hidden; box-shadow: 0 6px 12px rgba(0,0,0,.5); transform: rotate(6deg); }
.box3d .face .art img { width: 100%; height: 100%; object-fit: cover; }
.box3d .face .logo { position: absolute; left: 6%; top: 12%; width: 46%; height: 30%; display: grid; place-items: center; }
.box3d .face .logo img { max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 3px 4px rgba(0,0,0,.5)); }
.box3d .face .lbl { position: absolute; left: 6%; bottom: 10%; font-weight: 900; font-size: 13px; color: #fff; text-shadow: 0 2px 3px rgba(0,0,0,.5); line-height: 1.15; }
.box3d .face .lbl small { display: block; font-size: 10px; color: #ffe08a; letter-spacing: 1px; }
.box3d .face::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.25) 50%, transparent 60%); }
`);

export const hueOf = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
export const lvlOf = (c) => TIER[c.tier].lvl;

export function cardHTML(set, c, { rev = false, first = false, w = 150, q = 'low', cls = '', missing = false } = {}) {
  const lvl = lvlOf(c);
  const foil = lvl >= 2 || rev;
  return `<div class="tc lvl${lvl} ${rev ? 'rev' : ''} ${missing ? 'missing' : ''} ${cls}" style="--w:${w}px"><div class="ph"></div><img crossorigin="anonymous" src="${cardImg(set, c, q)}" alt="${esc(c.name)}" loading="lazy" decoding="async" draggable="false" onload="this.previousElementSibling&&this.previousElementSibling.remove()">${foil && !missing ? '<div class="foil"></div><div class="shine"></div>' : ''}${first ? '<div class="first">1re ÉD.</div>' : ''}</div>`;
}

export function packHTML(set, cover, w = 180) {
  const logo = logoURL(set);
  return `<div class="pack" style="--pw:${w}px;--h:${hueOf(set.id)}">
    ${cover ? `<div class="art"><img crossorigin="anonymous" src="${cardImg(set, cover, 'high')}" alt="" draggable="false"></div>` : ''}
    <div class="shade"></div><div class="foilpat"></div><div class="crimp t"></div>
    <div class="logo">${logo ? `<img crossorigin="anonymous" src="${logo}" alt="" draggable="false">` : `<b>${esc(set.name)}</b>`}</div>
    <div class="band"><span>${set.era === 'wotc' ? 11 : set.era === 'cel' ? 4 : 10} CARTES</span><span>BOOSTER</span></div>
    <div class="sheen"></div><div class="crimp b"></div></div>`;
}

// Pack artworks: the set's full-art illustrations, like the several pack designs of a real expansion
export function packCovers(set) {
  const full = set.cards.filter((c) => ['SIR', 'IR', 'UR', 'HR', 'H'].includes(c.tier)).sort((a, b) => b.price - a.price);
  return (full.length ? full : [...set.cards].sort((a, b) => b.price - a.price)).slice(0, 4);
}

export function boxHTML(set, cover, kind, w = 220) {
  const logo = logoURL(set);
  return `<div class="box3d" style="--bw:${w}px;--h:${hueOf(set.id)}"><div class="face">
    <div class="logo">${logo ? `<img crossorigin="anonymous" src="${logo}" alt="">` : ''}</div>
    ${cover ? `<div class="art"><img crossorigin="anonymous" src="${cardImg(set, cover, 'low')}" alt=""></div>` : ''}
    <div class="lbl"><small>${kind === 'etb' ? 'COFFRET DRESSEUR D’ÉLITE' : 'DISPLAY'}</small>${kind === 'etb' ? '9 boosters' : '36 boosters'}</div></div></div>`;
}

export const priceRow = (price, c) => `<div class="cprice"><span class="amt">${COIN}${fmt(price)}</span><span class="rar ${lvlOf(c) >= 2 ? 'hit' : ''}">${esc(c.rar)}</span></div>`;

// Light tilt for one big card (pointer + device orientation)
export function tilt(card) {
  const set = (x, y) => {
    card.style.transform = `perspective(700px) rotateX(${(0.5 - y) * 14}deg) rotateY(${(x - 0.5) * 18}deg)`;
    card.style.setProperty('--fx', `${x * 100}%`);
  };
  card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
}
let motion = false;
export async function enableMotion() {
  if (motion) return;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return;
    }
  } catch (e) { return; }
  motion = true;
  let pending = false, g = 0;
  window.addEventListener('deviceorientation', (e) => {
    g = e.gamma || 0;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const top = document.querySelector('.po-card.top .tc, .tc.big');
      if (top) top.style.setProperty('--fx', `${50 + Math.max(-30, Math.min(30, g)) * 1.6}%`);
    });
  });
}
