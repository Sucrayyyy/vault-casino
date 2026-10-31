import { placeBet, settle, fair, S, round2 } from '../store.js';
import { $, $$, el, css, gameLayout, money, fmt, fmtShort, sleep, fitCanvas, haptic, COIN } from '../ui.js';
import { sfx } from '../audio.js';

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorOf = (n) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
const CHIPS = [1, 5, 10, 50, 100, 500, 1000, 5000, 25000, 100000];
const CHIP_COL = { 1: '#e5e7eb', 5: '#ef4444', 10: '#3b82f6', 50: '#10b981', 100: '#111827', 500: '#a855f7', 1000: '#f59e0b', 5000: '#ec4899', 25000: '#06b6d4', 100000: '#eab308' };

function wins(key, n) {
  if (key[0] === 'n') return +key.slice(1) === n ? 36 : 0;
  if (n === 0) return 0;
  switch (key) {
    case 'red': return REDS.has(n) ? 2 : 0;
    case 'black': return !REDS.has(n) ? 2 : 0;
    case 'odd': return n % 2 ? 2 : 0;
    case 'even': return n % 2 ? 0 : 2;
    case 'low': return n <= 18 ? 2 : 0;
    case 'high': return n >= 19 ? 2 : 0;
    case 'd1': return n <= 12 ? 3 : 0;
    case 'd2': return n > 12 && n <= 24 ? 3 : 0;
    case 'd3': return n > 24 ? 3 : 0;
    case 'c1': return n % 3 === 1 ? 3 : 0;
    case 'c2': return n % 3 === 2 ? 3 : 0;
    case 'c3': return n % 3 === 0 ? 3 : 0;
  }
  return 0;
}

