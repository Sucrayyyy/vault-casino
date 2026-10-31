// Procedural vector art for skins, cases and item cards.
import { SKINS, SHAPES, RAR, fullName } from './data.js';
import { css, fmt, COIN, esc } from '../ui.js';

let uid = 0;
function patternDefs(id, pat, c) {
  const [a, b, d = b] = c;
  switch (pat) {
    case 'camo':
      return `<pattern id="${id}" width="46" height="30" patternUnits="userSpaceOnUse"><rect width="46" height="30" fill="${a}"/><path d="M4 6q8-6 14 2t12 2 10 6-10 8-16-2-10-16z" fill="${b}"/><path d="M28 0q8 2 10 8t-6 6-8-6 4-8z M0 22q6-4 10 2t-4 6-6-8z" fill="${d}"/></pattern>`;
    case 'stripes':
      return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="14" height="14" fill="${a}"/><rect width="6" height="14" fill="${b}"/></pattern>`;
    case 'hex':
      return `<pattern id="${id}" width="14" height="24" patternUnits="userSpaceOnUse"><rect width="14" height="24" fill="${a}"/><path d="M7 0l7 4v8l-7 4-7-4V4z M7 16v8" fill="none" stroke="${b}" stroke-width="1.4" opacity=".8"/></pattern>`;
    case 'line':
      return `<pattern id="${id}" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="${a}"/><path d="M0 14h14l6-8h20" stroke="${b}" stroke-width="1.6" fill="none"/><circle cx="20" cy="6" r="1.6" fill="${b}"/></pattern>`;
    case 'redline':
      return `<pattern id="${id}" width="200" height="80" patternUnits="userSpaceOnUse"><rect width="200" height="80" fill="${a}"/><path d="M0 31h200 M0 35h200" stroke="${b}" stroke-width="1.6"/><path d="M60 26l20 14 M120 26l14 14" stroke="${b}" stroke-width="2"/><rect width="200" height="80" fill="url(#cf-${id})" opacity=".25"/></pattern><pattern id="cf-${id}" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0h2v2H0zM2 2h2v2H2z" fill="#fff" opacity=".25"/></pattern>`;
    case 'blocks':
      return `<pattern id="${id}" width="200" height="80" patternUnits="userSpaceOnUse"><rect width="200" height="80" fill="${a}"/><path d="M60 0h50l-20 80H40z" fill="${b}"/><path d="M110 0h22l-20 80H90z" fill="${d}"/><path d="M150 0h50v80h-70z" fill="${d}" opacity=".9"/><path d="M0 50h40l-6 30H0z" fill="${b}"/></pattern>`;
    case 'fade':
      return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
    case 'marble':
      return `<radialGradient id="${id}" cx=".55" cy=".4" r=".9"><stop offset="0" stop-color="${b}"/><stop offset=".35" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset=".8" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
    case 'tiger':
      return `<pattern id="${id}" width="24" height="80" patternUnits="userSpaceOnUse"><rect width="24" height="80" fill="${a}"/><path d="M4 0q8 20 0 40t4 40h6q-10-20-2-40T8 0z" fill="${b}"/></pattern>`;
    case 'doppler':
      return `<radialGradient id="${id}" cx=".6" cy=".45" r=".7"><stop offset="0" stop-color="${d}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></radialGradient>`;
    case 'web':
      return `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="${a}"/><path d="M15 0v30M0 15h30M0 0l30 30M30 0L0 30" stroke="${b}" stroke-width=".9"/><circle cx="15" cy="15" r="6" fill="none" stroke="${b}" stroke-width=".9"/><circle cx="15" cy="15" r="12" fill="none" stroke="${b}" stroke-width=".9"/></pattern>`;
    case 'dragon':
      return `<pattern id="${id}" width="200" height="80" patternUnits="userSpaceOnUse"><rect width="200" height="80" fill="${a}"/><path d="M20 40q20-30 50-10t50 0 40-20 40 20" stroke="${b}" stroke-width="7" fill="none"/><path d="M40 50q10-12 20 0t20 0" stroke="${d}" stroke-width="3" fill="none"/><circle cx="150" cy="30" r="4" fill="${d}"/></pattern>`;
    default:
      return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>`;
  }
}

export function weaponSVG(sid, cls = '') {
  const s = SKINS[sid];
  const id = `sk${++uid}`;
  const shape = SHAPES[s.sh];
  return `<svg class="${cls}" viewBox="-4 4 208 76" xmlns="http://www.w3.org/2000/svg"><defs>${patternDefs(id, s.pat, s.c)}<linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
    <g transform="translate(2 4)" opacity=".35"><path d="${shape}" fill="#000"/></g>
    <path d="${shape}" fill="url(#${id})" fill-rule="evenodd" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="${shape}" fill="url(#${id}h)" fill-rule="evenodd"/>
    ${s.sh === 'karambit' ? '<circle cx="22" cy="53" r="5" fill="#0f212e"/>' : ''}
  </svg>`;
}

css('csart', `
.skin { position: relative; border-radius: 8px; background: var(--bg2); overflow: hidden; padding: 8px 8px 9px; display: flex; flex-direction: column; text-align: left; }
.skin::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 40%, var(--rc) 0%, transparent 62%); opacity: .28; }
.skin::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--rc); box-shadow: 0 0 10px var(--rc); }
.skin .art { position: relative; height: 56px; display: flex; align-items: center; justify-content: center; }
.skin .art svg { width: 92%; height: 100%; filter: drop-shadow(0 4px 6px rgba(0,0,0,.4)); }
.skin .w { position: relative; font-size: 10px; color: var(--txt2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
.skin .n { position: relative; font-size: 12px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.skin .pr { position: relative; display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font-size: 11.5px; }
.skin .wr { font-size: 9.5px; color: var(--txt3); font-weight: 800; white-space: nowrap; }
.case-contents .skin .pr { font-size: 10.5px; flex-wrap: wrap; }
.skin .st { color: #cf6a32; }
.skin.sel { outline: 2px solid var(--green); box-shadow: 0 0 0 4px rgba(0,231,1,.2); }
.skin .ck { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--line2); z-index: 2; background: var(--bg); }
.skin.sel .ck { background: var(--green); border-color: var(--green); }
.skin.sel .ck::after { content: '✓'; color: var(--green-ink); font-size: 12px; font-weight: 900; display: grid; place-items: center; height: 100%; }
.skin.gold .n { color: #ffd66b; }
.case-art { width: 100%; aspect-ratio: 1.15; }
`);

export function skinCard(item, { sel = null, odds = null, compact = false } = {}) {
  const s = SKINS[item.sid ?? item.id];
  const r = RAR[s.r];
  return `<div class="skin ${s.r === 4 ? 'gold' : ''} ${sel ? 'sel' : ''}" style="--rc:${r.color}" ${item.id != null && item.sid != null ? `data-id="${item.id}"` : ''}>
    ${sel !== null ? '<div class="ck"></div>' : ''}
    <div class="art">${weaponSVG(s.id)}</div>
    <div class="w">${item.st ? '<span class="st">StatTrak™ </span>' : ''}${esc(s.w)}</div>
    <div class="n">${esc(s.n)}</div>
    <div class="pr"><span class="amt">${COIN}${fmt(item.price ?? s.p)}</span>${odds != null ? `<span class="wr">${odds < 0.01 ? (odds * 100).toFixed(3) : (odds * 100).toFixed(2)} %</span>` : item.wear ? `<span class="wr">${item.wear}</span>` : ''}</div>
  </div>`;
}

// Case box illustration
export function caseSVG(c, featuredSid) {
  const id = `cs${++uid}`;
  return `<svg class="case-art" viewBox="0 0 230 200" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.color}"/><stop offset="1" stop-color="#0b1720"/></linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c.color}" stop-opacity=".6"/><stop offset="1" stop-color="${c.color}" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="115" cy="110" rx="110" ry="80" fill="url(#${id}g)"/>
    <ellipse cx="115" cy="178" rx="86" ry="10" fill="rgba(0,0,0,.45)"/>
    <path d="M30 70 L115 40 L200 70 L200 150 L115 180 L30 150Z" fill="url(#${id}a)" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
    <path d="M30 70 L115 100 L200 70 M115 100 V180" stroke="rgba(0,0,0,.35)" stroke-width="3" fill="none"/>
    <path d="M30 70 L115 40 L200 70 L115 100Z" fill="url(#${id}b)"/>
    <rect x="98" y="106" width="34" height="22" rx="3" fill="#1f2937" stroke="${c.color}" stroke-width="2"/>
    <rect x="110" y="112" width="10" height="10" rx="2" fill="${c.color}"/>
    <path d="M48 112 l40 14 M48 124 l40 14" stroke="rgba(255,255,255,.18)" stroke-width="4"/>
    ${featuredSid != null ? `<g transform="translate(30 118) rotate(-12) scale(.85)">${weaponSVG(featuredSid).replace('<svg', '<svg width="200" height="76"')}</g>` : ''}
  </svg>`;
}

export const itemName = fullName;
