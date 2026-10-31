import { placeBet, settle, fair } from '../store.js';
import { $, $$, el, css, gameLayout, betField, segmented, modeTabs, autoField, sleep, resultPop, fmtX } from '../ui.js';
import { pickDistinct } from '../rng.js';
import { sfx } from '../audio.js';

const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const P = (n, h) => (C(n, h) * C(40 - n, 10 - h)) / C(40, 10);
const RISK = { low: { s: 0.3, b: 1.7 }, med: { s: 0.5, b: 2.6 }, high: { s: 0.7, b: 4.2 } };
const cache = {};
export function kenoTable(n, risk) {
  const k = n + risk;
  if (cache[k]) return cache[k];
  const { s, b } = RISK[risk];
  const start = Math.max(1, Math.ceil(n * s));
  const w = Array.from({ length: n + 1 }, (_, h) => (h >= start ? Math.pow(b, h - start + 1) : 0));
  const ev = w.reduce((a, x, h) => a + x * P(n, h), 0);
  return (cache[k] = w.map((x) => Math.floor((x * 0.99 / ev) * 100) / 100));
}

css('keno', `
.keno-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; padding: 12px; width: 100%; }
.ktile { aspect-ratio: 1; border-radius: 6px; background: var(--bg4); box-shadow: 0 3px 0 #1d313d; font-weight: 800; font-size: 13px; position: relative; transition: background .15s, transform .1s; }
.ktile:active { transform: translateY(2px); }
.ktile.sel { background: #8b5cf6; box-shadow: 0 3px 0 #5b21b6; }
.ktile.drawn { background: #071824; color: var(--red); box-shadow: none; transform: translateY(3px); }
.ktile.hit { background: var(--green); color: var(--green-ink); box-shadow: 0 0 14px rgba(0,231,1,.6); animation: kHit .3s cubic-bezier(.3,1.7,.5,1); transform: none; }
@keyframes kHit { from { transform: scale(.6); } }
.keno-pay { display: flex; gap: 4px; padding: 0 12px 12px; overflow-x: auto; }
.keno-pay div { flex: 1 0 auto; min-width: 42px; background: var(--bg2); border-radius: 4px; padding: 5px 4px; text-align: center; font-size: 11px; font-weight: 800; }
.keno-pay div small { display: block; color: var(--txt3); font-size: 9.5px; }
.keno-pay div.on { background: var(--green); color: var(--green-ink); }
.keno-pay div.on small { color: var(--green-ink); }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'keno' });
  const pop = resultPop(stage);
  const grid = el('<div class="keno-grid"></div>');
  const pay = el('<div class="keno-pay"></div>');
  stage.append(grid, pay);
  stage.style.justifyContent = 'center';
  for (let i = 0; i < 40; i++) grid.append(el(`<button class="ktile">${i + 1}</button>`));
  const tiles = $$('.ktile', grid);
  const picks = new Set();
  let risk = 'med', busy = false, auto = false, stop = false;

  function renderPay(hits = -1) {
    const n = picks.size;
    if (!n) { pay.innerHTML = '<div style="flex:1;background:none;color:var(--txt3)">Choisis de 1 à 10 numéros</div>'; return; }
    const t = kenoTable(n, risk);
    pay.innerHTML = t.map((m, h) => `<div class="${h === hits ? 'on' : ''}">${m ? fmtX(m) : '0×'}<small>${h} ✓</small></div>`).join('');
  }
  function clearDraw() { tiles.forEach((t) => t.classList.remove('drawn', 'hit')); }
  tiles.forEach((t, i) => (t.onclick = () => {
    if (busy) return;
    clearDraw();
    if (picks.has(i)) picks.delete(i);
    else if (picks.size < 10) picks.add(i);
    else { sfx.error(); return; }
    t.classList.toggle('sel', picks.has(i));
    sfx.tick(1 + picks.size / 10, 0.1);
    renderPay();
  }));
  renderPay();

  const tabs = modeTabs((m) => { auto = m === 'auto'; autoF.el.classList.toggle('hidden', !auto); btn.textContent = auto ? 'Lancer l’auto' : 'Parier'; });
  const bet = betField('keno');
  const riskSeg = segmented([{ v: 'low', l: 'Faible' }, { v: 'med', l: 'Moyen' }, { v: 'high', l: 'Élevé' }], risk, (v) => { risk = v; renderPay(); }, 'sq');
  const riskW = el('<div><div class="label">Risque</div></div>'); riskW.append(riskSeg.el);
  const tools = el('<div class="ctl-row"><button class="btn sm" data-auto>🎲 Choix auto</button><button class="btn sm" data-clear>Effacer</button></div>');
  const autoF = autoField(); autoF.el.classList.add('hidden');
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(tabs.el, bet.el, riskW, tools, autoF.el, btn);
  $('[data-auto]', tools).onclick = () => {
    if (busy) return;
    clearDraw(); picks.clear(); tiles.forEach((t) => t.classList.remove('sel'));
    const pool = [...Array(40).keys()];
    for (let i = 0; i < 10; i++) picks.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    picks.forEach((i) => tiles[i].classList.add('sel'));
    sfx.shine(); renderPay();
  };
  $('[data-clear]', tools).onclick = () => { if (busy) return; clearDraw(); picks.clear(); tiles.forEach((t) => t.classList.remove('sel')); sfx.click(); renderPay(); };

  async function play() {
    if (!picks.size) { sfx.error(); return false; }
    const amount = bet.value;
    if (!placeBet('keno', amount)) return false;
    sfx.bet(); pop.hide(); clearDraw();
    const drawn = pickDistinct(fair.bet(10), 40, 10);
    const hits = drawn.filter((d) => picks.has(d)).length;
    let shown = 0;
    for (const d of drawn) {
      if (root.isConnected) await sleep(auto ? 45 : 110);
      if (picks.has(d)) { shown++; tiles[d].classList.add('hit'); sfx.gem(shown); }
      else { tiles[d].classList.add('drawn'); sfx.tick(0.9, 0.08); }
    }
    const m = kenoTable(picks.size, risk)[hits];
    renderPay(hits);
    settle('keno', amount, amount * m, { mult: m });
    if (m >= 1) { pop.show(m, amount * m); sfx.win(m); } else sfx.lose();
    return true;
  }

  btn.onclick = async () => {
    if (busy) { stop = true; return; }
    busy = true; stop = false; bet.disable(true); riskSeg.disable(true); tabs.disable(true);
    if (!auto) { btn.disabled = true; await play(); btn.disabled = false; }
    else {
      btn.textContent = 'Arrêter l’auto';
      let n = autoF.value || Infinity;
      while (n-- > 0 && !stop && root.isConnected) { if (!(await play())) break; await sleep(500); }
      btn.textContent = 'Lancer l’auto';
    }
    busy = false; bet.disable(false); riskSeg.disable(false); tabs.disable(false);
  };
  return () => { stop = true; };
}
