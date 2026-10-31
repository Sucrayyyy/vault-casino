import { placeBet, settle, fair, ach, canAfford, S } from '../store.js';
import { $, el, css, gameLayout, betField, sleep, money, fmt, shake, haptic, confetti } from '../ui.js';
import { sfx } from '../audio.js';
import { cardHTML } from './hilo.js';

const fromFloat = (f) => { const i = Math.floor(f * 52); return { r: (i % 13) + 1, s: Math.floor(i / 13) }; };
const val = (c) => (c.r === 1 ? 11 : Math.min(10, c.r));
export function total(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { t += val(c); if (c.r === 1) aces++; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { t, soft: aces > 0 && t <= 21 };
}

css('blackjack', `
.bj-table { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 14px 10px; background: radial-gradient(ellipse at 50% 40%, #13744a, #0b4a2f 70%, #083622); position: relative; min-height: 380px; }
.bj-table::before { content: 'BLACKJACK PAIE 3 POUR 2'; position: absolute; top: 48%; left: 0; right: 0; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 2px; color: rgba(255,255,255,.22); }
.bj-table::after { content: 'Le croupier reste sur 17'; position: absolute; top: calc(48% + 16px); left: 0; right: 0; text-align: center; font-size: 10px; font-weight: 700; color: rgba(255,255,255,.18); }
.bj-hand { display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 140px; }
.bj-hands { display: flex; justify-content: center; gap: 18px; }
.bj-cards { display: flex; padding-left: 34px; min-height: 104px; }
.bj-cards .cardf { width: 70px; height: 100px; margin-left: -34px; }
.bj-cards .cardf .r { font-size: 22px; } .bj-cards .cardf .s { font-size: 19px; top: 28px; } .bj-cards .cardf .c { font-size: 38px; }
.bj-total { min-width: 40px; text-align: center; padding: 4px 10px; border-radius: 99px; background: rgba(0,0,0,.45); font-size: 13px; font-weight: 900; }
.bj-total.win { background: var(--green); color: var(--green-ink); } .bj-total.lose { background: var(--red); } .bj-total.push { background: var(--orange); color: #2a1700; }
.bj-sub.active .bj-cards { filter: drop-shadow(0 0 10px rgba(255,255,255,.35)); }
.bj-sub { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.bj-sub .bet { font-size: 11px; opacity: .8; }
.bj-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bj-acts .btn { height: 48px; }
.bj-msg { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); font-size: 22px; font-weight: 900; padding: 8px 18px; border-radius: 8px; background: rgba(0,0,0,.6); opacity: 0; transition: opacity .2s; pointer-events: none; white-space: nowrap; }
.bj-msg.show { opacity: 1; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'blackjack', edge: '0,5 %' });
  const table = el(`<div class="bj-table"><div class="bj-hand" data-dealer><div class="bj-total" data-dt>0</div><div class="bj-cards"></div></div><div class="bj-msg"></div><div class="bj-hand"><div class="bj-hands" data-hands></div></div></div>`);
  stage.append(table);
  const dCards = $('[data-dealer] .bj-cards', table), dTot = $('[data-dt]', table), handsEl = $('[data-hands]', table), msg = $('.bj-msg', table);

  const bet = betField('blackjack');
  const acts = el(`<div class="bj-acts hidden"><button class="btn green" data-a="hit">Tirer</button><button class="btn" data-a="stand">Rester</button><button class="btn blue" data-a="double">Doubler</button><button class="btn" data-a="split">Séparer</button></div>`);
  const btn = el('<button class="btn green full lg">Distribuer</button>');
  controls.append(bet.el, acts, btn);

  let G = null; // game state
  let floats, fi;
  const draw = () => fromFloat(floats[fi++ % floats.length]);

  function render(reveal = false) {
    dCards.innerHTML = G.dealer.map((c, i) => (i === 1 && !reveal ? cardHTML(null, 'deal-in') : cardHTML(c, c._new ? 'deal-in' : ''))).join('');
    const shown = reveal ? G.dealer : G.dealer.slice(0, 1);
    dTot.textContent = shown.length ? total(shown).t : '';
    handsEl.innerHTML = G.hands.map((h, i) => {
      const t = total(h.cards);
      const cls = h.result === 'win' || h.result === 'bj' ? 'win' : h.result === 'lose' ? 'lose' : h.result === 'push' ? 'push' : '';
      return `<div class="bj-sub ${i === G.active && !G.over ? 'active' : ''}"><div class="bj-cards">${h.cards.map((c) => cardHTML(c, c._new ? 'deal-in' : '')).join('')}</div><div class="bj-total ${cls}">${t.soft && t.t < 21 ? `${t.t - 10}/${t.t}` : t.t}</div>${G.hands.length > 1 ? `<div class="bet">${money(h.bet)}</div>` : ''}</div>`;
    }).join('');
    [...G.dealer, ...G.hands.flatMap((h) => h.cards)].forEach((c) => delete c._new);
    updActs();
  }
  function updActs() {
    const playing = G && !G.over;
    acts.classList.toggle('hidden', !playing);
    btn.classList.toggle('hidden', !!playing);
    if (!playing) return;
    const h = G.hands[G.active];
    const two = h.cards.length === 2;
    $('[data-a="double"]', acts).disabled = !two || !canAfford(h.bet) || G.busy;
    $('[data-a="split"]', acts).disabled = !two || G.hands.length > 1 || val(h.cards[0]) !== val(h.cards[1]) || !canAfford(h.bet) || G.busy;
    $('[data-a="hit"]', acts).disabled = $('[data-a="stand"]', acts).disabled = G.busy;
  }
  function flash(text, color = '#fff') {
    msg.textContent = text; msg.style.color = color; msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 1600);
  }
  const deal = (arr) => { const c = draw(); c._new = true; arr.push(c); sfx.deal(); return c; };

  btn.onclick = async () => {
    const amount = bet.value;
    if (!placeBet('blackjack', amount)) return;
    sfx.bet();
    floats = fair.bet(52); fi = 0;
    G = { hands: [{ cards: [], bet: amount }], dealer: [], active: 0, over: false, busy: true, staked: amount };
    bet.disable(true);
    msg.classList.remove('show');
    const p = G.hands[0].cards;
    deal(p); render(); await sleep(220);
    deal(G.dealer); render(); await sleep(220);
    deal(p); render(); await sleep(220);
    deal(G.dealer); render(); await sleep(260);
    G.busy = false;
    const pbj = total(p).t === 21, up = val(G.dealer[0]);
    const dbj = total(G.dealer).t === 21;
    if (dbj && (up === 11 || up === 10)) {
      G.over = true; render(true); sfx.flip();
      G.hands[0].result = pbj ? 'push' : 'lose';
      finish(pbj ? 'Égalité' : 'Blackjack du croupier');
      return;
    }
    if (pbj) {
      G.hands[0].result = 'bj'; G.over = true; render(true);
      ach('bj', true);
      finish('BLACKJACK !');
      return;
    }
    render();
  };

  async function next() {
    G.active++;
    if (G.active < G.hands.length) {
      const h = G.hands[G.active];
      if (h.cards.length < 2) { deal(h.cards); render(); await sleep(250); }
      if (h.splitAces) { await next(); return; }
      render(); return;
    }
    await dealerPlay();
  }

  async function dealerPlay() {
    G.over = true; G.busy = true;
    render(true); sfx.flip(); await sleep(450);
    const live = G.hands.some((h) => total(h.cards).t <= 21);
    while (live && total(G.dealer).t < 17) { deal(G.dealer); render(true); await sleep(480); }
    const d = total(G.dealer).t;
    for (const h of G.hands) {
      const t = total(h.cards).t;
      h.result = t > 21 ? 'lose' : d > 21 || t > d ? 'win' : t === d ? 'push' : 'lose';
    }
    render(true);
    finish(d > 21 ? 'Le croupier saute !' : null);
  }

  function finish(text) {
    let payout = 0;
    for (const h of G.hands) {
      if (h.result === 'bj') payout += h.bet * 2.5;
      else if (h.result === 'win') payout += h.bet * 2;
      else if (h.result === 'push') payout += h.bet;
    }
    const staked = G.staked;
    settle('blackjack', staked, payout, { mult: payout / staked });
    const profit = payout - staked;
    if (profit > 0) { sfx.win(payout / staked); if (G.hands[0].result === 'bj') confetti({ n: 90, y: 0.5 }); flash(text || `+${fmt(profit)}`, '#00e701'); haptic(); }
    else if (profit === 0) { sfx.smallWin(); flash(text || 'Égalité', '#ff9d00'); }
    else { sfx.lose(); flash(text || 'Perdu', '#ed4163'); }
    G.over = true; G.busy = false;
    render(true);
    bet.disable(false);
  }

  acts.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a || !G || G.over || G.busy) return;
    const h = G.hands[G.active];
    if (a === 'hit') {
      G.busy = true; deal(h.cards); render(); await sleep(260); G.busy = false;
      const t = total(h.cards).t;
      if (t > 21) { sfx.lose(); shake(table); render(); await sleep(300); await next(); }
      else if (t === 21) { await next(); }
      else render();
    } else if (a === 'stand') {
      sfx.click(); await next();
    } else if (a === 'double') {
      if (!placeBet('blackjack', h.bet)) return;
      G.staked += h.bet; h.bet *= 2;
      sfx.chip(); G.busy = true; deal(h.cards); render(); await sleep(350); G.busy = false;
      if (total(h.cards).t > 21) { sfx.lose(); shake(table); }
      await next();
    } else if (a === 'split') {
      if (!placeBet('blackjack', h.bet)) return;
      G.staked += h.bet; sfx.chip();
      const c2 = h.cards.pop();
      const aces = h.cards[0].r === 1;
      G.hands.push({ cards: [c2], bet: h.bet, splitAces: aces });
      h.splitAces = aces;
      G.busy = true; deal(h.cards); render(); await sleep(300); G.busy = false;
      if (aces) { await next(); } else render();
    }
  };

  return () => {
    if (G && !G.over) {
      // stand on everything and resolve instantly
      G.hands.forEach((h) => { if (h.cards.length < 2) h.cards.push(draw()); });
      while (total(G.dealer).t < 17) G.dealer.push(draw());
      const d = total(G.dealer).t;
      let payout = 0;
      for (const h of G.hands) { const t = total(h.cards).t; payout += t > 21 ? 0 : d > 21 || t > d ? h.bet * 2 : t === d ? h.bet : 0; }
      settle('blackjack', G.staked, payout, { noBig: true });
    }
  };
}
