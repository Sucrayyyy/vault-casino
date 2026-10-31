import { placeBet, settle, fair, luckRoll } from '../store.js';
import { $, $$, el, css, gameLayout, betField, selectField, money, fmt, fmtX, resultPop, shake, haptic } from '../ui.js';
import { pickDistinct } from '../rng.js';
import { sfx } from '../audio.js';

const LEVELS = 9;
const DIFF = {
  easy: { cols: 4, bad: 1, l: 'Facile' },
  med: { cols: 3, bad: 1, l: 'Moyen' },
  hard: { cols: 2, bad: 1, l: 'Difficile' },
  expert: { cols: 3, bad: 2, l: 'Expert' },
  master: { cols: 4, bad: 3, l: 'Maître' },
};
const mult = (d, k) => { const D = DIFF[d]; return k === 0 ? 1 : Math.floor((0.99 / Math.pow((D.cols - D.bad) / D.cols, k)) * 100) / 100; };

const EGG = `<svg viewBox="0 0 40 48"><ellipse cx="20" cy="27" rx="15" ry="19" fill="#fde68a"/><ellipse cx="20" cy="27" rx="15" ry="19" fill="url(#eggG)"/><defs><radialGradient id="eggG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fbbf24" stop-opacity=".3"/><stop offset="1" stop-color="#b45309" stop-opacity=".6"/></radialGradient></defs><path d="M10 22 l4 3 4-3 4 3 4-3 4 3" stroke="#b45309" stroke-width="1.6" fill="none" opacity=".6"/></svg>`;
const SKULL = `<svg viewBox="0 0 40 40"><path d="M20 4c-9 0-15 6-15 14 0 5 3 8 5 9v6h20v-6c2-1 5-4 5-9 0-8-6-14-15-14z" fill="#f1f5f9"/><circle cx="14" cy="19" r="4.5" fill="#7f1d1d"/><circle cx="26" cy="19" r="4.5" fill="#7f1d1d"/><path d="M18 26l2-4 2 4z" fill="#7f1d1d"/><path d="M14 33v-4M18 33v-4M22 33v-4M26 33v-4" stroke="#7f1d1d" stroke-width="1.6"/></svg>`;

