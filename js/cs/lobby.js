import { S, sellItems, bus, isUnlocked } from '../store.js';
import { GAMES } from '../catalog.js';
import { $, $$, el, money, fmt, toast, confirmSheet, segmented } from '../ui.js';
import { sfx } from '../audio.js';
import { CASES, SKINS } from './data.js';
import { skinCard, caseSVG } from './art.js';
import { go } from '../main.js';

export function mount(page, tileGrid) {
  page.innerHTML = `
    <div class="h1">CS Skins</div>
    <div class="muted" style="font-size:12.5px">Caisses, upgrades et battles contre l’IA. Tous les skins sont revendables.</div>
    <div class="sec" data-tiles></div>
    ${isUnlocked('cases') ? `<div class="sec"><div class="sec-head"><div class="h2">📦 Caisses populaires</div><button class="more" data-all>Tout voir →</button></div><div class="tiles scroll" data-cases></div></div>` : ''}
    <div class="sec"><div class="sec-head"><div class="h2">🎒 Inventaire</div><span class="more" data-val></span></div>
      <div class="row" style="margin-bottom:10px"><div class="grow" data-sort></div><button class="btn sm" data-selmode>Sélection</button></div>
      <div class="grid2" data-inv></div></div>
    <div class="sticky-bar hidden" data-bar><button class="btn ghost grow" data-cancel>Annuler</button><button class="btn green grow" data-sell></button></div>`;
  $('[data-tiles]', page).append(tileGrid(GAMES.filter((g) => g.sec === 'cs')));
  const cw = $('[data-cases]', page);
  if (cw) {
    for (const c of [...CASES].sort((a, b) => a.price - b.price)) {
      const top = c.items.reduce((best, id) => (SKINS[id].p > SKINS[best].p ? id : best), c.items[0]);
      const t = el(`<button class="case-tile" style="flex:0 0 40%;scroll-snap-align:start;background:var(--bg2);border-radius:10px;padding:8px">${caseSVG(c, top)}<div style="font-weight:800;font-size:12px">${c.name}</div><div style="margin-top:4px;font-size:12px">${money(c.price)}</div></button>`);
      t.onclick = () => { sfx.click(); go('g/cases/' + c.id); };
      cw.append(t);
    }
    $('[data-all]', page).onclick = () => go('g/cases');
  }

  let sort = 'price', selMode = false;
  const sel = new Set();
  const sortSeg = segmented([{ v: 'price', l: 'Prix' }, { v: 'new', l: 'Récents' }, { v: 'rar', l: 'Rareté' }], sort, (v) => { sort = v; draw(); });
  $('[data-sort]', page).append(sortSeg.el);
  const inv = $('[data-inv]', page), bar = $('[data-bar]', page);

  function draw() {
    const items = [...S.inv.skins];
    if (sort === 'price') items.sort((a, b) => b.price - a.price);
    if (sort === 'rar') items.sort((a, b) => SKINS[b.sid].r - SKINS[a.sid].r || b.price - a.price);
    const total = items.reduce((a, b) => a + b.price, 0);
    $('[data-val]', page).innerHTML = `${items.length} objets · ${money(total)}`;
    if (!items.length) {
      inv.innerHTML = `<div class="empty" style="grid-column:span 2"><div class="e">📦</div>Ton inventaire est vide.<br>Ouvre une caisse pour obtenir tes premiers skins !</div>`;
    } else {
      inv.innerHTML = items.slice(0, 200).map((it) => skinCard(it, { sel: selMode ? sel.has(it.id) : null })).join('');
    }
    bar.classList.toggle('hidden', !selMode);
    const selVal = S.inv.skins.filter((s) => sel.has(s.id)).reduce((a, b) => a + b.price, 0);
    $('[data-sell]', page).innerHTML = sel.size ? `Vendre ${sel.size} · ${money(selVal)}` : 'Tout vendre';
    $('[data-selmode]', page).textContent = selMode ? 'Tout sélect.' : 'Sélection';
  }
  inv.onclick = (e) => {
    const card = e.target.closest('.skin[data-id]');
    if (!card) return;
    const id = card.dataset.id;
    if (!selMode) { selMode = true; sel.add(id); sfx.click(); draw(); return; }
    sel.has(id) ? sel.delete(id) : sel.add(id);
    sfx.tick(1.2, 0.08); draw();
  };
  $('[data-selmode]', page).onclick = () => {
    sfx.click();
    if (!selMode) selMode = true;
    else S.inv.skins.forEach((s) => sel.add(s.id));
    draw();
  };
  $('[data-cancel]', page).onclick = () => { selMode = false; sel.clear(); sfx.click(); draw(); };
  $('[data-sell]', page).onclick = async () => {
    const ids = sel.size ? [...sel] : S.inv.skins.map((s) => s.id);
    if (!ids.length) return;
    const val = S.inv.skins.filter((s) => ids.includes(s.id)).reduce((a, b) => a + b.price, 0);
    if (ids.length > 3 && !(await confirmSheet('Vendre ces skins ?', `${ids.length} objets pour ${fmt(val)}.`, 'Vendre'))) return;
    const got = sellItems('skins', ids);
    sfx.cashout();
    toast(`${ids.length} skin(s) vendu(s) pour ${fmt(got)}`, { icon: '💰' });
    sel.clear(); selMode = false; draw();
  };
  draw();
  const off = bus.on('inv', (k) => { if (k === 'skins') draw(); });
  return off;
}
