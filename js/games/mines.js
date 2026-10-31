import { placeBet, settle, fair, ach, luckRoll } from '../store.js';
import { $, $$, el, css, gameLayout, betField, selectField, money, fmtX, sleep, resultPop, shake, haptic } from '../ui.js';
import { pickDistinct } from '../rng.js';
import { sfx } from '../audio.js';

export const GEM_SVG = `<svg viewBox="0 0 64 64"><defs><linearGradient id="gmA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cf7ff"/><stop offset="1" stop-color="#00a3ff"/></linearGradient></defs><polygon points="10,24 22,10 42,10 54,24 32,56" fill="url(#gmA)"/><polygon points="10,24 54,24 32,56" fill="#0ea5e9"/><polygon points="22,10 27,24 37,24 42,10" fill="#c8fbff"/><polygon points="10,24 27,24 32,56" fill="#38bdf8"/><polygon points="27,24 37,24 32,56" fill="#7dd3fc"/><polygon points="37,24 54,24 32,56" fill="#0284c7"/></svg>`;
export const BOMB_SVG = `<svg viewBox="0 0 64 64"><circle cx="30" cy="36" r="20" fill="#1f1f24"/><circle cx="24" cy="30" r="7" fill="#fff" opacity=".18"/><rect x="34" y="12" width="10" height="10" rx="2" fill="#4b5563" transform="rotate(40 39 17)"/><path d="M42 12 q6-8 12-2" stroke="#f59e0b" stroke-width="3" fill="none"/><circle cx="54" cy="9" r="4" fill="#fde047"/><circle cx="54" cy="9" r="7" fill="#f97316" opacity=".4"/></svg>`;

css('mines', `
.mines-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 14px; width: 100%; max-width: 420px; margin: auto; }
.mtile { aspect-ratio: 1; border-radius: 8px; background: var(--bg4); box-shadow: 0 5px 0 #1d313d; position: relative; transition: transform .12s, background .2s, box-shadow .12s; }
.mtile.live:active { transform: translateY(3px); box-shadow: 0 2px 0 #1d313d; }
.mtile.live { background: #3a5566; }
.mtile.live::after { content: ''; position: absolute; inset: 0; border-radius: 8px; background: linear-gradient(180deg, rgba(255,255,255,.08), transparent); }
.mtile.rev { background: #071824; box-shadow: none; transform: translateY(5px); }
.mtile svg { position: absolute; inset: 16%; width: 68%; height: 68%; animation: tilePop .35s cubic-bezier(.3,1.7,.5,1); }
.mtile.dim svg { opacity: .35; transform: scale(.8); animation: none; }
.mtile.boom { background: #3b0a14; }
.mtile.boom::before { content: ''; position: absolute; inset: -10%; border-radius: 50%; background: radial-gradient(circle, rgba(255,120,0,.8), transparent 65%); animation: boom .6s ease-out forwards; }
@keyframes boom { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
@keyframes tilePop { from { transform: scale(.2) rotate(-20deg); } }
.mines-info { display: flex; justify-content: space-between; padding: 0 16px 6px; font-size: 12px; color: var(--txt2); }
.mines-info b { color: var(--txt); }
`);

