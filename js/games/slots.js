import { placeBet, settle, fair } from '../store.js';
import { $, $$, el, css, gameLayout, betField, modeTabs, autoField, sleep, money, fmtX, confetti, haptic } from '../ui.js';
import { weighted } from '../rng.js';
import { sfx } from '../audio.js';

// RTP 96.5 % (5 lines × Σ p³·pay)
// Original vector symbols
const SV = (inner) => `<svg viewBox="0 0 64 64" width="58" height="58">${inner}</svg>`;
const SYMS = [
  { id: 'cherry', w: 30, pay: 2.5, g: SV('<path d="M30 8c-6 8-12 14-16 26M30 8c4 8 10 16 18 22" stroke="#3f7d20" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 8c6-4 14-4 18 0-6 4-12 4-18 0z" fill="#5cb02e"/><circle cx="16" cy="44" r="12" fill="#d1122f"/><circle cx="46" cy="40" r="12" fill="#e11d48"/><circle cx="12" cy="40" r="3.5" fill="#fff" opacity=".6"/><circle cx="42" cy="36" r="3.5" fill="#fff" opacity=".6"/>') },
  { id: 'lemon', w: 25, pay: 3, g: SV('<ellipse cx="32" cy="34" rx="24" ry="18" fill="#facc15" transform="rotate(-20 32 34)"/><path d="M8 40l-4 4M56 28l4-4" stroke="#eab308" stroke-width="5" stroke-linecap="round"/><ellipse cx="24" cy="28" rx="8" ry="4" fill="#fff" opacity=".45" transform="rotate(-20 24 28)"/>') },
  { id: 'orange', w: 20, pay: 5, g: SV('<circle cx="32" cy="36" r="22" fill="#f97316"/><circle cx="32" cy="36" r="22" fill="none" stroke="#ea580c" stroke-width="2" stroke-dasharray="1 5"/><path d="M32 14c2-6 8-8 14-6-2 6-8 8-14 6z" fill="#4d9b2a"/><circle cx="24" cy="28" r="5" fill="#fff" opacity=".4"/>') },
  { id: 'grape', w: 14, pay: 10, g: SV('<path d="M32 6v10" stroke="#65a30d" stroke-width="4" stroke-linecap="round"/>' + [[24, 22], [40, 22], [16, 34], [32, 34], [48, 34], [24, 46], [40, 46], [32, 57]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#7c3aed"/><circle cx="${x - 3}" cy="${y - 3}" r="2.5" fill="#fff" opacity=".45"/>`).join('')) },
  { id: 'bell', w: 8, pay: 25, g: SV('<path d="M32 8c-11 0-16 9-16 20v10l-6 8h44l-6-8V28c0-11-5-20-16-20z" fill="#fbbf24" stroke="#b45309" stroke-width="2"/><circle cx="32" cy="52" r="6" fill="#b45309"/><path d="M24 20c2-4 6-6 10-6" stroke="#fff" stroke-width="3" opacity=".6" fill="none" stroke-linecap="round"/>') },
  { id: 'gem', w: 2.5, pay: 100, g: SV('<polygon points="10,24 22,10 42,10 54,24 32,56" fill="#38bdf8"/><polygon points="10,24 54,24 32,56" fill="#0ea5e9"/><polygon points="22,10 27,24 37,24 42,10" fill="#c8fbff"/><polygon points="27,24 37,24 32,56" fill="#7dd3fc"/>') },
  { id: 'seven', w: 1.2, pay: 500, g: '<b class="seven">7</b>' },
];
const LINES = [[[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]]];
const CELL = 92;

css('slots', `
.slot-stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px; background: radial-gradient(circle at 50% 30%, #4a0f3a, var(--bg) 70%); }
.slot-machine { position: relative; padding: 12px; border-radius: 18px; background: linear-gradient(180deg, #ffd84d, #f59e0b 40%, #b45309); box-shadow: 0 14px 40px rgba(0,0,0,.6), inset 0 2px 0 rgba(255,255,255,.6); }
.slot-title { text-align: center; font-weight: 900; font-style: italic; font-size: 20px; color: #3a1500; margin: -2px 0 8px; letter-spacing: 1px; }
.slot-win { display: flex; gap: 4px; background: #12061f; padding: 8px; border-radius: 10px; position: relative; }
.slot-reel { width: ${CELL}px; height: ${CELL * 3}px; overflow: hidden; border-radius: 6px; background: linear-gradient(180deg, #ddd, #fff 20%, #fff 80%, #ddd); position: relative; }
.slot-strip { position: absolute; left: 0; right: 0; top: 0; will-change: transform; }
.slot-cell { height: ${CELL}px; display: grid; place-items: center; line-height: 1; transition: background .2s; }
.slot-cell .seven { font-family: Inter; font-weight: 900; font-style: italic; font-size: 64px; color: #e11d48; text-shadow: 0 3px 0 #7f1d1d; }
.slot-cell.hit { background: rgba(0,231,1,.28); animation: cellHit .6s ease-in-out infinite alternate; }
@keyframes cellHit { to { background: rgba(255,200,0,.4); } }
.slot-lines { position: absolute; inset: 8px; pointer-events: none; }
.slot-pay { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; width: 100%; max-width: 360px; margin-top: 12px; }
.slot-pay div { background: var(--bg2); border-radius: 6px; padding: 4px; text-align: center; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; }
.slot-pay .seven { font-family: Inter; color: #e11d48; font-style: italic; font-size: 16px; }
.slot-pay .ps svg { width: 18px; height: 18px; vertical-align: -4px; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'slots', edge: '3,5 %' });
  const box = el(`<div class="slot-stage"><div class="slot-machine"><div class="slot-title">FRUIT VAULT</div><div class="slot-win">${[0, 1, 2].map(() => '<div class="slot-reel"><div class="slot-strip"></div></div>').join('')}<svg class="slot-lines" viewBox="0 0 ${CELL * 3 + 8} ${CELL * 3}"></svg></div></div>
    <div class="slot-pay">${SYMS.map((s) => `<div><span class="ps">${s.g}</span>${s.pay}×</div>`).join('')}<div>5 lignes</div></div></div>`);
  stage.append(box);
  const reels = $$('.slot-strip', box);
  const svg = $('.slot-lines', box);
  let grid = [[0, 1, 2], [3, 4, 0], [1, 2, 3]];
  const symHTML = (i) => `<div class="slot-cell">${SYMS[i].g}</div>`;
  const rand = () => Math.floor(Math.random() * SYMS.length);
  reels.forEach((r, c) => { r.innerHTML = grid[c].map(symHTML).join(''); });
  let busy = false, auto = false, stop = false;

  async function spin() {
    const amount = bet.value;
    if (!placeBet('slots', amount)) return false;
    sfx.bet();
    svg.innerHTML = '';
    $$('.slot-cell.hit', box).forEach((c) => c.classList.remove('hit'));
    const fl = fair.bet(9);
    grid = [0, 1, 2].map((c) => [0, 1, 2].map((r) => SYMS.indexOf(weighted(SYMS, fl[c * 3 + r]))));
    const fast = auto;
    await Promise.all(reels.map(async (strip, c) => {
      const n = (fast ? 10 : 16) + c * (fast ? 4 : 7);
      const filler = Array.from({ length: n }, rand);
      // strip: final 3 at top, then filler, then current 3 at bottom (we scroll from bottom to top)
      const cur = [...strip.querySelectorAll('.slot-cell')].slice(0, 3).map((x) => x.innerHTML);
      strip.innerHTML = grid[c].map(symHTML).join('') + filler.map(symHTML).join('') + cur.map((h) => `<div class="slot-cell">${h}</div>`).join('');
      const dist = (n + 3) * CELL;
      strip.style.transition = 'none';
      strip.style.transform = `translateY(${-dist}px)`;
      void strip.offsetWidth;
      const dur = (fast ? 500 : 900) + c * (fast ? 200 : 420);
      strip.style.transition = `transform ${dur}ms cubic-bezier(.25,.1,.25,1.08)`;
      strip.style.transform = 'translateY(0)';
      let ticks = 0;
      const tickT = setInterval(() => { if (ticks++ < n) sfx.spinTick(); }, dur / n);
      await sleep(dur);
      clearInterval(tickT);
      sfx.chip();
      strip.innerHTML = grid[c].map(symHTML).join('');
      strip.style.transition = 'none';
    }));
    // evaluate
    let total = 0;
    const hits = [];
    LINES.forEach((line, li) => {
      const ids = line.map(([c, r]) => grid[c][r]);
      if (ids[0] === ids[1] && ids[1] === ids[2]) { total += SYMS[ids[0]].pay; hits.push(li); }
    });
    if (hits.length) {
      hits.forEach((li) => {
        const pts = LINES[li].map(([c, r]) => `${c * (CELL + 4) + CELL / 2},${r * CELL + CELL / 2}`).join(' ');
        svg.insertAdjacentHTML('beforeend', `<polyline points="${pts}" fill="none" stroke="#00e701" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`);
        LINES[li].forEach(([c, r]) => reels[c].children[r].classList.add('hit'));
      });
    }
    settle('slots', amount, amount * total, { mult: total });
    if (total >= 25) { sfx.win(total); confetti({ n: 80, y: 0.35 }); haptic(true); }
    else if (total > 0) sfx.win(total);
    else sfx.lose();
    return true;
  }

  const tabs = modeTabs((v) => { auto = v === 'auto'; autoF.el.classList.toggle('hidden', !auto); btn.textContent = auto ? 'Lancer l’auto' : 'Lancer'; });
  const bet = betField('slots');
  const autoF = autoField(); autoF.el.classList.add('hidden');
  const btn = el('<button class="btn green full lg">Lancer</button>');
  controls.append(tabs.el, bet.el, autoF.el, btn);
  btn.onclick = async () => {
    if (busy) { stop = true; return; }
    busy = true; stop = false; bet.disable(true); tabs.disable(true);
    if (!auto) { btn.disabled = true; await spin(); btn.disabled = false; }
    else {
      btn.textContent = 'Arrêter l’auto';
      let n = autoF.value || Infinity;
      while (n-- > 0 && !stop && root.isConnected) { if (!(await spin())) break; await sleep(450); }
      btn.textContent = 'Lancer l’auto';
    }
    busy = false; bet.disable(false); tabs.disable(false);
  };
  return () => { stop = true; };
}