css('roulette', `
.rl-stage { display: flex; flex-direction: column; align-items: center; padding: 8px 10px 14px; background: radial-gradient(ellipse at 50% 0%, #1b5e3f, var(--bg) 60%); }
.rl-wheel { width: 220px; height: 220px; }
.rl-last { display: flex; gap: 4px; margin: 6px 0 10px; min-height: 26px; }
.rl-last span { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 900; }
.rl-last span:first-child { transform: scale(1.15); box-shadow: 0 0 0 2px #fff; }
.c-red { background: #dc2626; } .c-black { background: #1f2937; } .c-green { background: #16a34a; }
.rl-board { display: grid; grid-template-columns: 1fr 1fr 1.25fr 1.25fr 1.25fr; grid-auto-rows: 30px; gap: 3px; width: 100%; max-width: 380px; }
.rl-cell { position: relative; border-radius: 4px; font-weight: 900; font-size: 12.5px; display: grid; place-items: center; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: #fff; }
.rl-cell.vert span { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11px; letter-spacing: .5px; }
.rl-cell.win { box-shadow: 0 0 0 2px #fde047, 0 0 16px #fde047; z-index: 1; animation: rlWin .6s ease-in-out infinite alternate; }
@keyframes rlWin { to { filter: brightness(1.5); } }
.rl-chip { position: absolute; top: 50%; left: 50%; width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%; display: grid; place-items: center; font-size: 8.5px; font-weight: 900; color: #fff; border: 3px dashed rgba(255,255,255,.85); box-shadow: 0 2px 4px rgba(0,0,0,.6); z-index: 2; pointer-events: none; animation: chipIn .2s cubic-bezier(.3,1.6,.5,1); text-shadow: 0 1px 1px rgba(0,0,0,.6); }
@keyframes chipIn { from { transform: translateY(-14px) scale(1.3); opacity: 0; } }
.rl-chips { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 6px; scrollbar-width: none; }
.rl-chips::-webkit-scrollbar { display: none; }
.rl-chips button { flex: none; width: 46px; height: 46px; border-radius: 50%; font-size: 11px; font-weight: 900; color: #fff; border: 4px dashed rgba(255,255,255,.8); box-shadow: 0 3px 0 rgba(0,0,0,.35); transition: transform .15s; text-shadow: 0 1px 2px rgba(0,0,0,.7); }
.rl-chips button.on { transform: translateY(-4px) scale(1.08); box-shadow: 0 0 0 3px var(--green), 0 6px 10px rgba(0,0,0,.4); }
.rl-chips button:disabled { opacity: .3; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'roulette', edge: '2,7 %' });
  const box = el(`<div class="rl-stage"><canvas class="rl-wheel"></canvas><div class="rl-last"></div><div class="rl-board"></div></div>`);
  stage.append(box);
  stage.style.minHeight = 'auto';
  controls.style.cssText = 'position:sticky;bottom:0;z-index:5';
  const board = $('.rl-board', box), lastEl = $('.rl-last', box), cv = $('canvas', box);

  // ---------- board ----------
  const cells = [];
  const add = (key, label, col, row, cs = 1, rs = 1, cls = '', bg = '') => {
    const c = el(`<button class="rl-cell ${cls}" data-k="${key}" style="grid-column:${col} / span ${cs};grid-row:${row} / span ${rs};${bg ? `background:${bg};` : ''}"><span>${label}</span></button>`);
    board.append(c); cells.push(c);
  };
  add('n0', '0', 3, 1, 3, 1, '', '#15803d');
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) {
    const n = i * 3 + j + 1;
    add('n' + n, n, 3 + j, 2 + i, 1, 1, '', REDS.has(n) ? '#b91c1c' : '#1f2937');
  }
  ['d1', 'd2', 'd3'].forEach((k, i) => add(k, ['1 à 12', '13 à 24', '25 à 36'][i], 2, 2 + i * 4, 1, 4, 'vert'));
  [['low', '1-18'], ['even', 'Pair'], ['red', '◆', '#b91c1c'], ['black', '◆', '#1f2937'], ['odd', 'Impair'], ['high', '19-36']].forEach(([k, l, bg], i) => add(k, l, 1, 2 + i * 2, 1, 2, 'vert', bg));
  ['c1', 'c2', 'c3'].forEach((k, i) => add(k, '2:1', 3 + i, 14));

  let bets = {}, stack = [], chip = 10, spinning = false, last = [];
  const totalBet = () => round2(Object.values(bets).reduce((a, b) => a + b, 0));
  function paintChips() {
    cells.forEach((c) => {
      $('.rl-chip', c)?.remove();
      const v = bets[c.dataset.k];
      if (v) {
        const top = [...CHIPS].reverse().find((x) => v >= x) || 1;
        c.insertAdjacentHTML('beforeend', `<div class="rl-chip" style="background:${CHIP_COL[top]}">${fmtShort(v)}</div>`);
      }
    });
    $('[data-total]', controls).innerHTML = money(totalBet());
    spinBtn.disabled = !totalBet() || spinning;
  }
  board.onclick = (e) => {
    const c = e.target.closest('.rl-cell');
    if (!c || spinning) return;
    cells.forEach((x) => x.classList.remove('win'));
    if (totalBet() + chip > S.balance + 1e-9) { sfx.error(); return; }
    bets[c.dataset.k] = round2((bets[c.dataset.k] || 0) + chip);
    stack.push([c.dataset.k, chip]);
    sfx.chip(); haptic();
    paintChips();
  };

  // ---------- wheel drawing ----------
  let G, W, wheelRot = 0, ball = null;
  function setup() { const r = fitCanvas(cv); G = r.g; W = r.w; drawWheel(); }
  function drawWheel() {
    if (!G) return;
    const R = W / 2, n = 37, seg = (Math.PI * 2) / n;
    G.clearRect(0, 0, W, W);
    G.save(); G.translate(R, R);
    // wood rim
    let gr = G.createRadialGradient(0, 0, R * 0.7, 0, 0, R);
    gr.addColorStop(0, '#5b3a1a'); gr.addColorStop(1, '#2d1a0a');
    G.fillStyle = gr; G.beginPath(); G.arc(0, 0, R, 0, 7); G.fill();
    G.strokeStyle = '#c9a227'; G.lineWidth = 2; G.beginPath(); G.arc(0, 0, R * 0.9, 0, 7); G.stroke();
    G.rotate(wheelRot);
    for (let i = 0; i < n; i++) {
      const num = ORDER[i];
      G.beginPath(); G.moveTo(0, 0); G.arc(0, 0, R * 0.86, i * seg - seg / 2 - Math.PI / 2, (i + 1) * seg - seg / 2 - Math.PI / 2); G.closePath();
      G.fillStyle = num === 0 ? '#16a34a' : REDS.has(num) ? '#c81e1e' : '#111827'; G.fill();
      G.strokeStyle = '#c9a227'; G.lineWidth = 1; G.stroke();
      G.save(); G.rotate(i * seg); G.fillStyle = '#fff'; G.font = `800 ${W * 0.045}px Inter`; G.textAlign = 'center'; G.textBaseline = 'middle';
      G.fillText(num, 0, -R * 0.76); G.restore();
    }
    // pockets ring
    G.fillStyle = '#1f130a'; G.beginPath(); G.arc(0, 0, R * 0.66, 0, 7); G.fill();
    for (let i = 0; i < n; i++) { G.save(); G.rotate(i * seg - seg / 2); G.strokeStyle = '#c9a227'; G.beginPath(); G.moveTo(0, -R * 0.66); G.lineTo(0, -R * 0.52); G.stroke(); G.restore(); }
    gr = G.createRadialGradient(0, -R * 0.1, 2, 0, 0, R * 0.52);
    gr.addColorStop(0, '#8b5a2b'); gr.addColorStop(1, '#4a2c12');
    G.fillStyle = gr; G.beginPath(); G.arc(0, 0, R * 0.52, 0, 7); G.fill();
    G.strokeStyle = '#c9a227'; G.lineWidth = 5; G.lineCap = 'round';
    for (let i = 0; i < 4; i++) { G.rotate(Math.PI / 2); G.beginPath(); G.moveTo(0, 0); G.lineTo(0, -R * 0.36); G.stroke(); G.beginPath(); G.arc(0, -R * 0.36, 4, 0, 7); G.fillStyle = '#c9a227'; G.fill(); }
    G.fillStyle = '#e5c158'; G.beginPath(); G.arc(0, 0, R * 0.1, 0, 7); G.fill();
    G.restore();
    if (ball) {
      G.save(); G.translate(R, R);
      const x = Math.cos(ball.a) * ball.r * R, y = Math.sin(ball.a) * ball.r * R;
      G.fillStyle = 'rgba(0,0,0,.4)'; G.beginPath(); G.arc(x + 1.5, y + 2, W * 0.026, 0, 7); G.fill();
      const bg = G.createRadialGradient(x - 2, y - 2, 1, x, y, W * 0.028);
      bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#cbd5e1');
      G.fillStyle = bg; G.beginPath(); G.arc(x, y, W * 0.026, 0, 7); G.fill();
      G.restore();
    }
  }
  const ro = new ResizeObserver(setup); ro.observe(cv);

  async function spinWheel(result) {
    const n = 37, seg = (Math.PI * 2) / n;
    const idx = ORDER.indexOf(result);
    const w0 = wheelRot, w1 = w0 + Math.PI * 2 * 1.6;
    // pocket angle in canvas coords (0 = right): number i drawn at rotation i*seg from top (-π/2)
    const pocket = w1 + idx * seg - Math.PI / 2;
    const b0 = Math.random() * Math.PI * 2;
    let b1 = pocket - Math.PI * 2 * 4;
    while (b1 > b0 - Math.PI * 2 * 4) b1 -= Math.PI * 2;
    const dur = 5200, t0 = performance.now();
    let lastPocket = -1, bounced = 0;
    sfx.whoosh(1.2);
    await new Promise((res) => {
      const f = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const ew = 1 - Math.pow(1 - k, 3), eb = 1 - Math.pow(1 - k, 2.4);
        wheelRot = w0 + (w1 - w0) * ew;
        const a = b0 + (b1 - b0) * eb;
        let r = 0.93;
        if (k > 0.55) {
          const q = (k - 0.55) / 0.45;
          r = 0.93 - 0.32 * Math.min(1, q * 1.4) + (q < 0.7 ? Math.abs(Math.sin(q * 18)) * 0.05 * (1 - q) : 0);
          if (q < 0.7 && Math.sin(q * 18) * Math.sin((q - 0.01) * 18) < 0 && bounced++ < 6) sfx.ball();
        }
        ball = { a, r };
        const p = Math.floor(((a % (Math.PI * 2)) + Math.PI * 2) / seg);
        if (p !== lastPocket && k > 0.55) { lastPocket = p; if (Math.random() < 0.5) sfx.tick(1.6, 0.04); }
        drawWheel();
        if (k < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    wheelRot = wheelRot % (Math.PI * 2);
  }

  // ---------- controls ----------
  const chipRow = el(`<div><div class="label"><span>Jeton</span><span>Mise totale : <b data-total></b></span></div><div class="rl-chips">${CHIPS.map((v) => `<button data-v="${v}" style="background:${CHIP_COL[v]};${v === 1 ? 'color:#111' : ''}">${fmtShort(v)}</button>`).join('')}</div></div>`);
  const tools = el('<div class="ctl-row"><button class="btn sm" data-undo>↶ Annuler</button><button class="btn sm" data-clear>Effacer</button><button class="btn sm" data-x2>×2</button><button class="btn sm" data-re>Rejouer</button></div>');
  const spinBtn = el('<button class="btn green full lg">Lancer la bille</button>');
  controls.append(chipRow, tools, spinBtn);
  const chipBtns = $$('[data-v]', chipRow);
  function selectChip(v) { chip = v; chipBtns.forEach((b) => b.classList.toggle('on', +b.dataset.v === v)); }
  chipBtns.forEach((b) => (b.onclick = () => { sfx.chip(); selectChip(+b.dataset.v); }));
  const pickDefault = () => { const ok = CHIPS.filter((c) => c <= Math.max(1, S.balance / 20)); selectChip(ok[ok.length - 1] || 1); };
  pickDefault();
  let lastBets = null;
  $('[data-undo]', tools).onclick = () => { if (spinning) return; const s = stack.pop(); if (!s) return; bets[s[0]] = round2(bets[s[0]] - s[1]); if (bets[s[0]] <= 0) delete bets[s[0]]; sfx.click(); paintChips(); };
  $('[data-clear]', tools).onclick = () => { if (spinning) return; bets = {}; stack = []; sfx.click(); paintChips(); cells.forEach((x) => x.classList.remove('win')); };
  $('[data-x2]', tools).onclick = () => { if (spinning || totalBet() * 2 > S.balance) { sfx.error(); return; } for (const k in bets) bets[k] = round2(bets[k] * 2); stack = []; sfx.chip(); paintChips(); };
  $('[data-re]', tools).onclick = () => { if (spinning || !lastBets) return; const t = Object.values(lastBets).reduce((a, b) => a + b, 0); if (t > S.balance) { sfx.error(); return; } bets = { ...lastBets }; stack = []; sfx.chip(); paintChips(); };

  spinBtn.onclick = async () => {
    const tb = totalBet();
    if (!tb || spinning) return;
    if (!placeBet('roulette', tb)) return;
    spinning = true; paintChips();
    document.querySelector('#view').scrollTo({ top: 0, behavior: 'smooth' });
    cells.forEach((x) => x.classList.remove('win'));
    sfx.bet();
    const result = Math.floor(fair.bet(1)[0] * 37);
    await spinWheel(result);
    let payout = 0;
    for (const [k, v] of Object.entries(bets)) payout += v * wins(k, result);
    cells.forEach((c) => { if (wins(c.dataset.k, result)) c.classList.add('win'); });
    last.unshift(result); last = last.slice(0, 10);
    lastEl.innerHTML = last.map((n) => `<span class="c-${colorOf(n)}">${n}</span>`).join('');
    settle('roulette', tb, payout, { mult: payout / tb });
    if (payout > tb) { sfx.win(payout / tb); haptic(); } else if (payout > 0) sfx.smallWin(); else sfx.lose();
    lastBets = { ...bets };
    setTimeout(() => cells.find((c) => c.dataset.k === 'n' + result)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
    bets = {}; stack = [];
    spinning = false; paintChips();
  };
  paintChips();
  return () => ro.disconnect();
}
