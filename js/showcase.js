// Profile showcase: pin up to 6 cards / skins from the inventory.
import { S, save } from './store.js';
import { $, $$, el, css, sheet, money, fmt, segmented, esc } from './ui.js';
import { sfx } from './audio.js';
import { icon } from './icons.js';

const MAX = 6;

css('showcase', `
.vit { position: relative; border-radius: 18px; padding: 14px 12px 12px; background: radial-gradient(120% 70% at 50% 0%, rgba(255,214,107,.18), transparent 60%), linear-gradient(180deg, #213b52, #172c3e); box-shadow: inset 0 0 0 1px rgba(255,214,107,.18), 0 10px 26px rgba(0,0,0,.25); overflow: hidden; }
.vit::before { content: ''; position: absolute; left: 10%; right: 10%; top: -40px; height: 120px; background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.18), transparent 70%); pointer-events: none; }
.vit-grid { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.vit-slot { position: relative; aspect-ratio: 63/88; border-radius: 10px; display: grid; place-items: center; overflow: hidden; }
.vit-slot.empty { border: 2px dashed rgba(255,255,255,.18); color: var(--txt3); background: rgba(10,26,40,.35); }
.vit-slot .tc { width: 100%; }
.vit-slot.skin { background: radial-gradient(circle at 50% 45%, var(--rc), transparent 70%), rgba(10,26,40,.55); box-shadow: inset 0 -3px 0 var(--rc); }
.vit-slot.skin img { width: 92%; object-fit: contain; filter: drop-shadow(0 6px 8px rgba(0,0,0,.6)); }
.vit-slot .pv { position: absolute; left: 4px; right: 4px; bottom: 4px; font-size: 10px; font-weight: 900; text-align: center; background: rgba(0,0,0,.55); border-radius: 6px; padding: 2px 0; }
.vit-ped { height: 8px; margin: 10px 6px 0; border-radius: 99px; background: linear-gradient(90deg, transparent, rgba(255,214,107,.45), transparent); }
.pick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 56vh; overflow-y: auto; }
.pick-grid > button { position: relative; border-radius: 10px; background: rgba(37,68,90,.55); padding: 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10.5px; }
.pick-grid > button.on { outline: 2px solid var(--green); }
.pick-grid .tc { width: 100%; }
.pick-grid img.sk { width: 100%; height: 56px; object-fit: contain; }
`);

const exists = (p) => (p.kind === 'card' ? S.inv.cards : S.inv.skins).some((x) => x.id === p.id);
const itemOf = (p) => (p.kind === 'card' ? S.inv.cards : S.inv.skins).find((x) => x.id === p.id);

