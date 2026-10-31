import { placeBet, settle, fair } from '../store.js';
import { $, el, css, gameLayout, betField, money, fmt, fmtX, sleep, resultPop, shake, haptic } from '../ui.js';
import { sfx } from '../audio.js';

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♦', '♣'];
export function cardHTML(c, extra = '') {
  if (!c) return `<div class="cardf back ${extra}"></div>`;
  const red = c.s === 1 || c.s === 2;
  return `<div class="cardf ${red ? 'red' : ''} ${extra}"><div class="r">${RANKS[c.r - 1]}</div><div class="s">${SUITS[c.s]}</div><div class="c">${SUITS[c.s]}</div></div>`;
}
const fromFloat = (f) => { const i = Math.floor(f * 52); return { r: (i % 13) + 1, s: Math.floor(i / 13) }; };

css('hilo', `
.hilo-main { flex: 1; display: flex; align-items: center; justify-content: center; gap: 18px; padding: 10px; position: relative; }
.hilo-main .cardf { width: 110px; height: 158px; border-radius: 10px; }
.hilo-main .cardf .r { font-size: 34px; top: 8px; left: 11px; }
.hilo-main .cardf .s { font-size: 30px; top: 46px; left: 10px; }
.hilo-main .cardf .c { font-size: 66px; right: 10px; bottom: 6px; }
.hilo-side { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 11px; color: var(--txt2); width: 70px; text-align: center; }
.hilo-side .ic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--bg3); font-size: 20px; }
.hilo-trail { display: flex; gap: 6px; padding: 8px 12px 12px; overflow-x: auto; min-height: 92px; align-items: flex-end; }
.hilo-trail .item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: none; }
.hilo-trail .cardf { width: 44px; height: 62px; border-radius: 5px; }
.hilo-trail .cardf .r { font-size: 14px; top: 3px; left: 5px; } .hilo-trail .cardf .s { font-size: 12px; top: 19px; left: 4px; } .hilo-trail .cardf .c { font-size: 20px; }
.hilo-trail .tag { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 99px; background: var(--bg4); }
.hilo-trail .tag.w { background: var(--green); color: var(--green-ink); } .hilo-trail .tag.l { background: var(--red); }
.hilo-btns { display: flex; gap: 8px; }
.hilo-btns .btn { flex: 1; height: 58px; flex-direction: column; gap: 2px; font-size: 13px; }
.hilo-btns .btn small { font-size: 11px; opacity: .8; font-weight: 700; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'hilo' });
  const pop = resultPop(stage);
  const main = el(`<div class="hilo-main"><div class="hilo-side"><div class="ic">▲</div><span>K est la plus haute</span></div><div class="flip3d" data-card></div><div class="hilo-side"><div class="ic">▼</div><span>A est la plus basse</span></div></div>`);
  const trail = el('<div class="hilo-trail"></div>');
  stage.append(main, trail);
  let floats = null, fi = 0;
  let cur = fromFloat(Math.random());
  let game = null;
  const showCard = (c, anim = true) => { $('[data-card]', main).innerHTML = cardHTML(c, anim ? 'flip-in' : ''); };
  showCard(cur, false);

  const bet = betField('hilo');
  const btns = el(`<div class="hilo-btns"><button class="btn" data-hi></button><button class="btn" data-lo></button></div>`);
  const skip = el('<button class="btn full sm">Passer la carte ⟳</button>');
  const profitF = el(`<div><div class="label"><span>Profit total</span><span data-pm>1.00×</span></div><div class="field ro"><div class="in" data-p>${money(0)}</div></div></div>`);
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(bet.el, btns, skip, profitF, btn);

  function odds(r) {
    if (r === 1) return { hi: { p: 12 / 13, l: 'Plus haut' }, lo: { p: 1 / 13, l: 'Égal' } };
    if (r === 13) return { hi: { p: 1 / 13, l: 'Égal' }, lo: { p: 12 / 13, l: 'Plus bas' } };
    return { hi: { p: (14 - r) / 13, l: 'Plus haut ou égal' }, lo: { p: r / 13, l: 'Plus bas ou égal' } };
  }
  const multOf = (p) => Math.floor((0.99 / p) * 100) / 100;

  function refresh() {
    const o = odds(cur.r);
    const hi = $('[data-hi]', btns), lo = $('[data-lo]', btns);
    hi.innerHTML = `▲ ${o.hi.l}<small>${(o.hi.p * 100).toFixed(1)} % · ${fmtX(multOf(o.hi.p))}</small>`;
    lo.innerHTML = `▼ ${o.lo.l}<small>${(o.lo.p * 100).toFixed(1)} % · ${fmtX(multOf(o.lo.p))}</small>`;
    hi.disabled = lo.disabled = skip.disabled = !game || game.busy;
    hi.className = 'btn ' + (game ? 'green' : ''); lo.className = 'btn ' + (game ? 'blue' : '');
    if (game) {
      $('[data-pm]', profitF).textContent = fmtX(game.mult);
      $('[data-p]', profitF).innerHTML = money(game.amount * game.mult - game.amount);
      btn.className = 'btn orange full lg';
      btn.textContent = game.mult > 1 ? `Encaisser ${fmt(game.amount * game.mult)}` : 'Encaisser';
      btn.disabled = game.mult <= 1 || game.busy;
    } else {
      btn.className = 'btn green full lg'; btn.textContent = 'Parier'; btn.disabled = false;
      $('[data-pm]', profitF).textContent = '1.00×';
      $('[data-p]', profitF).innerHTML = money(0);
    }
  }
  refresh();

  const next = () => fromFloat(floats[fi++ % floats.length]);
  function pushTrail(c, tag, cls) {
    trail.append(el(`<div class="item">${cardHTML(c)}<span class="tag ${cls}">${tag}</span></div>`));
    trail.scrollLeft = 99999;
  }

  btn.onclick = () => {
    if (game) { cashout(); return; }
    const amount = bet.value;
    if (!placeBet('hilo', amount)) return;
    sfx.bet();
    floats = fair.bet(52); fi = 0;
    pop.hide();
    trail.innerHTML = '';
    cur = next();
    sfx.flip();
    showCard(cur);
    game = { amount, mult: 1, busy: false };
    pushTrail(cur, 'Départ', '');
    bet.disable(true);
    refresh();
  };

  async function guess(dir) {
    if (!game || game.busy) return;
    game.busy = true; refresh();
    const o = odds(cur.r)[dir];
    const c = next();
    sfx.deal();
    await sleep(120);
    sfx.flip();
    showCard(c);
    let ok;
    if (dir === 'hi') ok = cur.r === 1 ? c.r > 1 : cur.r === 13 ? c.r === 13 : c.r >= cur.r;
    else ok = cur.r === 13 ? c.r < 13 : cur.r === 1 ? c.r === 1 : c.r <= cur.r;
    await sleep(260);
    if (ok) {
      game.mult = Math.floor(game.mult * multOf(o.p) * 100) / 100;
      pushTrail(c, fmtX(game.mult), 'w');
      sfx.gem(Math.min(10, trail.children.length)); haptic();
      cur = c;
      game.busy = false;
    } else {
      pushTrail(c, '✕', 'l');
      sfx.lose(); shake(stage); haptic(true);
      settle('hilo', game.amount, 0, { mult: 0 });
      cur = c;
      game = null; bet.disable(false);
    }
    refresh();
  }

  async function skipCard() {
    if (!game || game.busy) return;
    game.busy = true;
    const c = next();
    sfx.flip(); showCard(c); pushTrail(c, 'Passée', '');
    cur = c; await sleep(200); game.busy = false; refresh();
  }

  function cashout() {
    if (!game || game.mult <= 1) return;
    const { amount, mult } = game;
    settle('hilo', amount, amount * mult, { mult });
    pop.show(mult, amount * mult);
    sfx.cashout();
    game = null; bet.disable(false); refresh();
  }

  $('[data-hi]', btns).onclick = () => guess('hi');
  $('[data-lo]', btns).onclick = () => guess('lo');
  skip.onclick = skipCard;
  return () => { if (game) { if (game.mult > 1) cashout(); else settle('hilo', game.amount, game.amount, { mult: 1, noBig: true }); } };
}
