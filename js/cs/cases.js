import { S, placeBet, settle, fair, addItems, sellItems, track, ach, uid, canAfford, round2 } from '../store.js';
import { $, $$, el, css, money, fmt, confetti, haptic, segmented, toast, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { icon } from '../icons.js';
import { CASES, caseById, ITEMS, rollCase, imgURL } from './data.js';
import { caseImg, skinCard, skinImg } from './art.js';
import { makeSpinner } from './spinner.js';
import { go } from '../main.js';

css('cases', `
.case-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.case-tile { background: radial-gradient(circle at 50% 35%, #24435a, var(--bg2) 70%); border-radius: 10px; padding: 10px 10px 12px; text-align: center; position: relative; overflow: hidden; }
.case-tile:active { transform: scale(.98); }
.case-tile .nm { font-weight: 800; font-size: 13px; margin-top: 2px; }
.case-tile .pc { margin-top: 6px; display: inline-flex; background: var(--bg4); border-radius: 99px; padding: 4px 10px; font-size: 12.5px; }
.case-tile.cant .pc { color: var(--red); }
.case-tile .top { position: absolute; top: 8px; right: 8px; width: 46px; height: 34px; border-radius: 6px; background: rgba(228,174,57,.15); border: 1px solid rgba(228,174,57,.4); display: grid; place-items: center; }
.case-tile .top img { width: 40px; height: 28px; object-fit: contain; }
.case-head { display: flex; flex-direction: column; align-items: center; padding: 6px 12px 0; background: radial-gradient(circle at 50% 40%, #24435a, transparent 65%); }
.case-head .case-img { width: 190px; animation: caseFloat 3s ease-in-out infinite; }
@keyframes caseFloat { 50% { transform: translateY(-6px); } }
.case-head .t { font-size: 20px; font-weight: 900; }
.case-spins { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; }
.case-results { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 0 12px; }
.case-contents { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.case-contents .skin .art { height: 50px; }
.case-contents .skin .n { font-size: 11px; }
.case-contents .skin .pr { font-size: 10.5px; flex-wrap: wrap; }
.gold-strip { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
.gold-strip::-webkit-scrollbar { display: none; }
.gold-strip .skin { flex: 0 0 31%; }
.gold-flash { position: fixed; inset: 0; background: radial-gradient(circle, rgba(255,214,107,.7), transparent 70%); pointer-events: none; z-index: 150; animation: gflash 1s ease-out forwards; }
@keyframes gflash { from { opacity: 1; } to { opacity: 0; } }
.drop-hero { margin: 0 12px 10px; border-radius: 12px; padding: 14px; text-align: center; background: radial-gradient(circle at 50% 40%, var(--rc), transparent 70%), var(--bg2); position: relative; overflow: hidden; animation: popIn .45s cubic-bezier(.3,1.5,.5,1); }
.drop-hero img { width: 78%; max-width: 260px; aspect-ratio: 1.4; object-fit: contain; filter: drop-shadow(0 10px 18px rgba(0,0,0,.6)); }
.drop-hero .nm { font-size: 17px; font-weight: 900; }
.drop-hero .sub { font-size: 12px; color: var(--txt2); }
`);

const topItem = (c) => c.odds[0].id;

export function mount(root, { args }) {
  const c = caseById[args[0]];
  if (!c) return listView(root);
  return openView(root, c);
}

function listView(root) {
  root.innerHTML = `<div class="page"><div class="h1">Caisses</div><div class="muted" style="font-size:12.5px;margin-bottom:14px">${CASES.length} vraies caisses CS2, contenu et prix du marché réels.</div><div class="case-grid"></div></div>`;
  const grid = $('.case-grid', root);
  for (const c of CASES) {
    const t = el(`<button class="case-tile ${canAfford(c.price) ? '' : 'cant'}">${caseImg(c)}<div class="top">${skinImg(topItem(c), 128)}</div><div class="nm">${esc(c.name)}</div><div class="pc">${money(c.price)}</div></button>`);
    t.onclick = () => { sfx.click(); go(`g/cases/${c.id}`); };
    grid.append(t);
  }
}

function openView(root, c) {
  let qty = 1, busy = false;
  const normal = c.odds.filter((o) => ITEMS[o.id].r < 4).sort((a, b) => ITEMS[b.id].r - ITEMS[a.id].r);
  const gold = c.odds.filter((o) => ITEMS[o.id].r === 4);
  const goldP = gold.reduce((a, o) => a + o.p, 0);
  root.innerHTML = `<div style="padding-bottom:20px">
    <div class="case-head">${caseImg(c, 360)}<div class="t">${esc(c.name)}</div></div>
    <div class="case-spins" data-spins></div>
    <div style="padding:0 12px" class="col">
      <div class="qty"></div>
      <button class="btn green full lg" data-open></button>
      <div class="row"><button class="btn sm grow" data-back>${icon('back', 16)} Toutes les caisses</button><button class="btn sm grow" data-inv>${icon('bag', 16)} Inventaire</button></div>
    </div>
    <div data-results style="margin-top:12px"></div>
    <div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2" style="color:#ffd66b">${icon('star', 18)} Objets rares spéciaux</div><span class="more">${(goldP * 100).toFixed(2)} %</span></div>
      <div class="gold-strip">${gold.slice(0, 30).map((o) => skinCard({ id: o.id, ev: ITEMS[o.id].p.FT ?? Object.values(ITEMS[o.id].p)[0] }, { odds: o.p })).join('')}</div></div>
    <div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2">Contenu de la caisse</div><span class="more">Valeur moyenne ${fmt(c.ev)}</span></div><div class="case-contents">${normal.map((o) => skinCard({ id: o.id, ev: ITEMS[o.id].p.FT ?? Object.values(ITEMS[o.id].p)[0] }, { odds: o.p })).join('')}</div></div>
  </div>`;
  const spinsEl = $('[data-spins]', root), openB = $('[data-open]', root), resultsEl = $('[data-results]', root);
  $('[data-back]', root).onclick = () => go('g/cases');
  $('[data-inv]', root).onclick = () => go('cs');
  let spinners = [];
  function buildSpinners() {
    spinsEl.innerHTML = '';
    const h = qty === 1 ? 128 : qty <= 3 ? 100 : 80;
    const cell = qty === 1 ? 124 : qty <= 3 ? 104 : 88;
    spinners = Array.from({ length: qty }, () => { const s = makeSpinner(spinsEl, { cell, cross: h, names: qty === 1 }); s.idle(c); return s; });
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
    const fl = fair.bet(qty * 4);
    const items = Array.from({ length: qty }, (_, i) => ({ ...rollCase(c, fl[i * 4], fl[i * 4 + 1], fl[i * 4 + 2], fl[i * 4 + 3]), id: uid(), src: c.name }));
    // preload the winning images so the reveal is instant
    items.forEach((it) => { const im = new Image(); im.src = imgURL(ITEMS[it.k].img, 256); });
    addItems('skins', items);
    track('case', qty);
    await Promise.all(spinners.map((s, i) => s.spin(c, items[i].k, { duration: 5600 + i * 250 })));
    const best = Math.max(...items.map((it) => ITEMS[it.k].r));
    sfx.rarity(best);
    if (best >= 3) { haptic(true); confetti({ n: best === 4 ? 160 : 80, colors: best === 4 ? ['#ffd66b', '#e4ae39', '#fff'] : ['#eb4b4b', '#fff'] }); }
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
    const top = [...items].sort((a, b) => b.price - a.price)[0];
    const RC = ['#4b69ff', '#8847ff', '#d32ce6', '#eb4b4b', '#e4ae39'];
    resultsEl.innerHTML = `<div class="drop-hero" style="--rc:${RC[ITEMS[top.k].r]}88">${skinImg(top.k, 360)}<div class="nm">${top.st ? '<span style="color:#cf6a32">StatTrak™ </span>' : ''}${esc(ITEMS[top.k].w)} | ${esc(ITEMS[top.k].n)}</div><div class="sub">${top.wear} · float ${top.float.toFixed(4)}</div><div style="font-size:20px;font-weight:900;margin-top:4px">${money(top.price)}</div></div>
      ${items.length > 1 ? `<div style="padding:0 12px 8px"><b>Total</b> ${money(value)} <span class="${profit >= 0 ? 'green' : 'red'}" style="font-size:12px">(${profit >= 0 ? '+' : ''}${fmt(profit)})</span></div><div class="case-results">${items.map((it) => `<div class="col" style="gap:6px">${skinCard(it)}<button class="btn sm" data-sell="${it.id}">Vendre ${fmt(it.price)}</button></div>`).join('')}</div>` : `<div style="padding:0 12px"><button class="btn full" data-sell="${top.id}">Vendre ${fmt(top.price)}</button></div>`}
      ${items.length > 1 ? `<div style="padding:8px 12px"><button class="btn full" data-sellall>Tout vendre · ${money(value)}</button></div>` : ''}`;
    $$('[data-sell]', resultsEl).forEach((b) => (b.onclick = () => {
      const got = sellItems('skins', [b.dataset.sell]);
      if (got) sfx.cashout();
      b.disabled = true; b.innerHTML = got ? `${icon('check', 16)} Vendu` : 'Déjà vendu';
    }));
    $('[data-sellall]', resultsEl)?.addEventListener('click', (e) => {
      const ids = items.map((i) => i.id).filter((id) => S.inv.skins.some((s) => s.id === id));
      const got = sellItems('skins', ids);
      if (got) { sfx.cashout(); toast(`Vendu pour ${fmt(got)}`, { icon: icon('coins') }); }
      e.target.disabled = true;
      $$('[data-sell]', resultsEl).forEach((b) => { b.disabled = true; b.innerHTML = `${icon('check', 16)} Vendu`; });
    });
  }
}
