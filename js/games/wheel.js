import { placeBet, settle, fair, lucky } from '../store.js';
import { $, el, css, gameLayout, betField, segmented, selectField, modeTabs, autoField, sleep, fitCanvas, resultPop, fmtX, haptic } from '../ui.js';
import { sfx } from '../audio.js';

const LOW10 = [1.5, 1.2, 1.2, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0];
const MED10 = [0, 1.9, 0, 1.5, 0, 2, 0, 1.5, 0, 3];
const MED20 = [1.5, 0, 2, 0, 2, 0, 2, 0, 1.5, 0, 3, 0, 1.8, 0, 2, 0, 2, 0, 2, 0];
export function wheelTable(risk, n) {
  if (risk === 'high') return Array.from({ length: n }, (_, i) => (i === 0 ? +(0.99 * n).toFixed(2) : 0));
  const base = risk === 'low' ? LOW10 : n % 20 === 0 ? MED20 : MED10;
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
}
const COLORS = { 0: '#334155', 1.2: '#d6dde8', 1.5: '#00e701', 1.7: '#c084fc', 1.8: '#a78bfa', 1.9: '#facc15', 2: '#fde047', 3: '#8847ff', 4: '#ff9d00' };
const colorOf = (m) => COLORS[m] || '#ff2d75';

