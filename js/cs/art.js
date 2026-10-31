// Item cards and case visuals using the real Steam item images.
import { ITEMS, RAR, imgURL, fullName } from './data.js';
import { css, fmt, COIN, esc } from '../ui.js';

css('csart', `
.skin { position: relative; border-radius: 8px; background: linear-gradient(180deg, #1d3140, #172836); overflow: hidden; padding: 8px 8px 9px; display: flex; flex-direction: column; text-align: left; contain: content; }
.skin::before { content: ''; position: absolute; left: 10%; right: 10%; top: 8%; height: 60%; background: radial-gradient(ellipse at 50% 55%, var(--rc) 0%, transparent 68%); opacity: .38; }
.skin::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--rc); box-shadow: 0 0 10px var(--rc); }
.skin .art { position: relative; height: 64px; display: flex; align-items: center; justify-content: center; }
.skin .art img { max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 4px 5px rgba(0,0,0,.5)); }
.skin .w { position: relative; font-size: 10px; color: var(--txt2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
.skin .n { position: relative; font-size: 12px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.skin .pr { position: relative; display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font-size: 11.5px; gap: 4px; }
.skin .wr { font-size: 9.5px; color: var(--txt3); font-weight: 800; white-space: nowrap; }
.skin .st { color: #cf6a32; }
.skin.sel { outline: 2px solid var(--green); box-shadow: 0 0 0 4px rgba(0,231,1,.2); }
.skin .ck { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--line2); z-index: 2; background: var(--bg); }
.skin.sel .ck { background: var(--green); border-color: var(--green); }
.skin.sel .ck::after { content: ''; position: absolute; left: 4px; top: 1px; width: 5px; height: 9px; border: solid var(--green-ink); border-width: 0 2.5px 2.5px 0; transform: rotate(45deg); }
.skin.gold .n { color: #ffd66b; }
.case-img { width: 100%; aspect-ratio: 1.3; object-fit: contain; filter: drop-shadow(0 10px 14px rgba(0,0,0,.55)); }
`);

const WEAR_ABBR = { FN: 'NEUVE', MW: 'TPU', FT: 'TT', WW: 'USÉE', BS: 'MC' };

export const skinImg = (k, size = 256, cls = '') => `<img class="${cls}" src="${imgURL(ITEMS[k].img, size)}" alt="" loading="lazy" decoding="async" draggable="false">`;

// item: inventory skin {k, wear, st, price} or catalog entry {id}
export function skinCard(item, { sel = null, odds = null } = {}) {
  const k = item.k ?? item.id;
  const s = ITEMS[k];
  const r = RAR[s.r];
  const inv = item.kind === 'skin' && item.id != null;
  return `<div class="skin ${s.r === 4 ? 'gold' : ''} ${sel ? 'sel' : ''}" style="--rc:${r.color}" ${inv ? `data-id="${item.id}"` : ''}>
    ${sel !== null ? '<div class="ck"></div>' : ''}
    <div class="art">${skinImg(k)}</div>
    <div class="w">${item.st ? '<span class="st">StatTrak™ </span>' : ''}${esc(s.w)}</div>
    <div class="n">${esc(s.n)}</div>
    <div class="pr"><span class="amt">${COIN}${fmt(item.price ?? item.ev ?? 0)}</span>${odds != null ? `<span class="wr">${odds < 0.001 ? (odds * 100).toFixed(3) : (odds * 100).toFixed(2)} %</span>` : item.wear ? `<span class="wr">${WEAR_ABBR[item.wear]}</span>` : ''}</div>
  </div>`;
}

export const caseImg = (c, size = 256) => `<img class="case-img" src="${imgURL(c.img, size)}" alt="${esc(c.name)}" loading="lazy" decoding="async" draggable="false">`;
export const itemName = fullName;
