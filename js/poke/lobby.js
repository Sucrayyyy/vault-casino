import { S, bus, sellItems, round2 } from '../store.js';
import { GAMES } from '../catalog.js';
import { $, $$, el, css, money, fmt, toast, confirmSheet, sheet, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { icon } from '../icons.js';
import { INDEX, setMeta, loadSet, loadedSet, TIER, marketFactor, sealedValue, cardImg, setUnlock } from './data.js';
import { cardHTML, priceRow, tilt, lvlOf } from './card.js';
import { setLocked } from './packs.js';
import { go } from '../main.js';

export const gradeMul = (g, c) => {
  const top = c && lvlOf(c) >= 3 ? 1.4 : 1;
  return ({ 10: 4 * top, 9: 1.7, 8: 1.15, 7: 0.9, 6: 0.75, 5: 0.6, 4: 0.5, 3: 0.45 })[g] || 1;
};

export async function refreshMarket() {
  if (!S) return;
  const sets = new Set(S.inv.cards.filter((c) => c.kind === 'card').map((c) => c.set));
  await Promise.all([...sets].map((id) => loadSet(id).catch(() => null)));
  for (const c of S.inv.cards) {
    if (c.kind === 'sealed') c.price = sealedValue(c);
    else if (c.kind === 'card') {
      const card = loadedSet(c.set)?.byLid[c.lid];
      c.price = round2(c.bp * marketFactor(c.set + c.lid) * (c.grade ? gradeMul(c.grade, card) : 1));
    }
  }
}

css('plobby', `
.binder { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.binder .tc { width: 100%; --w: 80px; }
.tierbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; }
.tierbar span { font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 99px; background: var(--bg3); color: var(--txt2); }
.tierbar span b { color: #fff; }
.tierbar span.hit { background: rgba(255,214,107,.12); color: #ffd66b; }
.cgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 8px; }
.cgrid .tc { width: 100%; }
.cgrid > div { min-width: 0; }
`);

export function mount(page, tileGrid) {
  let tab = 'cards', binderSet = INDEX[0].id, alive = true;
  page.innerHTML = `
    <div class="h1">Pokémon TCG</div>
    <div class="muted" style="font-size:12.5px">${INDEX.length} extensions françaises de 1999 à aujourd’hui. Prix du marché Cardmarket.</div>
    <div class="sec" data-tiles></div>
    <div class="sec"><div class="sec-head"><div class="h2">${icon('book', 18)} Ma collection</div><span class="more" data-val></span></div>
      <div class="ptabs" style="margin-bottom:10px" data-tabs></div>
      <div data-body></div></div>`;
  $('[data-tiles]', page).append(tileGrid(GAMES.filter((g) => g.sec === 'poke')));
  const body = $('[data-body]', page);

  function drawTabs() {
    $('[data-tabs]', page).innerHTML = [['cards', 'Mes cartes'], ['binder', 'Classeur'], ['sealed', 'Scellés']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('');
    $$('[data-t]', page).forEach((b) => (b.onclick = () => { sfx.click(); tab = b.dataset.t; draw(); }));
  }

  async function draw() {
    drawTabs();
    const cards = S.inv.cards.filter((c) => c.kind === 'card');
    const sealed = S.inv.cards.filter((c) => c.kind === 'sealed' && c.v2);
    $('[data-val]', page).innerHTML = `${cards.length} cartes · ${money(S.inv.cards.reduce((a, b) => a + b.price, 0))}`;
    if (tab === 'cards') {
      const list = [...cards].sort((a, b) => b.price - a.price).slice(0, 90);
      await Promise.all([...new Set(list.map((c) => c.set))].map((id) => loadSet(id)));
      if (!alive) return;
      const w = Math.floor((Math.min(innerWidth, 560) - 40) / 3);
      body.innerHTML = list.length ? `<div class="cgrid">${list.map((c) => { const s = loadedSet(c.set), card = s.byLid[c.lid]; return `<div data-c="${c.id}">${cardHTML(s, card, { rev: c.rev, first: c.first, w })}${c.grade ? `<div class="chip gold" style="margin-top:4px">VGS ${c.grade}</div>` : ''}${priceRow(c.price, card)}</div>`; }).join('')}</div>
        ${cards.length > 90 ? `<div class="dim center" style="margin-top:8px;font-size:12px">+${cards.length - 90} autres cartes</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn grow" data-sellcheap>Vendre les cartes &lt; 1</button><button class="btn grow" data-sellall>Tout vendre</button></div>`
        : `<div class="empty"><div class="e">${icon('cards', 36)}</div>Aucune carte. Ouvre ton premier booster !<div class="spacer"></div><button class="btn green" data-go>Acheter un booster</button></div>`;
      $('[data-go]', body)?.addEventListener('click', () => go('g/boosters'));
      $$('[data-c]', body).forEach((n) => (n.onclick = () => openCard(n.dataset.c)));
      $('[data-sellcheap]', body)?.addEventListener('click', () => {
        const ids = cards.filter((c) => c.price < 1 && !c.grade).map((c) => c.id);
        if (!ids.length) return;
        const g = sellItems('cards', ids); sfx.cashout(); toast(`${ids.length} cartes vendues · +${fmt(g)}`, { icon: icon('coins') }); draw();
      });
      $('[data-sellall]', body)?.addEventListener('click', async () => {
        const v = cards.reduce((a, b) => a + b.price, 0);
        if (!(await confirmSheet('Tout vendre ?', `${cards.length} cartes pour ${fmt(v)}.`, 'Vendre'))) return;
        const g = sellItems('cards', cards.map((c) => c.id)); sfx.cashout(); toast(`Collection vendue · +${fmt(g)}`, { icon: icon('coins') }); draw();
      });
    } else if (tab === 'binder') {
      const s = await loadSet(binderSet);
      if (!alive) return;
      const owned = s.cards.filter((c) => S.dex[`${s.id}:${c.lid}`]);
      const tiers = Object.keys(TIER).filter((t) => s.byTier[t]);
      body.innerHTML = `<div class="row" style="gap:6px;overflow-x:auto;padding-bottom:6px">${INDEX.map((m) => `<button class="chip ${m.id === binderSet ? 'green' : ''}" data-bs="${m.id}" style="flex:none;padding:6px 10px">${esc(m.name)}</button>`).join('')}</div>
        <div class="panel" style="margin-top:6px"><div class="row"><div class="grow"><b>${esc(s.name)}</b><div class="dim" style="font-size:11.5px">${setLocked(s.id) ? `Débloquée à ${fmt(setUnlock(s.id))}` : 'Disponible'}</div></div><b>${owned.length}/${s.cards.length}</b></div>
        <div class="progress" style="margin:8px 0"><i style="width:${(owned.length / s.cards.length) * 100}%"></i></div>
        <div class="tierbar">${tiers.map((t) => `<span class="${TIER[t].lvl >= 3 ? 'hit' : ''}">${TIER[t].n} <b>${s.byTier[t].filter((c) => S.dex[`${s.id}:${c.lid}`]).length}/${s.byTier[t].length}</b></span>`).join('')}</div>
        <div class="binder">${s.cards.map((c) => { const has = S.dex[`${s.id}:${c.lid}`]; return `<div style="position:relative">${cardHTML(s, c, { w: 80, missing: !has })}${!has && TIER[c.tier].lvl >= 3 ? `<div style="position:absolute;inset:0;display:grid;place-items:center;color:#ffd66b;opacity:.7">${icon('lock', 18)}</div>` : ''}</div>`; }).join('')}</div></div>`;
      $$('[data-bs]', body).forEach((b) => (b.onclick = () => { binderSet = b.dataset.bs; sfx.click(); draw(); }));
      body.querySelector('[data-bs].green')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    } else {
      body.innerHTML = sealed.length ? `<div class="col">${sealed.map((s) => `<div class="li"><div class="ic">${icon('box')}</div><div class="tx"><b>${s.pkind === 'booster' ? 'Booster' : s.pkind === 'etb' ? 'Coffret ETB' : 'Display'} ${esc(setMeta[s.set]?.name || s.set)}</b><small>Payé ${fmt(s.paid)} · valeur ${fmt(s.price)} <span class="${s.price >= s.paid ? 'green' : 'red'}">(${s.price >= s.paid ? '+' : ''}${(((s.price / s.paid) - 1) * 100).toFixed(1)} %)</span></small></div><div class="col" style="gap:4px"><button class="btn sm green" data-open="${s.id}">Ouvrir</button><button class="btn sm" data-sell="${s.id}">Vendre</button></div></div>`).join('')}</div>`
        : `<div class="empty"><div class="e">${icon('box', 36)}</div>Aucun produit scellé.<br>Achète un ETB ou un display et garde-le fermé : sa valeur monte chaque jour.</div>`;
      $$('[data-open]', body).forEach((b) => (b.onclick = () => { const it = S.inv.cards.find((c) => c.id === b.dataset.open); if (it) go(`g/${it.pkind === 'booster' ? 'boosters' : it.pkind}/${it.set}`); }));
      $$('[data-sell]', body).forEach((b) => (b.onclick = () => { const g = sellItems('cards', [b.dataset.sell]); sfx.cashout(); toast(`Vendu · +${fmt(g)}`, { icon: icon('coins') }); draw(); }));
    }
  }

  function openCard(id) {
    const c = S.inv.cards.find((x) => x.id === id);
    if (!c) return;
    const set = loadedSet(c.set), card = set.byLid[c.lid];
    const s = sheet(`<div class="center" style="display:flex;flex-direction:column;align-items:center;gap:10px">${cardHTML(set, card, { rev: c.rev, first: c.first, w: Math.min(260, innerWidth * 0.66), q: 'high', cls: 'big' })}
      <div><b style="font-size:17px">${esc(card.name)}</b><div class="muted" style="font-size:12px">${esc(set.name)} · ${c.rev ? 'Reverse · ' : ''}${esc(card.rar)}${c.first ? ' · 1re édition' : ''}${c.grade ? ` · VGS ${c.grade}` : ''}</div></div>
      <div style="font-size:20px;font-weight:900">${money(c.price)}</div>
      <div class="row" style="width:100%"><button class="btn grow" data-grade ${c.grade ? 'disabled' : ''}>${icon('search', 16)} Faire grader</button><button class="btn green grow" data-sell>Vendre</button></div></div>`);
    tilt($('.tc', s.el));
    $('[data-sell]', s.el).onclick = () => { const g = sellItems('cards', [c.id]); sfx.cashout(); toast(`${card.name} vendue · +${fmt(g)}`, { icon: icon('coins') }); s.close(); draw(); };
    $('[data-grade]', s.el).onclick = () => { s.close(); go('g/grading/' + c.id); };
  }

  draw();
  const off = bus.on('inv', (k) => { if (k === 'cards' && tab !== 'binder') draw(); });
  return () => { alive = false; off(); };
}
