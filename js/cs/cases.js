import { S, placeBet, settle, fair, addItems, sellItems, track, ach, uid, canAfford, round2 } from '../store.js';
import { $, $$, el, css, money, fmt, sleep, confetti, haptic, segmented, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { CASES, SKINS, RAR, itemOdds, rollCase } from './data.js';
import { caseSVG, skinCard } from './art.js';
import { makeSpinner } from './spinner.js';
import { go } from '../main.js';

css('cases', `
.case-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.case-tile { background: var(--bg2); border-radius: 10px; padding: 10px 10px 12px; text-align: center; position: relative; overflow: hidden; }
.case-tile:active { transform: scale(.98); }
.case-tile .nm { font-weight: 800; font-size: 13px; margin-top: 2px; }
.case-tile .pc { margin-top: 6px; display: inline-flex; background: var(--bg4); border-radius: 99px; padding: 4px 10px; font-size: 12.5px; }
.case-tile.cant .pc { color: var(--red); }
.case-head { display: flex; flex-direction: column; align-items: center; padding: 6px 12px 0; }
.case-head .case-art { width: 180px; }
.case-head .t { font-size: 20px; font-weight: 900; }
.case-spins { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; }
.case-results { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 0 12px; }
.case-contents { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.case-contents .skin .art { height: 44px; }
.case-contents .skin .n { font-size: 11px; }
.qty .seg button { height: 34px; }
.gold-flash { position: fixed; inset: 0; background: radial-gradient(circle, rgba(255,214,107,.7), transparent 70%); pointer-events: none; z-index: 150; animation: gflash 1s ease-out forwards; }
@keyframes gflash { from { opacity: 1; } to { opacity: 0; } }
`);

export function mount(root, { args }) {
  const caseId = args[0];
  const c = CASES.find((x) => x.id === caseId);
  if (!c) return listView(root);
  return openView(root, c);
}

function listView(root) {
  root.innerHTML = `<div class="page"><div class="h1">Caisses</div><div class="muted" style="font-size:12.5px;margin-bottom:14px">Ouvre des caisses, collectionne des skins et revends-les quand tu veux.</div><div class="case-grid"></div></div>`;
  const grid = $('.case-grid', root);
  for (const c of [...CASES].sort((a, b) => a.price - b.price)) {
    const top = c.items.reduce((best, id) => (SKINS[id].p > SKINS[best].p ? id : best), c.items[0]);
    const t = el(`<button class="case-tile ${canAfford(c.price) ? '' : 'cant'}">${caseSVG(c, top)}<div class="nm">${c.name}</div><div class="pc">${money(c.price)}</div></button>`);
    t.onclick = () => { sfx.click(); go(`g/cases/${c.id}`); };
    grid.append(t);
  }
}

function openView(root, c) {
  const odds = itemOdds(c);
  const top = odds[0].id;
  let qty = 1, busy = false;
  root.innerHTML = `<div style="padding-bottom:20px">
    <div class="case-head">${caseSVG(c, top)}<div class="t">${c.name}</div></div>
    <div class="case-spins" data-spins></div>
    <div style="padding:0 12px" class="col">
      <div class="qty"></div>
      <button class="btn green full lg" data-open></button>
      <div class="row"><button class="btn sm grow" data-back>← Toutes les caisses</button><button class="btn sm grow" data-inv>🎒 Inventaire</button></div>
    </div>
    <div data-results style="margin-top:12px"></div>
    <div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2">Contenu de la caisse</div><span class="more">Valeur moyenne ${fmt(c.price / 1.1)}</span></div><div class="case-contents">${odds.map((o) => skinCard({ id: o.id }, { odds: o.p })).join('')}</div></div>
  </div>`;
  const spinsEl = $('[data-spins]', root), openB = $('[data-open]', root), resultsEl = $('[data-results]', root);
  $('[data-back]', root).onclick = () => go('g/cases');
  $('[data-inv]', root).onclick = () => go('cs');
  let spinners = [];
  function buildSpinners() {
    spinsEl.innerHTML = '';
    const h = qty === 1 ? 120 : qty <= 3 ? 96 : 78;
    const cell = qty === 1 ? 118 : qty <= 3 ? 100 : 86;
    spinners = Array.from({ length: qty }, () => { const s = makeSpinner(spinsEl, { cell, cross: h }); s.idle(c); return s; });
  }
  const seg = segmented([1, 2, 3, 4, 5].map((v) => ({ v, l: `×${v}` })), 1, (v) => { qty = v; buildSpinners(); updBtn(); }, 'sq');
  $('.qty', root).append(seg.el);
  const updBtn = () => { openB.innerHTML = `Ouvrir ${qty > 1 ? qty + ' caisses' : ''} · ${money(round2(c.price * qty))}`; };
  updBtn();
  requestAnimationFrame(buildSpinners);

  openB.onclick = async () => {
    if (busy) return;
    const cost = round2(c.price * qty);
    if (!placeBet('cases', cost)) return;
    busy = true; openB.disabled = true; seg.disable(true);
    sfx.bet();
    resultsEl.innerHTML = '';
    const fl = fair.bet(qty * 3);
    const items = Array.from({ length: qty }, (_, i) => ({ ...rollCase(c, fl[i * 3], fl[i * 3 + 1], fl[i * 3 + 2]), id: uid(), src: c.name }));
    // store immediately so leaving the page never loses anything
    addItems('skins', items);
    track('case', qty);
    await Promise.all(spinners.map((s, i) => s.spin(c, items[i].sid, { duration: 5200 + i * 250 })));
    const best = Math.max(...items.map((it) => SKINS[it.sid].r));
    sfx.rarity(best);
    if (best >= 3) { haptic(true); confetti({ n: best === 4 ? 200 : 100, colors: best === 4 ? ['#ffd66b', '#e4ae39', '#fff'] : ['#eb4b4b', '#fff'] }); }
    if (best === 4) { document.body.append(el('<div class="gold-flash"></div>')); setTimeout(() => $('.gold-flash')?.remove(), 1000); }
    ach('gold', best === 4); ach('covert', best >= 3);
    const value = round2(items.reduce((a, it) => a + it.price, 0));
    settle('cases', cost, value, { noCredit: true });
    showResults(items, value, cost);
    busy = false; openB.disabled = false; seg.disable(false);
    updBtn();
  };

  function showResults(items, value, cost) {
    const profit = value - cost;
    resultsEl.innerHTML = `<div style="padding:0 12px 8px" class="row"><div class="grow"><b>Tu as obtenu</b> <span class="${profit >= 0 ? 'green' : 'red'}" style="font-size:12px">(${profit >= 0 ? '+' : ''}${fmt(profit)})</span></div></div>
      <div class="case-results">${items.map((it) => `<div class="col" style="gap:6px">${skinCard(it)}<button class="btn sm" data-sell="${it.id}">Vendre ${fmt(it.price)}</button></div>`).join('')}</div>
      ${items.length > 1 ? `<div style="padding:8px 12px"><button class="btn full" data-sellall>Tout vendre · ${money(value)}</button></div>` : ''}`;
    $$('[data-sell]', resultsEl).forEach((b) => (b.onclick = () => {
      const got = sellItems('skins', [b.dataset.sell]);
      if (got) { sfx.cashout(); b.disabled = true; b.textContent = 'Vendu ✓'; }
      else { b.disabled = true; b.textContent = 'Déjà vendu'; }
    }));
    $('[data-sellall]', resultsEl)?.addEventListener('click', (e) => {
      const ids = items.map((i) => i.id).filter((id) => S.inv.skins.some((s) => s.id === id));
      const got = sellItems('skins', ids);
      if (got) { sfx.cashout(); toast(`Vendu pour ${fmt(got)}`, { icon: '💰' }); }
      e.target.disabled = true;
      $$('[data-sell]', resultsEl).forEach((b) => { b.disabled = true; b.textContent = 'Vendu ✓'; });
    });
  }
}