css('tower', `
.tower { flex: 1; display: flex; flex-direction: column-reverse; gap: 6px; padding: 12px 14px; justify-content: flex-start; background: linear-gradient(180deg, #2a0d3d, var(--bg) 70%); }
.trow { display: flex; gap: 6px; align-items: center; opacity: .5; transition: opacity .25s; }
.trow.act { opacity: 1; }
.trow.done { opacity: .85; }
.trow .lvl { width: 52px; font-size: 11px; font-weight: 800; color: var(--txt2); text-align: right; }
.trow.act .lvl { color: var(--green); }
.ttile { flex: 1; height: 34px; border-radius: 6px; background: var(--bg4); box-shadow: 0 3px 0 #1d313d; position: relative; transition: transform .1s, background .2s; }
.trow.act .ttile { background: #4b6b80; box-shadow: 0 3px 0 #2b4352, 0 0 10px rgba(0,231,1,.12); }
.trow.act .ttile:active { transform: translateY(2px); }
.ttile.egg { background: rgba(0,231,1,.18) !important; box-shadow: none !important; }
.ttile.bad { background: rgba(237,65,99,.25) !important; box-shadow: none !important; }
.ttile svg { position: absolute; height: 82%; top: 9%; left: 50%; transform: translateX(-50%); animation: tilePop .3s cubic-bezier(.3,1.7,.5,1); }
.ttile.ghost svg { opacity: .35; animation: none; }
@keyframes tilePop { from { transform: translateX(-50%) scale(.2); } }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'tower' });
  const pop = resultPop(stage);
  const tower = el('<div class="tower"></div>');
  stage.append(tower);
  let diff = 'med', game = null;

  function build() {
    const D = DIFF[diff];
    tower.innerHTML = '';
    for (let r = 0; r < LEVELS; r++) {
      const row = el(`<div class="trow" data-r="${r}">${Array.from({ length: D.cols }, (_, c) => `<button class="ttile" data-c="${c}"></button>`).join('')}<div class="lvl">${fmtX(mult(diff, r + 1))}</div></div>`);
      tower.append(row);
    }
    $$('.ttile', tower).forEach((t) => (t.onclick = () => pickTile(+t.parentElement.dataset.r, +t.dataset.c)));
  }
  const rowEl = (r) => $(`.trow[data-r="${r}"]`, tower);
  function markActive() {
    $$('.trow', tower).forEach((r) => r.classList.toggle('act', !!game && +r.dataset.r === game.level));
  }

  const bet = betField('tower');
  const sel = selectField('Difficulté', Object.entries(DIFF).map(([v, d]) => ({ v, l: `${d.l} (${d.cols - d.bad}/${d.cols} sûres)` })), diff, (v) => { diff = v; build(); });
  const profitF = el(`<div class="hidden"><div class="label"><span>Profit</span><span data-pm></span></div><div class="field ro"><div class="in" data-p></div></div></div>`);
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(bet.el, sel.el, profitF, btn);

  function refresh() {
    if (!game) { btn.className = 'btn green full lg'; btn.textContent = 'Parier'; btn.disabled = false; profitF.classList.add('hidden'); return; }
    const m = mult(diff, game.level);
    profitF.classList.remove('hidden');
    $('[data-pm]', profitF).textContent = fmtX(m);
    $('[data-p]', profitF).innerHTML = money(game.amount * m - game.amount);
    btn.className = 'btn orange full lg';
    btn.textContent = game.level ? `Encaisser ${fmt(game.amount * m)}` : 'Encaisser';
    btn.disabled = !game.level;
  }

  function revealAll() {
    const D = DIFF[diff];
    for (let r = 0; r < LEVELS; r++) {
      const row = rowEl(r);
      $$('.ttile', row).forEach((t, c) => {
        if (t.innerHTML) return;
        t.classList.add('ghost', game.bad[r].includes(c) ? 'bad' : 'egg');
        t.innerHTML = game.bad[r].includes(c) ? SKULL : EGG;
      });
    }
  }

  function start() {
    const amount = bet.value;
    if (!placeBet('tower', amount)) return;
    sfx.bet(); pop.hide(); build();
    const D = DIFF[diff];
    const fl = fair.bet(LEVELS * D.bad);
    const bad = Array.from({ length: LEVELS }, (_, r) => pickDistinct(fl.slice(r * D.bad, (r + 1) * D.bad), D.cols, D.bad));
    game = { amount, level: 0, bad };
    bet.disable(true); sel.disable(true);
    markActive(); refresh();
  }

  function pickTile(r, c) {
    if (!game || r !== game.level) return;
    const t = $$('.ttile', rowEl(r))[c];
    if (game.bad[r].includes(c) && luckRoll()) {
      const free = Array.from({ length: DIFF[diff].cols }, (_, k) => k).filter((k) => !game.bad[r].includes(k));
      if (free.length) game.bad[r] = game.bad[r].map((b) => (b === c ? free[0] : b));
    }
    if (game.bad[r].includes(c)) {
      t.classList.add('bad'); t.innerHTML = SKULL;
      sfx.bomb(); shake(stage); haptic(true);
      revealAll();
      settle('tower', game.amount, 0, { mult: 0 });
      game = null; bet.disable(false); sel.disable(false); markActive(); refresh();
      return;
    }
    t.classList.add('egg'); t.innerHTML = EGG;
    rowEl(r).classList.add('done');
    game.level++;
    sfx.gem(game.level * 1.5); haptic();
    if (game.level === LEVELS) { cashout(); return; }
    markActive(); refresh();
  }

  function cashout() {
    if (!game || !game.level) return;
    const m = mult(diff, game.level);
    revealAll();
    settle('tower', game.amount, game.amount * m, { mult: m });
    pop.show(m, game.amount * m); sfx.cashout();
    game = null; bet.disable(false); sel.disable(false); markActive(); refresh();
  }

  btn.onclick = () => (game ? cashout() : start());
  build();
  return () => { if (game) { if (game.level) cashout(); else settle('tower', game.amount, game.amount, { mult: 1, noBig: true }); } };
}