css('wheel', `
.wheel-wrap { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 12px; }
.wheel-cv { width: min(88vw, 340px); height: min(88vw, 340px); }
.wheel-ptr { position: absolute; top: calc(50% - min(44vw, 170px) - 6px); left: 50%; width: 30px; height: 38px; margin-left: -15px; filter: drop-shadow(0 4px 4px rgba(0,0,0,.5)); z-index: 2; transform-origin: 50% 20%; }
.wheel-center { position: absolute; font-size: 26px; font-weight: 900; pointer-events: none; text-shadow: 0 2px 10px rgba(0,0,0,.6); }
.wheel-legend { display: flex; gap: 6px; padding: 0 12px 12px; }
.wheel-legend div { flex: 1; text-align: center; background: var(--bg2); border-radius: 6px; padding: 7px 2px; font-size: 12px; font-weight: 800; border-bottom: 4px solid; transition: transform .2s; }
.wheel-legend div.hit { transform: translateY(-4px); background: var(--bg4); }
.wheel-legend div small { display: block; font-size: 9.5px; color: var(--txt3); font-weight: 700; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'wheel' });
  const pop = resultPop(stage);
  const wrap = el(`<div class="wheel-wrap"><canvas class="wheel-cv"></canvas><svg class="wheel-ptr" viewBox="0 0 30 38"><path d="M15 36 L3 8 a12 12 0 1 1 24 0z" fill="#ff3b5c" stroke="#fff" stroke-width="2.5"/><circle cx="15" cy="11" r="4" fill="#fff"/></svg><div class="wheel-center"></div></div>`);
  const legend = el('<div class="wheel-legend"></div>');
  stage.append(wrap, legend);
  const cv = $('canvas', wrap), ptr = $('.wheel-ptr', wrap), center = $('.wheel-center', wrap);
  let risk = 'med', segs = 30, rot = -Math.PI / 2 - Math.PI / 30, table = wheelTable(risk, segs);
  let busy = false, auto = false, stop = false;
  let G, S;

  function setup() { const r = fitCanvas(cv); G = r.g; S = r.w; draw(); }
  function draw(hitIdx = -1) {
    if (!G) return;
    const R = S / 2, n = table.length, seg = (Math.PI * 2) / n;
    G.clearRect(0, 0, S, S);
    G.save(); G.translate(R, R);
    // outer rim
    G.fillStyle = '#0b1a24'; G.beginPath(); G.arc(0, 0, R - 1, 0, 7); G.fill();
    G.rotate(rot);
    for (let i = 0; i < n; i++) {
      G.beginPath(); G.moveTo(0, 0); G.arc(0, 0, R - 8, i * seg, (i + 1) * seg); G.closePath();
      G.fillStyle = colorOf(table[i]);
      G.globalAlpha = hitIdx >= 0 && i !== hitIdx ? 0.55 : 1;
      G.fill();
      G.globalAlpha = 1;
      G.strokeStyle = '#0b1a24'; G.lineWidth = n > 30 ? 1 : 2; G.stroke();
    }
    G.restore();
    // inner disc
    G.save(); G.translate(R, R);
    const gr = G.createRadialGradient(0, -10, 4, 0, 0, R * 0.62);
    gr.addColorStop(0, '#24394a'); gr.addColorStop(1, '#0f212e');
    G.fillStyle = gr; G.beginPath(); G.arc(0, 0, R * 0.62, 0, 7); G.fill();
    G.strokeStyle = 'rgba(255,255,255,.06)'; G.lineWidth = 6; G.beginPath(); G.arc(0, 0, R * 0.62, 0, 7); G.stroke();
    G.restore();
  }
  function renderLegend(hit = null) {
    const uniq = [...new Set(table)].sort((a, b) => a - b);
    legend.innerHTML = uniq.map((m) => `<div class="${hit === m ? 'hit' : ''}" style="border-color:${colorOf(m)}">${fmtX(m)}<small>${((table.filter((x) => x === m).length / table.length) * 100).toFixed(0)} %</small></div>`).join('');
  }
  const ro = new ResizeObserver(setup); ro.observe(cv);
  renderLegend();

  async function spin() {
    const amount = bet.value;
    if (!placeBet('wheel', amount)) return false;
    sfx.bet(); pop.hide(); center.textContent = '';
    const n = table.length, seg = (Math.PI * 2) / n;
    const idx = lucky(() => Math.floor(fair.bet(1)[0] * n), (i) => table[i] > 1);
    const m = table[idx];
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    let target = -Math.PI / 2 - (idx + 0.5) * seg + jitter;
    const turns = auto ? 2 : 4;
    while (target < rot + Math.PI * 2 * turns) target += Math.PI * 2;
    const from = rot, dur = auto ? 1400 : 3200;
    const t0 = performance.now();
    let lastSeg = Math.floor((-Math.PI / 2 - rot) / seg);
    await new Promise((res) => {
      const f = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 4);
        rot = from + (target - from) * e;
        const s = Math.floor((-Math.PI / 2 - rot) / seg);
        if (s !== lastSeg) { lastSeg = s; sfx.spinTick(); ptr.animate([{ transform: 'rotate(-18deg)' }, { transform: 'rotate(0)' }], { duration: 120 }); }
        draw();
        if (k < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    draw(idx);
    center.textContent = fmtX(m);
    center.style.color = colorOf(m);
    renderLegend(m);
    settle('wheel', amount, amount * m, { mult: m });
    if (m > 1) { pop.show(m, amount * m); sfx.win(m); haptic(); } else if (m === 1) sfx.smallWin(); else sfx.lose();
    return true;
  }

  const tabs = modeTabs((v) => { auto = v === 'auto'; autoF.el.classList.toggle('hidden', !auto); btn.textContent = auto ? 'Lancer l’auto' : 'Tourner'; });
  const bet = betField('wheel');
  const riskSel = segmented([{ v: 'low', l: 'Faible' }, { v: 'med', l: 'Moyen' }, { v: 'high', l: 'Élevé' }], risk, (v) => { risk = v; table = wheelTable(risk, segs); draw(); renderLegend(); }, 'sq');
  const riskW = el('<div><div class="label">Risque</div></div>'); riskW.append(riskSel.el);
  const segSel = selectField('Segments', [10, 20, 30, 40, 50].map((v) => ({ v, l: String(v) })), segs, (v) => { segs = v; table = wheelTable(risk, segs); draw(); renderLegend(); });
  const autoF = autoField(); autoF.el.classList.add('hidden');
  const btn = el('<button class="btn green full lg">Tourner</button>');
  controls.append(tabs.el, bet.el, riskW, segSel.el, autoF.el, btn);

  btn.onclick = async () => {
    if (busy) { stop = true; return; }
    busy = true; stop = false; bet.disable(true); riskSel.disable(true); segSel.disable(true); tabs.disable(true);
    if (!auto) { btn.disabled = true; await spin(); btn.disabled = false; }
    else {
      btn.textContent = 'Arrêter l’auto';
      let n = autoF.value || Infinity;
      while (n-- > 0 && !stop && root.isConnected) { if (!(await spin())) break; await sleep(400); }
      btn.textContent = 'Lancer l’auto';
    }
    busy = false; bet.disable(false); riskSel.disable(false); segSel.disable(false); tabs.disable(false);
  };
  return () => { stop = true; ro.disconnect(); };
}