const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
export const minesMult = (mines, k) => (k === 0 ? 1 : Math.floor((0.99 * C(25, k) / C(25 - mines, k)) * 100) / 100);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'mines' });
  const pop = resultPop(stage);
  const info = el('<div class="mines-info" style="padding-top:12px"><span>Prochain : <b data-n>—</b></span><span>Gemmes : <b data-g>0</b></span></div>');
  const grid = el('<div class="mines-grid"></div>');
  stage.append(info, grid);
  stage.style.justifyContent = 'center';
  for (let i = 0; i < 25; i++) grid.append(el(`<button class="mtile" data-i="${i}"></button>`));
  const tiles = $$('.mtile', grid);

  let mines = 3, game = null;
  const bet = betField('mines');
  const sel = selectField('Mines', Array.from({ length: 24 }, (_, i) => ({ v: i + 1, l: String(i + 1) })), mines, (v) => { mines = v; updInfo(); });
  const gemsF = el(`<div><div class="label">Gemmes</div><div class="field ro"><div class="in" data-gems>22</div></div></div>`);
  const row = el('<div class="ctl-row"></div>'); row.append(sel.el, gemsF);
  const profitF = el(`<div class="hidden"><div class="label"><span>Profit total</span><span data-pm>1.00×</span></div><div class="field ro"><div class="in" data-p></div></div></div>`);
  const btn = el('<button class="btn green full lg">Parier</button>');
  const rnd = el('<button class="btn full hidden">Case aléatoire</button>');
  controls.append(bet.el, row, profitF, btn, rnd);

  function updInfo() {
    $('[data-gems]', gemsF).textContent = 25 - mines;
    const k = game ? game.revealed.length : 0;
    $('[data-n]', info).textContent = fmtX(minesMult(mines, k + 1));
    $('[data-g]', info).textContent = `${k}/${25 - mines}`;
    if (game) {
      const m = minesMult(mines, k);
      $('[data-pm]', profitF).textContent = fmtX(m);
      $('[data-p]', profitF).innerHTML = money(game.amount * m - game.amount);
      btn.textContent = k ? `Encaisser ${(game.amount * m).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Encaisser';
      btn.disabled = k === 0;
    }
  }
  updInfo();

  function reset() {
    tiles.forEach((t) => { t.className = 'mtile'; t.innerHTML = ''; });
  }

  function start() {
    const amount = bet.value;
    if (!placeBet('mines', amount)) return;
    sfx.bet();
    reset();
    pop.hide();
    const fl = fair.bet(24);
    const minePos = new Set(pickDistinct(fl, 25, mines));
    game = { amount, mines: minePos, revealed: [] };
    tiles.forEach((t) => t.classList.add('live'));
    bet.disable(true); sel.disable(true);
    profitF.classList.remove('hidden'); rnd.classList.remove('hidden');
    btn.classList.remove('green'); btn.classList.add('orange');
    updInfo();
  }

  function revealAll(hitIdx) {
    tiles.forEach((t, i) => {
      t.classList.remove('live');
      if (t.classList.contains('rev')) return;
      t.classList.add('rev', 'dim');
      t.innerHTML = game.mines.has(i) ? BOMB_SVG : GEM_SVG;
    });
    if (hitIdx != null) { tiles[hitIdx].classList.remove('dim'); tiles[hitIdx].classList.add('boom'); }
  }

  function end() {
    game = null;
    bet.disable(false); sel.disable(false);
    profitF.classList.add('hidden'); rnd.classList.add('hidden');
    btn.classList.add('green'); btn.classList.remove('orange');
    btn.textContent = 'Parier'; btn.disabled = false;
    updInfo();
  }

  function click(i) {
    if (!game || game.revealed.includes(i) || game.busy) return;
    const t = tiles[i];
    t.classList.remove('live');
    t.classList.add('rev');
    // god mode: the mine quietly moves to another hidden tile
    if (game.mines.has(i) && luckRoll()) {
      const free = tiles.map((_, k) => k).filter((k) => k !== i && !game.mines.has(k) && !game.revealed.includes(k));
      if (free.length) { game.mines.delete(i); game.mines.add(free[Math.floor(Math.random() * free.length)]); }
    }
    if (game.mines.has(i)) {
      t.innerHTML = BOMB_SVG;
      sfx.bomb(); haptic(true);
      shake(stage);
      const amount = game.amount;
      revealAll(i);
      settle('mines', amount, 0, { mult: 0 });
      end();
      return;
    }
    game.revealed.push(i);
    t.innerHTML = GEM_SVG;
    sfx.gem(game.revealed.length);
    haptic();
    updInfo();
    if (game.revealed.length === 25 - mines) cashout();
  }

  function cashout() {
    if (!game || !game.revealed.length) return;
    const k = game.revealed.length;
    const m = minesMult(mines, k);
    const amount = game.amount;
    ach('mines_big', k >= 20);
    revealAll();
    settle('mines', amount, amount * m, { mult: m });
    pop.show(m, amount * m);
    sfx.cashout();
    end();
  }

  tiles.forEach((t, i) => (t.onclick = () => click(i)));
  btn.onclick = () => (game ? cashout() : start());
  rnd.onclick = () => {
    if (!game) return;
    const free = tiles.map((_, i) => i).filter((i) => !game.revealed.includes(i));
    click(free[Math.floor(Math.random() * free.length)]);
  };

  return () => {
    // leaving mid-game: auto cash-out what's safe so nothing is lost
    if (game && game.revealed.length) cashout();
    else if (game) settle('mines', game.amount, game.amount, { mult: 1 });
  };
}
