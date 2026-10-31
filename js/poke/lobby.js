import { S, bus, sellItems, removeItems, credit, round2, save } from '../store.js';
import { GAMES } from '../catalog.js';
import { $, $$, el, money, fmt, toast, confirmSheet, sheet, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { SETS, setById, cardById, RARITY, marketFactor, sealedValue } from './data.js';
import { cardHTML, enableTilt, priceRow, boxSVG, packSVG } from './card.js';
import { go } from '../main.js';

export function refreshMarket() {
  if (!S) return;
  for (const c of S.inv.cards) {
    if (c.kind === 'sealed') c.price = sealedValue(c);
    else if (cardById[c.cid]) c.price = round2(c.bp * marketFactor(c.cid) * (c.grade ? gradeMul(c.grade, cardById[c.cid]) : 1));
  }
}
export const gradeMul = (g, card) => {
  const top = RARITY[card.r].lvl >= 3 ? 1.4 : 1;
  return ({ 10: 4 * top, 9: 1.7, 8: 1.15, 7: 0.9, 6: 0.75, 5: 0.6, 4: 0.5, 3: 0.45, 2: 0.4, 1: 0.35 })[g] || 1;
};

export function mount(page, tileGrid) {
  refreshMarket();
  let tab = 'cards', setF = 'all';
  page.innerHTML = `
    <div class="h1">Pokémon TCG</div>
    <div class="muted" style="font-size:12.5px">Boosters, coffrets, displays, collection et revente au prix du marché.</div>
    <div class="sec" data-tiles></div>
    <div class="sec"><div class="sec-head"><div class="h2">📚 Ma collection</div><span class="more" data-val></span></div>
      <div class="ptabs" style="margin-bottom:10px" data-tabs></div>
      <div data-body></div></div>`;
  $('[data-tiles]', page).append(tileGrid(GAMES.filter((g) => g.sec === 'poke')));
  enableTilt(page);
  const body = $('[data-body]', page);

  function drawTabs() {
    const t = [['cards', 'Mes cartes'], ['binder', 'Classeur'], ['sealed', 'Scellés']];
    $('[data-tabs]', page).innerHTML = t.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('');
    $$('[data-t]', page).forEach((b) => (b.onclick = () => { sfx.click(); tab = b.dataset.t; draw(); }));
  }

  function draw() {
    drawTabs();
    const cards = S.inv.cards.filter((c) => c.kind === 'card');
    const sealed = S.inv.cards.filter((c) => c.kind === 'sealed');
    const tot = S.inv.cards.reduce((a, b) => a + b.price, 0);
    $('[data-val]', page).innerHTML = `${cards.length} cartes · ${money(tot)}`;
    if (tab === 'cards') {
      const list = cards.filter((c) => setF === 'all' || cardById[c.cid]?.set === setF).sort((a, b) => b.price - a.price);
      body.innerHTML = `<div class="row" style="margin-bottom:10px;gap:6px;overflow-x:auto">${['all', ...SETS.map((s) => s.id)].map((s) => `<button class="chip ${setF === s ? 'green' : ''}" data-sf="${s}" style="flex:none;padding:6px 10px">${s === 'all' ? 'Tous' : esc(setById[s].name)}</button>`).join('')}</div>
        ${list.length ? `<div class="grid3" style="justify-items:center">${list.slice(0, 120).map((c) => `<div data-c="${c.id}" style="width:100%;display:flex;flex-direction:column;align-items:center">${cardHTML(cardById[c.cid], { rev: c.rev, first: c.first, w: Math.min(112, (innerWidth - 48) / 3) })}${c.grade ? `<div class="chip gold" style="margin-top:4px">VGS ${c.grade}</div>` : ''}<div style="width:100%">${priceRow(c.price, cardById[c.cid].r)}</div></div>`).join('')}</div>
        ${list.length > 120 ? `<div class="dim center" style="margin-top:8px;font-size:12px">+${list.length - 120} cartes</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn grow" data-sellcheap>Vendre les cartes &lt; 1</button><button class="btn grow" data-sellall>Tout vendre</button></div>`
        : `<div class="empty"><div class="e">🎴</div>Aucune carte. Ouvre ton premier booster !<div class="spacer"></div><button class="btn green" data-go>Acheter un booster</button></div>`}`;
      $$('[data-sf]', body).forEach((b) => (b.onclick = () => { setF = b.dataset.sf; sfx.click(); draw(); }));
      $('[data-go]', body)?.addEventListener('click', () => go('g/boosters'));
      $$('[data-c]', body).forEach((n) => (n.onclick = () => openCard(n.dataset.c)));
      $('[data-sellcheap]', body)?.addEventListener('click', async () => {
        const ids = list.filter((c) => c.price < 1 && !c.grade).map((c) => c.id);
        if (!ids.length) return;
        const g = sellItems('cards', ids); sfx.cashout(); toast(`${ids.length} cartes vendues · +${fmt(g)}`, { icon: '💰' }); draw();
      });
      $('[data-sellall]', body)?.addEventListener('click', async () => {
        const ids = list.map((c) => c.id);
        const v = list.reduce((a, b) => a + b.price, 0);
        if (!(await confirmSheet('Tout vendre ?', `${ids.length} cartes pour ${fmt(v)}.`, 'Vendre'))) return;
        const g = sellItems('cards', ids); sfx.cashout(); toast(`Collection vendue · +${fmt(g)}`, { icon: '💰' }); draw();
      });
    } else if (tab === 'binder') {
      body.innerHTML = SETS.map((s) => {
        const uniq = s.cards.filter((c) => S.dex[c.id]).length;
        return `<div class="panel" style="margin-bottom:10px"><div class="row"><div class="grow"><b>${esc(s.name)}</b><div class="dim" style="font-size:11.5px">${esc(s.era)}</div></div><b>${uniq}/${s.cards.length}</b></div><div class="progress" style="margin:8px 0"><i style="width:${(uniq / s.cards.length) * 100}%"></i></div>
          <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px">${s.cards.map((c) => `<div title="${esc(c.name)}" style="aspect-ratio:63/88;border-radius:2px;background:${S.dex[c.id] ? (RARITY[c.r].lvl >= 3 ? 'linear-gradient(135deg,#ffd66b,#f59e0b)' : RARITY[c.r].lvl >= 1 ? 'linear-gradient(135deg,#c084fc,#60a5fa)' : '#3d5564') : 'var(--bg)'};border:1px solid var(--bg4)"></div>`).join('')}</div></div>`;
      }).join('');
    } else {
      body.innerHTML = sealed.length ? `<div class="col">${sealed.map((s) => `<div class="li"><div style="width:56px;flex:none">${s.pkind === 'booster' ? packSVG(setById[s.set], 40) : boxSVG(setById[s.set], s.pkind, 56)}</div><div class="tx"><b>${s.pkind === 'booster' ? 'Booster' : s.pkind === 'etb' ? 'Coffret ETB' : 'Display'} ${esc(setById[s.set].name)}</b><small>Payé ${fmt(s.paid)} · valeur ${fmt(s.price)} <span class="${s.price >= s.paid ? 'green' : 'red'}">(${s.price >= s.paid ? '+' : ''}${(((s.price / s.paid) - 1) * 100).toFixed(1)} %)</span></small></div><div class="col" style="gap:4px"><button class="btn sm green" data-open="${s.id}">Ouvrir</button><button class="btn sm" data-sell="${s.id}">Vendre</button></div></div>`).join('')}</div>`
        : '<div class="empty"><div class="e">📦</div>Aucun produit scellé.<br>Achète un ETB ou un display et garde-le fermé : sa valeur monte chaque jour.</div>';
      $$('[data-open]', body).forEach((b) => (b.onclick = () => {
        const it = S.inv.cards.find((c) => c.id === b.dataset.open);
        if (!it) return;
        go(`g/${it.pkind === 'booster' ? 'boosters' : it.pkind}/${it.set}`);
      }));
      $$('[data-sell]', body).forEach((b) => (b.onclick = () => { const g = sellItems('cards', [b.dataset.sell]); sfx.cashout(); toast(`Vendu · +${fmt(g)}`, { icon: '💰' }); draw(); }));
    }
  }

  function openCard(id) {
    const c = S.inv.cards.find((x) => x.id === id);
    if (!c) return;
    const card = cardById[c.cid];
    const s = sheet(`<div class="center" style="display:flex;flex-direction:column;align-items:center;gap:10px"><div data-big>${cardHTML(card, { rev: c.rev, first: c.first, w: Math.min(240, innerWidth * 0.62), cls: 'big' })}</div>
      <div><b style="font-size:17px">${esc(card.name)}</b><div class="muted" style="font-size:12px">${esc(setById[card.set].name)} · ${c.rev ? 'Reverse ' : ''}${RARITY[card.r].n}${c.first ? ' · 1re édition' : ''}${c.grade ? ` · VGS ${c.grade}` : ''}</div></div>
      <div style="font-size:20px;font-weight:900">${money(c.price)}</div>
      <div class="row" style="width:100%"><button class="btn grow" data-grade ${c.grade ? 'disabled' : ''}>🔍 Faire gradé</button><button class="btn green grow" data-sell>Vendre</button></div></div>`);
    enableTilt(s.el);
    $('[data-sell]', s.el).onclick = () => { const g = sellItems('cards', [c.id]); sfx.cashout(); toast(`${card.name} vendue · +${fmt(g)}`, { icon: '💰' }); s.close(); draw(); };
    $('[data-grade]', s.el).onclick = () => { s.close(); go('g/grading/' + c.id); };
  }

  draw();
  return bus.on('inv', (k) => { if (k === 'cards') draw(); });
}