export async function renderShowcase(host) {
  S.showcase = (S.showcase || []).filter(exists);
  const list = S.showcase;
  const total = list.reduce((a, p) => a + (itemOf(p)?.price || 0), 0);
  host.innerHTML = `<div class="sec-head"><div class="h2">${icon('trophy', 18)} Ma vitrine</div><span class="more">${list.length ? money(total) : `${list.length}/${MAX}`}</span></div><div class="vit"><div class="vit-grid" data-g></div><div class="vit-ped"></div></div>`;
  const g = $('[data-g]', host);
  const needCards = list.some((p) => p.kind === 'card');
  const needSkins = list.some((p) => p.kind === 'skin');
  const [pk, pc, cs, ca] = await Promise.all([
    needCards ? import('./poke/data.js') : null, needCards ? import('./poke/card.js') : null,
    needSkins ? import('./cs/data.js') : null, needSkins ? import('./cs/art.js') : null,
  ]);
  if (needCards) await Promise.all([...new Set(list.filter((p) => p.kind === 'card').map((p) => itemOf(p).set))].map((id) => pk.loadSet(id)));
  const slots = [];
  for (let i = 0; i < MAX; i++) {
    const p = list[i];
    if (!p) { slots.push(`<button class="vit-slot empty" data-add>${icon('cards', 22)}</button>`); continue; }
    const it = itemOf(p);
    if (p.kind === 'card') {
      const set = pk.loadedSet(it.set), card = set.byLid[it.lid];
      slots.push(`<button class="vit-slot" data-i="${i}">${pc.cardHTML(set, card, { rev: it.rev, first: it.first, w: 100, q: 'high' })}<div class="pv">${fmt(it.price)}</div></button>`);
    } else {
      const rc = cs.RAR[cs.ITEMS[it.k].r].color;
      slots.push(`<button class="vit-slot skin" style="--rc:${rc}55" data-i="${i}">${ca.skinImg(it.k, 256)}<div class="pv">${fmt(it.price)}</div></button>`);
    }
  }
  g.innerHTML = slots.join('');
  $$('[data-add]', g).forEach((b) => (b.onclick = () => { sfx.click(); openPicker(host); }));
  $$('[data-i]', g).forEach((b) => (b.onclick = () => {
    sfx.click();
    const s = sheet(`<h3>Retirer de la vitrine ?</h3><div class="row"><button class="btn ghost grow" data-no>Garder</button><button class="btn red grow" data-yes>Retirer</button></div>`, { center: true });
    $('[data-no]', s.el).onclick = () => s.close();
    $('[data-yes]', s.el).onclick = () => { S.showcase.splice(+b.dataset.i, 1); save(); s.close(); renderShowcase(host); };
  }));
}

async function openPicker(host) {
  let tab = S.inv.cards.some((c) => c.kind === 'card') ? 'card' : 'skin';
  const s = sheet(`<h3>Ajouter à la vitrine</h3><div data-tabs style="margin-bottom:10px"></div><div class="pick-grid" data-list></div>`);
  const tabs = segmented([{ v: 'card', l: 'Cartes' }, { v: 'skin', l: 'Skins' }], tab, (v) => { tab = v; draw(); });
  $('[data-tabs]', s.el).append(tabs.el);
  const list = $('[data-list]', s.el);
  async function draw() {
    const pinned = new Set((S.showcase || []).map((p) => p.id));
    if (tab === 'card') {
      const items = S.inv.cards.filter((c) => c.kind === 'card').sort((a, b) => b.price - a.price).slice(0, 60);
      if (!items.length) { list.innerHTML = '<div class="empty" style="grid-column:span 3">Aucune carte.</div>'; return; }
      const [pk, pc] = await Promise.all([import('./poke/data.js'), import('./poke/card.js')]);
      await Promise.all([...new Set(items.map((c) => c.set))].map((id) => pk.loadSet(id)));
      list.innerHTML = items.map((c) => { const set = pk.loadedSet(c.set); return `<button data-id="${c.id}" class="${pinned.has(c.id) ? 'on' : ''}">${pc.cardHTML(set, set.byLid[c.lid], { rev: c.rev, w: 90 })}<span>${fmt(c.price)}</span></button>`; }).join('');
    } else {
      const items = [...S.inv.skins].sort((a, b) => b.price - a.price).slice(0, 60);
      if (!items.length) { list.innerHTML = '<div class="empty" style="grid-column:span 3">Aucun skin.</div>'; return; }
      const ca = await import('./cs/art.js');
      list.innerHTML = items.map((it) => `<button data-id="${it.id}" class="${pinned.has(it.id) ? 'on' : ''}">${ca.skinImg(it.k, 128, 'sk')}<span>${fmt(it.price)}</span></button>`).join('');
    }
    $$('[data-id]', list).forEach((b) => (b.onclick = () => {
      S.showcase ||= [];
      const i = S.showcase.findIndex((p) => p.id === b.dataset.id);
      if (i >= 0) S.showcase.splice(i, 1);
      else if (S.showcase.length < MAX) S.showcase.push({ kind: tab, id: b.dataset.id });
      else { sfx.error(); return; }
      sfx.chip(); save();
      b.classList.toggle('on');
      renderShowcase(host);
    }));
  }
  draw();
}
