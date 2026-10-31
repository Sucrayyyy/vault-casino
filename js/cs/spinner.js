// CS-style roll strip (horizontal or vertical) with tick sounds.
import { ITEMS, RAR } from './data.js';
import { skinImg } from './art.js';
import { css, el, $ } from '../ui.js';
import { settings } from '../store.js';
import { sfx } from '../audio.js';

css('spinner', `
.spin { position: relative; overflow: hidden; background: linear-gradient(180deg, #0b1822, #13283a 50%, #0b1822); border-radius: 8px; }
.spin .strip { position: absolute; display: flex; will-change: transform; }
.spin.h .strip { top: 0; bottom: 0; left: 0; flex-direction: row; }
.spin.v .strip { left: 0; right: 0; top: 0; flex-direction: column; }
.spin .cell { flex: none; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid rgba(255,255,255,.04); }
.spin.v .cell { border-right: 0; border-bottom: 1px solid rgba(255,255,255,.04); }
.spin .cell::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, var(--rc), transparent 65%); opacity: .25; }
.spin .cell::after { content: ''; position: absolute; left: 10%; right: 10%; bottom: 0; height: 3px; background: var(--rc); }
.spin .cell img { width: 84%; height: 66%; object-fit: contain; position: relative; filter: drop-shadow(0 3px 4px rgba(0,0,0,.5)); }
.spin .cell .nm { position: relative; font-size: 9.5px; font-weight: 800; color: var(--txt2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 92%; }
.spin .cell .q { position: relative; font-size: 34px; color: #ffd66b; font-weight: 900; text-shadow: 0 0 16px #e4ae39; }
.spin .mark { position: absolute; z-index: 3; background: #ffc800; box-shadow: 0 0 12px #ffc800; pointer-events: none; }
.spin.h .mark { top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; }
.spin.v .mark { left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; }
.spin .mark::before, .spin .mark::after { content: ''; position: absolute; border: 7px solid transparent; }
.spin.h .mark::before { top: 0; left: -6px; border-top-color: #ffc800; }
.spin.h .mark::after { bottom: 0; left: -6px; border-bottom-color: #ffc800; }
.spin.v .mark::before { left: 0; top: -6px; border-left-color: #ffc800; }
.spin.v .mark::after { right: 0; top: -6px; border-right-color: #ffc800; }
.spin .fade { position: absolute; z-index: 2; pointer-events: none; }
.spin.h .fade { top: 0; bottom: 0; width: 18%; }
.spin.h .fade.l { left: 0; background: linear-gradient(90deg, #0b1822, transparent); }
.spin.h .fade.r { right: 0; background: linear-gradient(-90deg, #0b1822, transparent); }
.spin.v .fade { left: 0; right: 0; height: 22%; }
.spin.v .fade.l { top: 0; background: linear-gradient(180deg, #0b1822, transparent); }
.spin.v .fade.r { bottom: 0; background: linear-gradient(0deg, #0b1822, transparent); }
.spin .cell.win { animation: cellWin 1s ease-in-out infinite alternate; }
@keyframes cellWin { to { filter: brightness(1.5); } }
`);

const cellHTML = (k, size, hideGold, showName) => {
  const s = ITEMS[k];
  const gold = s.r === 4 && hideGold;
  return `<div class="cell" style="--rc:${gold ? '#e4ae39' : RAR[s.r].color};${size}">${gold ? '<div class="q">★</div>' : skinImg(k)}${showName && !gold ? `<div class="nm">${s.n}</div>` : ''}</div>`;
};

// Sample a filler skin by case odds
// Visual filler, slightly biased towards shiny items for the "near miss" feeling
function filler(odds) {
  let x = Math.random();
  if (x < 0.06) { const rare = odds.filter((o) => ITEMS[o.id].r >= 3); if (rare.length) return rare[Math.floor(Math.random() * rare.length)].id; }
  x = Math.random();
  for (const o of odds) { x -= o.p; if (x < 0) return o.id; }
  return odds[odds.length - 1].id;
}

export function makeSpinner(container, { vertical = false, cell = 104, cross = 96, names = false } = {}) {
  const sp = el(`<div class="spin ${vertical ? 'v' : 'h'}"><div class="strip"></div><div class="fade l"></div><div class="fade r"></div><div class="mark"></div></div>`);
  if (vertical) sp.style.height = '100%'; else sp.style.height = cross + 'px';
  container.append(sp);
  const strip = $('.strip', sp);
  const size = vertical ? `height:${cell}px;width:100%` : `width:${cell}px;height:100%`;

  function idle(caseDef) {
    const odds = caseDef.odds;
    strip.style.transition = 'none';
    strip.style.transform = 'none';
    strip.innerHTML = Array.from({ length: 12 }, () => cellHTML(filler(odds), size, true, names)).join('');
    const span = vertical ? sp.clientHeight : sp.clientWidth;
    const off = -(cell * 6 - span / 2 + cell / 2);
    strip.style.transform = vertical ? `translateY(${off}px)` : `translateX(${off}px)`;
  }

  function spin(caseDef, winSid, { duration = 5200, quiet = false } = {}) {
    const odds = caseDef.odds;
    const N = 46, W = 38;
    const ids = Array.from({ length: N }, (_, i) => (i === W ? winSid : filler(odds)));
    strip.innerHTML = ids.map((id) => cellHTML(id, size, true, names)).join('');
    const span = vertical ? sp.clientHeight : sp.clientWidth;
    const jitter = (Math.random() - 0.5) * cell * 0.8;
    const target = -(W * cell - span / 2 + cell / 2 + jitter);
    const dur = settings.fast ? duration * 0.45 : duration;
    strip.style.transition = 'none';
    strip.style.transform = vertical ? 'translateY(0)' : 'translateX(0)';
    void strip.offsetWidth;
    if (!quiet) sfx.caseOpen();
    strip.style.transition = `transform ${dur}ms cubic-bezier(.1,.75,.12,1)`;
    strip.style.transform = vertical ? `translateY(${target}px)` : `translateX(${target}px)`;
    let last = 0, raf;
    const tick = () => {
      const m = new DOMMatrixReadOnly(getComputedStyle(strip).transform);
      const pos = -(vertical ? m.m42 : m.m41);
      const idx = Math.floor((pos + span / 2) / cell);
      if (idx !== last) { last = idx; sfx.caseTick(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return new Promise((res) => setTimeout(() => {
      cancelAnimationFrame(raf);
      // settle jitter back to the exact center for a satisfying snap
      strip.style.transition = 'transform .25s ease-out';
      const exact = -(W * cell - span / 2 + cell / 2);
      strip.style.transform = vertical ? `translateY(${exact}px)` : `translateX(${exact}px)`;
      const winCell = strip.children[W];
      // reveal gold
      winCell.outerHTML = cellHTML(winSid, size, false, names).replace('class="cell"', 'class="cell win"');
      res();
    }, dur + 30));
  }
  return { el: sp, spin, idle };
}
