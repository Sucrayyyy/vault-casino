import { placeBet, settle, fair, S } from '../store.js';
import { $, el, css, gameLayout, betField, selectField, segmented, historyBar, modeTabs, autoField, sleep, fitCanvas, haptic } from '../ui.js';
import { sfx } from '../audio.js';

// RTP ≈ 99 % for every table (checked offline).
const TABLES = {
  8: { low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6], med: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29] },
  9: { low: [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6], med: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18], high: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43] },
  10: { low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9], med: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22], high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76] },
  11: { low: [8.4, 3, 1.9, 1.3, 1, 0.7, 0.7, 1, 1.3, 1.9, 3, 8.4], med: [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24], high: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120] },
  12: { low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10], med: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170] },
  13: { low: [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1], med: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43], high: [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260] },
  14: { low: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1], med: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58], high: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420] },
  15: { low: [15, 8, 3, 2, 1.5, 1.1, 1, 0.7, 0.7, 1, 1.1, 1.5, 2, 3, 8, 15], med: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88], high: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620] },
  16: { low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], med: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110], high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000] },
};

css('plinko', `
.plinko-cv { flex: 1; width: 100%; min-height: 330px; display: block; }
`);

function bucketColor(i, n) {
  const d = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2); // 0 center → 1 edge
  const stops = [[255, 192, 0], [255, 130, 0], [255, 60, 30], [255, 0, 63]];
  const x = d * (stops.length - 1), a = Math.floor(x), t = x - a;
  const c0 = stops[a], c1 = stops[Math.min(a + 1, stops.length - 1)];
  return c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
}

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'plinko' });
  const hist = historyBar(stage, 6);
  const cv = el('<canvas class="plinko-cv"></canvas>');
  stage.append(cv);
  let rows = 16, risk = 'med', auto = false, autoOn = false, stop = false;
  let G, W, H;
  const balls = [];
  const hits = {}; // bucket index -> time
  const pegFlash = new Map();
  let geom = null;

  function layout() {
    ({ g: G, w: W, h: H } = fitCanvas(cv));
    const top = 26, bottomPad = 42;
    const s = Math.min((W - 16) / (rows + 2), (H - top - bottomPad) / (rows + 0.6));
    const pegR = Math.max(2, s * 0.13), ballR = Math.max(4, s * 0.27);
    geom = { top, s, pegR, ballR, cx: W / 2, rowY: (r) => top + s * 0.9 + r * s, bucketY: top + s * 0.9 + rows * s - s * 0.35 };
  }
  const ro = new ResizeObserver(() => layout());
  ro.observe(cv);
  layout();

  function draw(t) {
    if (!geom) return;
    const { s, pegR, ballR, cx, rowY, bucketY } = geom;
    G.clearRect(0, 0, W, H);
    // pegs
    for (let r = 0; r < rows; r++) {
      for (let j = 0; j < r + 3; j++) {
        const x = cx + (j - (r + 2) / 2) * s, y = rowY(r);
        const key = r * 100 + j, f = pegFlash.get(key);
        if (f && t - f < 250) {
          const k = 1 - (t - f) / 250;
          G.fillStyle = `rgba(255,255,255,${0.25 * k})`;
          G.beginPath(); G.arc(x, y, pegR * (2 + 2 * (1 - k)), 0, 7); G.fill();
        }
        G.fillStyle = '#fff';
        G.beginPath(); G.arc(x, y, pegR, 0, 7); G.fill();
      }
    }
    // buckets
    const mults = TABLES[rows][risk];
    const bw = s * 0.9, bh = Math.min(s * 0.75, 30);
    for (let i = 0; i <= rows; i++) {
      const x = cx + (i - rows / 2) * s;
      const hit = hits[i] && t - hits[i] < 300 ? 1 - (t - hits[i]) / 300 : 0;
      const [r, g, b] = bucketColor(i, rows + 1);
      const y = bucketY + hit * 8;
      G.fillStyle = `rgb(${r * 0.55},${g * 0.55},${b * 0.55})`;
      roundRect(G, x - bw / 2, y + 4, bw, bh, 4); G.fill();
      G.fillStyle = `rgb(${r},${g},${b})`;
      roundRect(G, x - bw / 2, y, bw, bh, 4); G.fill();
      G.fillStyle = '#1a0a00';
      const m = mults[i];
      const label = m >= 100 ? String(m) : m >= 10 ? String(m) : m.toFixed(1).replace(/\.0$/, '');
      G.font = `800 ${Math.max(7, Math.min(12, s * 0.33 * (label.length > 3 ? 0.8 : 1)))}px Inter, system-ui`;
      G.textAlign = 'center'; G.textBaseline = 'middle';
      G.fillText(label + (s > 22 ? '×' : ''), x, y + bh / 2 + 1);
    }
    // balls
    for (const b of balls) {
      G.fillStyle = 'rgba(0,0,0,.25)';
      G.beginPath(); G.arc(b.x + 1.5, b.y + 2, ballR, 0, 7); G.fill();
      const gr = G.createRadialGradient(b.x - ballR * 0.35, b.y - ballR * 0.35, 1, b.x, b.y, ballR);
      gr.addColorStop(0, '#ff8fb6'); gr.addColorStop(1, '#ff004d');
      G.fillStyle = gr;
      G.beginPath(); G.arc(b.x, b.y, ballR, 0, 7); G.fill();
    }
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  let raf;
  function loop(t) {
    const { s, ballR, cx, rowY, pegR } = geom;
    const stepMs = 105;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const el = t - b.t0;
      const seg = Math.floor(el / stepMs), k = (el % stepMs) / stepMs;
      if (seg > rows) {
        hits[b.k] = t;
        balls.splice(i, 1);
        b.done();
        continue;
      }
      // seg 0: drop from top to row 0; seg r: from row r-1 to row r
      const kAt = (r) => b.path.slice(0, r).reduce((a, d) => a + d, 0);
      const contactY = (r) => (r >= rows ? geom.bucketY - ballR : rowY(r) - pegR - ballR);
      const xAt = (r) => cx + (kAt(r) - r / 2) * s;
      if (seg === 0) {
        b.x = cx + b.jit; b.y = 8 + (contactY(0) - 8) * k * k;
      } else {
        const x0 = xAt(seg - 1), x1 = seg >= rows ? cx + (b.k - rows / 2) * s : xAt(seg);
        const y0 = contactY(seg - 1), y1 = contactY(seg);
        b.x = x0 + (x1 - x0) * (1 - (1 - k) * (1 - k));
        b.y = y0 + (y1 - y0) * k * k - s * 0.45 * Math.sin(Math.PI * k) * (1 - k);
      }
      if (seg !== b.lastSeg) {
        const r = seg - 1; // ball just touched row r
        if (r >= 0 && r < rows) { pegFlash.set(r * 100 + kAt(r) + 1, t); sfx.peg(r); }
        b.lastSeg = seg;
      }
    }
    draw(t);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  // controls
  const tabs = modeTabs((m) => { auto = m === 'auto'; autoF.el.classList.toggle('hidden', !auto); btn.textContent = auto ? 'Lancer l’auto' : 'Parier'; });
  const bet = betField('plinko');
  const riskSel = segmented([{ v: 'low', l: 'Faible' }, { v: 'med', l: 'Moyen' }, { v: 'high', l: 'Élevé' }], risk, (v) => { risk = v; }, 'sq');
  const rowSel = selectField('Rangées', [8, 9, 10, 11, 12, 13, 14, 15, 16].map((v) => ({ v, l: String(v) })), rows, (v) => { rows = v; layout(); });
  const riskWrap = el('<div><div class="label">Risque</div></div>'); riskWrap.append(riskSel.el);
  const autoF = autoField(); autoF.el.classList.add('hidden');
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(tabs.el, bet.el, riskWrap, rowSel.el, autoF.el, btn);

  const lockable = (d) => { riskSel.disable(d); rowSel.disable(d); };

  function drop() {
    const amount = bet.value;
    if (!placeBet('plinko', amount)) return false;
    sfx.bet();
    lockable(true);
    const fl = fair.bet(rows);
    const path = fl.slice(0, rows).map((f) => (f < 0.5 ? 0 : 1));
    const k = path.reduce((a, b) => a + b, 0);
    const r = rows, rk = risk;
    const m = TABLES[r][rk][k];
    balls.push({
      path, k, t0: performance.now(), lastSeg: -1, jit: (Math.random() - 0.5) * 4, x: 0, y: 0,
      done: () => {
        settle('plinko', amount, amount * m, { mult: m });
        hist.push(m, m >= 1);
        if (m >= 2) { sfx.win(m); haptic(m >= 10); } else if (m >= 1) sfx.smallWin(); else sfx.tick(0.6, 0.08);
        if (!balls.length && !autoOn) lockable(false);
      },
    });
    return true;
  }

  btn.onclick = async () => {
    if (!auto) { drop(); return; }
    if (autoOn) { stop = true; return; }
    autoOn = true; stop = false; btn.textContent = 'Arrêter l’auto'; bet.disable(true); tabs.disable(true);
    let n = autoF.value || Infinity;
    while (n-- > 0 && !stop && root.isConnected) { if (!drop()) break; await sleep(260); }
    autoOn = false; btn.textContent = 'Lancer l’auto'; bet.disable(false); tabs.disable(false);
    if (!balls.length) lockable(false);
  };

  return () => {
    stop = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    // pay out balls still in flight
    for (const b of balls.splice(0)) b.done();
  };
}
