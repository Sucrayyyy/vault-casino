import { placeBet, settle, fair } from '../store.js';
import { $, $$, el, css, gameLayout, betField, modeTabs, autoField, sleep, money, fmtX, confetti, haptic } from '../ui.js';
import { weighted } from '../rng.js';
import { sfx } from '../audio.js';

// RTP 96.5 % (5 lines × Σ p³·pay)
const SYMS = [
  { id: 'cherry', g: '🍒', w: 30, pay: 2.5 },
  { id: 'lemon', g: '🍋', w: 25, pay: 3 },
  { id: 'orange', g: '🍊', w: 20, pay: 5 },
  { id: 'grape', g: '🍇', w: 14, pay: 10 },
  { id: 'bell', g: '🔔', w: 8, pay: 25 },
  { id: 'gem', g: '💎', w: 2.5, pay: 100 },
  { id: 'seven', g: '<b class="seven">7</b>', w: 1.2, pay: 500 },
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
.slot-cell { height: ${CELL}px; display: grid; place-items: center; font-size: 50px; line-height: 1; transition: background .2s; }
.slot-cell .seven { font-family: Inter; font-weight: 900; font-style: italic; font-size: 64px; color: #e11d48; text-shadow: 0 3px 0 #7f1d1d; }
.slot-cell.hit { background: rgba(0,231,1,.28); animation: cellHit .6s ease-in-out infinite alternate; }
@keyframes cellHit { to { background: rgba(255,200,0,.4); } }
.slot-lines { position: absolute; inset: 8px; pointer-events: none; }
.slot-pay { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; width: 100%; max-width: 360px; margin-top: 12px; }
.slot-pay div { background: var(--bg2); border-radius: 6px; padding: 4px; text-align: center; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; }
.slot-pay .seven { font-family: Inter; color: #e11d48; font-style: italic; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'slots', edge: '3,5 %' });
  const box = el(`<div class="slot-stage"><div class="slot-machine"><div class="slot-title">FRUIT VAULT</div><div class="slot-win">${[0, 1, 2].map(() => '<div class="slot-reel"><div class="slot-strip"></div></div>').join('')}<svg class="slot-lines" viewBox="0 0 ${CELL * 3 + 8} ${CELL * 3}"></svg></div></div>
    <div class="slot-pay">${SYMS.map((s) => `<div>${s.g.replace('class="seven"', 'class="seven"')}×3 = ${s.pay}×</div>`).join('')}<div>5 lignes</div></div></div>`);
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
