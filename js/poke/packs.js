import { S, placeBet, settle, fair, addItems, removeItems, sellItems, track, ach, uid, round2, isUnlocked, save } from '../store.js';
import { $, $$, el, css, money, fmt, sleep, confetti, haptic, toast, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { stream } from '../rng.js';
import { SETS, setById, products, openBooster, cardPrice, boosterEV, RARITY, PROMOS, marketFactor, sealedValue } from './data.js';
import { cardHTML, backHTML, packSVG, boxSVG, enableTilt, enableMotion, priceRow } from './card.js';
import { go } from '../main.js';

const KIND = { boosters: 'booster', etb: 'etb', display: 'display' };

css('packs', `
.pk-hero { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 12px 4px; background: radial-gradient(circle at 50% 35%, var(--sc), transparent 65%); }
.pk-hero .pack { filter: drop-shadow(0 14px 24px rgba(0,0,0,.6)); animation: packFloat 3s ease-in-out infinite; }
@keyframes packFloat { 50% { transform: translateY(-6px) rotate(1deg); } }
.pk-hero .nm { font-size: 18px; font-weight: 900; text-align: center; }
.pk-hero .sub { font-size: 12px; color: var(--txt2); text-align: center; }
.chase { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: none; }
.chase::-webkit-scrollbar { display: none; }
.chase > div { flex: none; }
.sealed-row { display: flex; align-items: center; gap: 10px; background: var(--bg2); border-radius: 8px; padding: 8px 10px; }

.po { position: absolute; inset: 0; pointer-events: auto; background: radial-gradient(circle at 50% 40%, #1d3448, #070f16 75%); display: flex; flex-direction: column; animation: fadeIn .25s; }
.po-top { display: flex; align-items: center; justify-content: space-between; padding: calc(var(--safe-t) + 10px) 14px 6px; font-size: 13px; }
.po-top .x { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.08); display: grid; place-items: center; }
.po-stage { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; perspective: 900px; overflow: hidden; }
.po-hint { text-align: center; color: var(--txt2); font-size: 13px; padding: 8px 16px calc(var(--safe-b) + 16px); min-height: 60px; }
.po-pack { position: relative; cursor: pointer; transition: transform .4s cubic-bezier(.3,1.4,.5,1); }
.po-pack .pack { filter: drop-shadow(0 20px 30px rgba(0,0,0,.6)); }
.po-pack.shake { animation: packShake .5s; }
@keyframes packShake { 20% { transform: rotate(-4deg); } 40% { transform: rotate(4deg); } 60% { transform: rotate(-3deg); } 80% { transform: rotate(2deg); } }
.po-pack .tear { position: absolute; left: 0; right: 0; top: 0; height: 13%; overflow: hidden; }
.po-pack.ripped .tear { animation: tearOff .7s cubic-bezier(.4,0,.6,1) forwards; }
@keyframes tearOff { to { transform: translate(140px,-160px) rotate(40deg); opacity: 0; } }
.po-pack.ripped .body { animation: packDown .6s .35s cubic-bezier(.5,0,.7,.4) forwards; }
@keyframes packDown { to { transform: translateY(120%); opacity: 0; } }
.po-stack { position: absolute; display: grid; place-items: center; }
.po-stack .pcard { position: absolute; transition: transform .45s cubic-bezier(.3,.9,.3,1), opacity .35s; }
.po-stack .pcard.gone { transform: translate(-130%, -10%) rotate(-24deg) !important; opacity: 0; }
.po-stack .pcard.rise { animation: cardRise .5s cubic-bezier(.2,1.2,.4,1) both; }
@keyframes cardRise { from { transform: translateY(80%) scale(.85); opacity: 0; } }
.po-stack .flipper { position: absolute; transform-style: preserve-3d; transition: transform .7s cubic-bezier(.3,1.3,.5,1); }
.po-stack .flipper.flipped { transform: rotateY(180deg); }
.po-stack .flipper > .face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.po-stack .flipper > .face.front { position: absolute; inset: 0; transform: rotateY(180deg); }
.po-glow { position: absolute; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, var(--gc), transparent 65%); opacity: 0; transition: opacity .4s; pointer-events: none; }
.po-glow.on { opacity: .8; animation: glowPulse 1.2s ease-in-out infinite alternate; }
@keyframes glowPulse { to { transform: scale(1.15); } }
.po-rays { position: absolute; width: 600px; height: 600px; background: repeating-conic-gradient(rgba(255,214,107,.18) 0 8deg, transparent 8deg 16deg); border-radius: 50%; animation: spin 10s linear infinite; mask-image: radial-gradient(circle, #000 15%, transparent 60%); -webkit-mask-image: radial-gradient(circle, #000 15%, transparent 60%); opacity: 0; transition: opacity .5s; pointer-events: none; }
.po-rays.on { opacity: 1; }
.po-tag { position: absolute; bottom: 12%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.6); border-radius: 99px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; white-space: nowrap; opacity: 0; transition: opacity .3s; display: flex; gap: 8px; align-items: center; }
.po-tag.on { opacity: 1; }
.po-sum { position: absolute; inset: 0; overflow-y: auto; padding: 8px 12px 20px; }
.po-sum .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 8px; justify-items: center; }
.po-sum .tot { text-align: center; margin: 4px 0 12px; }
.po-sum .tot b { font-size: 22px; }
.po-actions { display: flex; gap: 8px; padding: 0 12px calc(var(--safe-b) + 14px); }
.po-actions .btn { flex: 1; }
`);

export function mount(root, { id, args }) {
  const kind = KIND[id];
  const available = SETS.filter((s) => !s.vintage || isUnlocked('display') || kind === 'booster');
  let set = setById[args[0]] || available[0];
  enableTilt(root);
  function draw() {
    const prods = products(set);
    const prod = prods.find((p) => p.kind === kind);
    const ev = boosterEV(set) * prod.packs + (prod.promo ? PROMOS[set.id].price : 0);
    const chase = [...set.cards].sort((a, b) => b.price - a.price).slice(0, 8);
    const sealed = S.inv.cards.filter((c) => c.kind === 'sealed' && c.pkind === kind);
    root.innerHTML = `<div style="padding-bottom:24px">
      <div class="ptabs" style="padding:12px 12px 0;margin:0">${available.map((s) => `<button data-set="${s.id}" class="${s.id === set.id ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div>
      <div class="pk-hero" style="--sc:${set.color}55">
        ${kind === 'booster' ? packSVG(set, 150) : boxSVG(set, kind, 210)}
        <div class="nm">${esc(prod.name)}</div>
        <div class="sub">${esc(set.name)} · ${esc(set.era)} · ${prod.packs} booster${prod.packs > 1 ? 's' : ''}${prod.promo ? ' + 1 carte promo' : ''}</div>
        <div class="chip" style="margin-top:4px">Valeur moyenne estimée : ${fmt(ev)}</div>
      </div>
      <div style="padding:10px 12px" class="col">
        <button class="btn green full lg" data-open>Acheter et ouvrir · ${money(prod.price)}</button>
        <button class="btn full" data-keep>📦 Acheter et garder scellé</button>
        <div class="dim center" style="font-size:11px">Les produits scellés prennent de la valeur avec le temps 📈</div>
      </div>
      ${sealed.length ? `<div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2">Tes produits scellés</div></div><div class="col">${sealed.map((s) => `<div class="sealed-row"><div style="font-size:24px">${kind === 'booster' ? '🎴' : kind === 'etb' ? '🎁' : '📦'}</div><div class="grow"><b style="font-size:13px">${esc(setById[s.set].name)}</b><div style="font-size:11.5px" class="muted">Acheté ${fmt(s.paid)} · vaut ${fmt(sealedValue(s))}</div></div><button class="btn sm green" data-os="${s.id}">Ouvrir</button></div>`).join('')}</div></div>` : ''}
      <div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2">💎 Cartes recherchées</div><span class="more">${set.cards.length} cartes</span></div>
        <div class="chase">${chase.map((c) => `<div>${cardHTML(c, { w: 112 })}${priceRow(round2(c.price * marketFactor(c.id)), c.r)}</div>`).join('')}</div></div>
    </div>`;
    $$('[data-set]', root).forEach((b) => (b.onclick = () => { sfx.click(); set = setById[b.dataset.set]; draw(); }));
    $('[data-open]', root).onclick = () => {
      enableMotion();
      if (!placeBet(id, prod.price)) return;
      sfx.bet();
      openSession(set, prod.packs, { promo: prod.promo, cost: prod.price, game: id, onDone: draw });
    };
    $('[data-keep]', root).onclick = () => {
      if (!placeBet(id, prod.price)) return;
      sfx.chip();
      const u = uid();
      addItems('cards', [{ id: u, uid: u, kind: 'sealed', pkind: kind, set: set.id, packs: prod.packs, promo: !!prod.promo, paid: prod.price, price: prod.price, t: Date.now() }]);
      toast(`${prod.name} ajouté à ta collection`, { icon: '📦', sub: 'Ouvre-le quand tu veux, ou revends-le plus tard' });
      draw();
    };
    $$('[data-os]', root).forEach((b) => (b.onclick = () => {
      enableMotion();
      const it = S.inv.cards.find((c) => c.id === b.dataset.os);
      if (!it) return;
      removeItems('cards', [it.id]);
      openSession(setById[it.set], it.packs, { promo: it.promo, cost: it.paid, game: id, onDone: draw });
    }));
  }
  draw();
}

// ---------------------------------------------------------------------------
// Opening session (works for 1 booster, an ETB or a full display)
export function openSession(set, nPacks, { promo = false, cost = 0, game = 'boosters', onDone } = {}) {
  const next = stream(fair.bet(nPacks * 22 + 2));
  const packs = Array.from({ length: nPacks }, () => openBooster(set, next));
  if (promo) packs[packs.length - 1].push({ c: PROMOS[set.id], promo: true });
  // Everything goes to the collection right away (nothing lost if the app closes)
  const all = [];
  packs.forEach((p) => p.forEach((e) => {
    const price = cardPrice(e);
    e.item = { id: uid(), kind: 'card', cid: e.c.id, rev: !!e.rev, first: !!e.first, bp: round2(price / marketFactor(e.c.id)), price, t: Date.now() };
    all.push(e.item);
    S.dex[e.c.id] = (S.dex[e.c.id] || 0) + 1;
    if (e.c.r === 'SIR' || e.c.r === 'HR') ach('sir', true);
  }));
  addItems('cards', all);
  track('pack', nPacks);
  const value = round2(all.reduce((a, b) => a + b.price, 0));
  settle(game, cost, value, { noCredit: true, noBig: true });
  save();

  const ov = el(`<div class="po"><div class="po-top"><span data-count></span><span data-val class="muted"></span><button class="x" data-x>✕</button></div><div class="po-stage"><div class="po-rays"></div><div class="po-glow"></div></div><div class="po-hint"></div><div class="po-actions"></div></div>`);
  $('#overlay-root').append(ov);
  enableTilt(ov);
  const stage = $('.po-stage', ov), hint = $('.po-hint', ov), actions = $('.po-actions', ov), glow = $('.po-glow', ov), rays = $('.po-rays', ov);
  let pi = 0, opened = 0;
  const close = () => { ov.remove(); onDone?.(); };
  $('[data-x]', ov).onclick = () => { sfx.click(); if (pi < packs.length) summary(true); else close(); };
  const W = Math.min(250, innerWidth * 0.66);

  function header() {
    $('[data-count]', ov).textContent = nPacks > 1 ? `Booster ${Math.min(pi + 1, nPacks)}/${nPacks}` : set.name;
    $('[data-val]', ov).innerHTML = `Ouvert : ${money(opened)}`;
  }

  function showPack() {
    header();
    actions.innerHTML = nPacks - pi > 1 ? `<button class="btn" data-fast>⏩ Tout ouvrir (${nPacks - pi})</button>` : '';
    $('[data-fast]', actions)?.addEventListener('click', () => { sfx.click(); summary(true); });
    stage.querySelectorAll('.po-pack,.po-stack,.po-sum,.po-tag').forEach((n) => n.remove());
    glow.classList.remove('on'); rays.classList.remove('on');
    const p = el(`<div class="po-pack"><div class="body">${packSVG(set, W * 0.85)}</div><div class="tear">${packSVG(set, W * 0.85)}</div></div>`);
    stage.append(p);
    hint.innerHTML = '👆 Touche le booster pour le déchirer';
    let startX = null;
    const rip = () => {
      if (p.classList.contains('ripped')) return;
      p.classList.add('ripped');
      sfx.rip(); haptic(true);
      setTimeout(() => showCards(packs[pi]), 750);
    };
    p.addEventListener('pointerdown', (e) => { startX = e.clientX; p.classList.add('shake'); setTimeout(() => p.classList.remove('shake'), 500); });
    p.addEventListener('pointerup', (e) => { if (startX !== null) rip(); startX = null; });
  }

  function showCards(cards) {
    hint.innerHTML = '👆 Touche la carte pour voir la suivante';
    const stack = el('<div class="po-stack"></div>');
    stage.append(stack);
    const tag = el('<div class="po-tag"></div>');
    stage.append(tag);
    // rarest at the end (top of reveal order = first element)
    const order = [...cards];
    let i = 0;
    const nodes = order.map((e, k) => {
      const hit = RARITY[e.c.r].lvl >= 1 && !e.rev;
      const html = cardHTML(e.c, { rev: e.rev, first: e.first, w: W, cls: 'big' });
      const n = hit
        ? el(`<div class="flipper" style="width:${W}px;aspect-ratio:63/88"><div class="face">${backHTML(W)}</div><div class="face front">${html}</div></div>`)
        : el(html);
      n.style.zIndex = String(100 - k);
      n.dataset.hit = hit ? RARITY[e.c.r].lvl : '0';
      stack.append(n);
      return n;
    });
    nodes[0].classList.add('rise');
    sfx.deal();
    const showTag = (e) => {
      tag.innerHTML = `${money(e.item.price)}<span style="color:${RARITY[e.c.r].lvl >= 2 ? '#ffd66b' : 'var(--txt2)'}">${e.rev ? 'Reverse ' : ''}${RARITY[e.c.r].n}${e.first ? ' · 1re édition' : ''}${e.promo ? ' · Promo' : ''}</span>`;
      tag.classList.add('on');
    };
    const reveal = (k) => {
      const n = nodes[k], e = order[k];
      const lvl = +n.dataset.hit;
      if (lvl) {
        const col = lvl >= 4 ? '#ffd66b' : lvl >= 3 ? '#e2e8f0' : lvl >= 2 ? '#c084fc' : '#60a5fa';
        glow.style.setProperty('--gc', col);
        glow.classList.add('on');
        hint.innerHTML = '✨ Une carte rare ! Touche pour la retourner';
        n.dataset.ready = '1';
      } else showTag(e);
    };
    reveal(0);
    stack.onclick = () => {
      const n = nodes[i];
      if (!n) return;
      if (n.dataset.ready === '1') {
        n.dataset.ready = '2';
        n.classList.add('flipped');
        const lvl = +n.dataset.hit;
        sfx.rarity(lvl); haptic(lvl >= 3);
        if (lvl >= 3) { rays.classList.add('on'); confetti({ n: lvl >= 4 ? 220 : 120, colors: lvl >= 4 ? ['#ffd66b', '#fff', '#f59e0b', '#ff9ed2'] : undefined }); }
        showTag(order[i]);
        hint.innerHTML = '👆 Touche pour continuer';
        return;
      }
      opened = round2(opened + order[i].item.price);
      header();
      n.classList.add('gone');
      sfx.flip();
      tag.classList.remove('on'); glow.classList.remove('on'); rays.classList.remove('on');
      i++;
      if (i >= nodes.length) { setTimeout(() => packDone(order), 250); return; }
      reveal(i);
    };
  }

  function packDone(cards) {
    pi++;
    if (pi < packs.length) {
      stage.querySelectorAll('.po-stack,.po-tag').forEach((n) => n.remove());
      const best = [...cards].sort((a, b) => b.item.price - a.item.price)[0];
      hint.innerHTML = `Meilleure carte : <b>${esc(best.c.name)}</b> · ${money(best.item.price)}`;
      showPack();
      return;
    }
    summary(false);
  }

  function summary(fast) {
    // remaining packs are revealed instantly
    pi = packs.length;
    const entries = packs.flat();
    opened = value;
    header();
    stage.querySelectorAll('.po-pack,.po-stack,.po-tag').forEach((n) => n.remove());
    glow.classList.remove('on'); rays.classList.remove('on');
    const sorted = [...entries].sort((a, b) => b.item.price - a.item.price);
    const shown = nPacks > 1 ? sorted.slice(0, 24) : sorted;
    const best = sorted[0];
    if (fast) { const lvl = RARITY[best.c.r].lvl; sfx.rarity(Math.min(4, lvl)); if (lvl >= 3) confetti({ n: 160 }); }
    const profit = value - cost;
    const sum = el(`<div class="po-sum"><div class="tot"><div class="muted" style="font-size:12px">${nPacks} booster${nPacks > 1 ? 's' : ''} · ${entries.length} cartes</div><b>${money(value)}</b><div class="${profit >= 0 ? 'green' : 'red'}" style="font-size:12px;font-weight:800">${profit >= 0 ? '+' : ''}${fmt(profit)} vs prix payé</div></div>
      <div class="grid">${shown.map((e) => `<div>${cardHTML(e.c, { rev: e.rev, first: e.first, w: Math.min(110, (innerWidth - 60) / 3) })}${priceRow(e.item.price, e.c.r)}</div>`).join('')}</div>
      ${sorted.length > shown.length ? `<div class="dim center" style="font-size:12px;margin-top:10px">+ ${sorted.length - shown.length} autres cartes (${fmt(sorted.slice(shown.length).reduce((a, e) => a + e.item.price, 0))})</div>` : ''}</div>`);
    stage.append(sum);
    hint.innerHTML = '';
    hint.style.minHeight = '0';
    const cheap = entries.filter((e) => e.item.price < 1 && S.inv.cards.some((c) => c.id === e.item.id));
    actions.innerHTML = `<button class="btn" data-cheap ${cheap.length ? '' : 'disabled'}>Vendre &lt; 1 (${cheap.length})</button><button class="btn" data-all>Tout vendre</button><button class="btn green" data-keep>Garder</button>`;
    $('[data-cheap]', actions).onclick = () => { const g = sellItems('cards', cheap.map((e) => e.item.id)); sfx.cashout(); toast(`${cheap.length} cartes vendues · +${fmt(g)}`, { icon: '💰' }); close(); };
    $('[data-all]', actions).onclick = () => { const ids = entries.map((e) => e.item.id).filter((id) => S.inv.cards.some((c) => c.id === id)); const g = sellItems('cards', ids); sfx.cashout(); toast(`Tout vendu · +${fmt(g)}`, { icon: '💰' }); close(); };
    $('[data-keep]', actions).onclick = () => { sfx.click(); close(); };
    if (best && RARITY[best.c.r].lvl >= 4 && fast) toast(`Énorme ! ${best.c.name} (${RARITY[best.c.r].n})`, { type: 'gold', icon: '✨' });
  }

  showPack();
}
