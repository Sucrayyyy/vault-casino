import { S, placeBet, settle, fair, addItems, removeItems, sellItems, track, ach, uid, round2, save, isStory, netWorth, canAfford } from '../store.js';
import { $, $$, el, css, money, fmt, sleep, confetti, haptic, toast, esc, fmtShort, COIN } from '../ui.js';
import { sfx } from '../audio.js';
import { icon } from '../icons.js';
import { stream } from '../rng.js';
import { INDEX, setMeta, loadSet, products, openBooster, cardPrice, marketFactor, TIER, cardImg, logoURL, setUnlock, sealedValue, ERA_NAME, GOD_P } from './data.js';
import { cardHTML, packHTML, packCovers, boxHTML, priceRow, lvlOf, tilt, enableMotion } from './card.js';
import { go } from '../main.js';

const KIND = { boosters: 'booster', etb: 'etb', display: 'display' };
export const setLocked = (id) => isStory() && S.peak < setUnlock(id);

css('packs2', `
.setbar { display: flex; gap: 8px; overflow-x: auto; padding: 12px 12px 4px; scrollbar-width: none; }
.setbar::-webkit-scrollbar { display: none; }
.setbar button { flex: none; width: 92px; height: 54px; border-radius: 8px; background: var(--bg2); display: grid; place-items: center; padding: 6px; position: relative; border: 2px solid transparent; }
.setbar button.on { border-color: var(--green); background: var(--bg3); }
.setbar button img { max-width: 100%; max-height: 100%; object-fit: contain; }
.setbar button span { font-size: 10px; font-weight: 800; text-align: center; line-height: 1.1; }
.setbar button.lock { opacity: .45; }
.setbar button .lk { position: absolute; right: 4px; top: 4px; color: #fff; }
.pk-hero { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px 4px; }
.pk-hero .nm { font-size: 18px; font-weight: 900; text-align: center; }
.pk-hero .sub { font-size: 12px; color: var(--txt2); text-align: center; }
.pk-float { animation: packFloat 3.2s ease-in-out infinite; }
@keyframes packFloat { 50% { transform: translateY(-7px) rotate(1deg); } }
.chase { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: none; }
.chase::-webkit-scrollbar { display: none; }
.chase > div { flex: none; width: 112px; }
.sealed-row { display: flex; align-items: center; gap: 10px; background: var(--bg2); border-radius: 8px; padding: 8px 10px; }

/* ---------- opening overlay ---------- */
.po { position: absolute; inset: 0; pointer-events: auto; background: radial-gradient(circle at 50% 42%, #1c3348, #060d14 72%); display: flex; flex-direction: column; overflow: hidden; touch-action: none; }
.po-top { display: flex; align-items: center; justify-content: space-between; padding: calc(var(--safe-t) + 10px) 14px 6px; font-size: 13px; position: relative; z-index: 20; }
.po-top .x { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.08); display: grid; place-items: center; }
.po-stage { flex: 1; position: relative; display: grid; place-items: center; }
.po-hint { text-align: center; color: var(--txt2); font-size: 13px; padding: 8px 16px calc(var(--safe-b) + 18px); min-height: 64px; position: relative; z-index: 20; display: flex; align-items: center; justify-content: center; gap: 6px; }
.po-aura { position: absolute; width: 140vw; height: 140vw; max-width: 720px; max-height: 720px; border-radius: 50%; background: radial-gradient(circle, var(--ac, transparent) 0%, transparent 55%); opacity: 0; transition: opacity .5s; pointer-events: none; }
.po-aura.on { opacity: .55; }
.po-rays { position: absolute; width: 760px; height: 760px; border-radius: 50%; pointer-events: none; opacity: 0; background: radial-gradient(circle, transparent 0, #060d14 62%), repeating-conic-gradient(var(--rc, rgba(255,214,107,.32)) 0 7deg, transparent 7deg 15deg); transition: opacity .35s; will-change: transform; }
.po-rays.on { opacity: 1; animation: spin 12s linear infinite; }
.po-flash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 45%, #fff, var(--fc, #fff) 30%, transparent 70%); opacity: 0; pointer-events: none; z-index: 15; }
.po-flash.go { animation: flash .7s ease-out; }
@keyframes flash { 0% { opacity: .95; } 100% { opacity: 0; } }
.po-banner { position: absolute; left: 50%; bottom: 4%; transform: translate(-50%, 20px); opacity: 0; z-index: 16; text-align: center; transition: transform .35s cubic-bezier(.3,1.5,.5,1), opacity .25s; pointer-events: none; white-space: nowrap; }
.po-banner.on { transform: translate(-50%, 0); opacity: 1; }
.po-banner .r { display: inline-block; padding: 5px 14px; border-radius: 99px; font-weight: 900; font-size: 13px; letter-spacing: .5px; background: rgba(0,0,0,.65); border: 1px solid rgba(255,255,255,.2); }
.po-banner .p { font-size: 22px; font-weight: 900; margin-top: 4px; display: flex; gap: 6px; align-items: center; justify-content: center; text-shadow: 0 2px 8px rgba(0,0,0,.7); }

.po-pack { position: relative; z-index: 5; transition: transform .6s cubic-bezier(.5,0,.7,.4), opacity .5s; }
.po-pack.out { transform: translateY(85vh) rotate(6deg); opacity: 0; }
.po-pack .cap { position: absolute; inset: 0; clip-path: inset(0 0 87% 0); z-index: 6; transition: transform .55s cubic-bezier(.3,.6,.4,1), opacity .55s; }
.po-pack.ripped .cap { transform: translate(46%, -60%) rotate(28deg); opacity: 0; }
.po-pack .body { clip-path: inset(13% 0 0 0); }
.po-pack .cut { position: absolute; left: 0; top: 13%; height: 3px; width: var(--p, 0%); background: #fff; box-shadow: 0 0 12px #fff, 0 0 24px #ffd66b; z-index: 7; border-radius: 2px; }
.po-pack .tearzone { position: absolute; left: -10%; right: -10%; top: -6%; height: 30%; z-index: 8; }
.po-pack .ld { position: absolute; inset: 0; display: grid; place-items: center; z-index: 9; color: #fff; font-size: 12px; font-weight: 800; background: rgba(0,0,0,.35); border-radius: 8px; }
.po-pack.shake { animation: packShake .45s; }
@keyframes packShake { 25% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } 75% { transform: rotate(-2deg); } }
.po-deck { position: absolute; z-index: 6; width: var(--cw); aspect-ratio: 63/88; }
.po-deck.rise { animation: deckRise .65s cubic-bezier(.2,1.1,.35,1) both; }
@keyframes deckRise { from { transform: translateY(46%) scale(.9); opacity: 0; } }
.po-card { position: absolute; inset: 0; will-change: transform; }
.po-card.top { z-index: 3; cursor: grab; }
.po-card.under { z-index: 2; }
.po-card.fly { transition: transform .38s cubic-bezier(.4,0,.8,.6), opacity .38s; opacity: 0; }
.po-card.snap { transition: transform .25s cubic-bezier(.3,1.4,.5,1); }
.po-card.pop .tc { animation: hitPop .55s cubic-bezier(.3,1.6,.5,1); }
@keyframes hitPop { 0% { transform: scale(.92); } 45% { transform: scale(1.06); } 100% { transform: scale(1); } }
.po-deck .edge { position: absolute; inset: 0; transform: translate(4px, 5px); border-radius: 12px; background: #0b1620; box-shadow: 3px 4px 0 #0e1c28, 6px 8px 0 #0b1620; z-index: 1; }
.po-count { position: absolute; top: -28px; left: 0; right: 0; text-align: center; font-size: 12px; color: var(--txt2); font-weight: 800; }
.po-sum { position: absolute; inset: 0; overflow-y: auto; padding: 4px 12px 20px; z-index: 18; animation: fadeIn .3s; }
.po-sum .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 8px; }
.po-sum .tot { text-align: center; margin: 4px 0 12px; }
.po-sum .tot b { font-size: 24px; }
.po-god { position: absolute; top: 6%; left: 0; right: 0; z-index: 17; text-align: center; pointer-events: none; animation: godIn 2.6s ease-out forwards; }
.po-god b { display: block; font-size: 46px; font-weight: 900; font-style: italic; letter-spacing: -1px; background: linear-gradient(180deg, #fff6c2, #ffc800 50%, #ff8a00); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 3px 0 #7a3c00) drop-shadow(0 0 18px rgba(255,180,0,.7)); }
.po-god span { font-size: 13px; font-weight: 800; color: #ffe08a; }
@keyframes godIn { 0% { transform: scale(.3); opacity: 0; } 12% { transform: scale(1.12); opacity: 1; } 20% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-20px); } }
.po-actions { display: flex; gap: 8px; padding: 0 12px calc(var(--safe-b) + 14px); flex-wrap: wrap; position: relative; z-index: 20; }
.po-actions .btn { flex: 1; min-width: 30%; }
`);

// ---------------------------------------------------------------------------
export async function mount(root, { id, args }) {
  const kind = KIND[id];
  let setId = args[0] && setMeta[args[0]] ? args[0] : INDEX.find((s) => !setLocked(s.id))?.id;
  let alive = true;
  root.innerHTML = '<div class="empty" style="padding-top:30vh">Chargement…</div>';

  async function draw() {
    const set = await loadSet(setId);
    if (!alive) return;
    const prod = products(set).find((p) => p.kind === kind);
    const ev = set.ev * prod.packs;
    const chase = [...set.cards].sort((a, b) => b.price - a.price).slice(0, 10);
    const covers = packCovers(set), cover = covers[0];
    const sealed = S.inv.cards.filter((c) => c.kind === 'sealed' && c.pkind === kind && c.v2);
    const locked = setLocked(set.id);
    root.innerHTML = `<div style="padding-bottom:24px">
      <div class="setbar">${INDEX.map((s) => `<button data-set="${s.id}" class="${s.id === setId ? 'on' : ''} ${setLocked(s.id) ? 'lock' : ''}">${s.logo ? `<img crossorigin="anonymous" src="${s.logo}.webp" alt="${esc(s.name)}" loading="lazy">` : `<span>${esc(s.name)}</span>`}${setLocked(s.id) ? `<span class="lk">${icon('lock', 14)}</span>` : ''}</button>`).join('')}</div>
      <div class="pk-hero"><div class="pk-float">${kind === 'booster' ? packHTML(set, cover, 168) : boxHTML(set, cover, kind, 240)}</div>
        <div class="nm">${esc(prod.name)}</div>
        <div class="sub">${esc(set.name)} · ${esc(ERA_NAME[set.era])} · ${set.cards.length} cartes</div>
        <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap;justify-content:center"><div class="chip">Valeur moyenne : ${fmt(ev)}</div><div class="chip gold">${icon('crown', 12)} God pack : 1 sur ${Math.round(1 / GOD_P).toLocaleString('fr-FR')}</div></div></div>
      <div style="padding:10px 12px" class="col">
        ${locked ? `<button class="btn full lg" disabled>${icon('lock', 18)} Débloquée à ${fmtShort(setUnlock(set.id))} de fortune</button>` : `
        <button class="btn green full lg" data-open>Acheter et ouvrir · ${money(prod.price)}</button>
        <button class="btn full" data-keep>${icon('box', 18)} Acheter et garder scellé</button>
        <div class="dim center" style="font-size:11px">Les produits scellés prennent de la valeur avec le temps</div>`}
      </div>
      ${sealed.length ? `<div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2">Tes produits scellés</div></div><div class="col">${sealed.map((s) => `<div class="sealed-row"><div class="grow"><b style="font-size:13px">${esc(setMeta[s.set]?.name || s.set)}</b><div style="font-size:11.5px" class="muted">Acheté ${fmt(s.paid)} · vaut ${fmt(sealedValue(s))}</div></div><button class="btn sm green" data-os="${s.id}">Ouvrir</button></div>`).join('')}</div></div>` : ''}
      <div class="sec" style="padding:0 12px"><div class="sec-head"><div class="h2">${icon('sparkle', 18)} Cartes recherchées</div><span class="more">Prix Cardmarket</span></div>
        <div class="chase">${chase.map((c) => `<div>${cardHTML(set, c, { w: 112 })}${priceRow(round2(c.price * marketFactor(set.id + c.lid)), c)}</div>`).join('')}</div></div>
    </div>`;
    const bar = $('.setbar', root);
    bar.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    $$('[data-set]', root).forEach((b) => (b.onclick = () => {
      if (setLocked(b.dataset.set)) { sfx.error(); toast(`Extension débloquée à ${fmt(setUnlock(b.dataset.set))} de fortune`, { type: 'red', icon: icon('lock') }); return; }
      sfx.click(); setId = b.dataset.set; draw();
    }));
    $('[data-open]', root)?.addEventListener('click', () => {
      enableMotion();
      if (!placeBet(id, prod.price)) return;
      sfx.bet();
      openSession(set, prod.packs, { cost: prod.price, game: id, onDone: draw, again: () => $('[data-open]', root)?.click() });
    });
    $('[data-keep]', root)?.addEventListener('click', () => {
      if (!placeBet(id, prod.price)) return;
      sfx.chip();
      const u = uid();
      addItems('cards', [{ id: u, uid: u, v2: 1, kind: 'sealed', pkind: kind, set: set.id, packs: prod.packs, paid: prod.price, price: prod.price, t: Date.now() }]);
      toast(`${prod.name} ajouté à ta collection`, { icon: icon('box'), sub: 'Ouvre-le quand tu veux, ou revends-le plus tard' });
      draw();
    });
    $$('[data-os]', root).forEach((b) => (b.onclick = () => {
      enableMotion();
      const it = S.inv.cards.find((c) => c.id === b.dataset.os);
      if (!it) return;
      removeItems('cards', [it.id]);
      openSession(set, it.packs, { cost: it.paid, game: id, onDone: draw });
    }));
  }
  draw();
  return () => { alive = false; };
}

// ---------------------------------------------------------------------------
const LVL_COLOR = ['#9fb3c8', '#60a5fa', '#c084fc', '#e2e8f0', '#ffd66b'];
// never block the tear for more than 2.5 s, even on a slow network
const preload = (urls) => Promise.race([new Promise((r) => setTimeout(r, 2500)), preloadAll(urls)]);
const preloadAll = (urls) => Promise.all(urls.map((u) => new Promise((res) => { const i = new Image(); i.decoding = 'async'; if (u.includes('tcgdex')) i.crossOrigin = 'anonymous'; i.onload = () => (i.decode ? i.decode().then(res, res) : res()); i.onerror = res; i.src = u; })));

export function openSession(set, nPacks, { cost = 0, game = 'boosters', onDone, again } = {}) {
  const next = stream(fair.bet(nPacks * 24 + 2));
  const packs = Array.from({ length: nPacks }, () => openBooster(set, next));
  // Everything goes to the collection immediately: closing the app never loses a card
  const all = [];
  packs.forEach((p) => p.forEach((e) => {
    const price = cardPrice(set, e);
    e.item = { id: uid(), kind: 'card', set: set.id, lid: e.c.lid, rev: !!e.rev, first: !!e.first, bp: round2(price / marketFactor(set.id + e.c.lid)), price, t: Date.now() };
    all.push(e.item);
    const key = `${set.id}:${e.c.lid}`;
    S.dex[key] = (S.dex[key] || 0) + 1;
    if (lvlOf(e.c) >= 4) ach('sir', true);
  }));
  addItems('cards', all);
  track('pack', nPacks);
  const value = round2(all.reduce((a, b) => a + b.price, 0));
  settle(game, cost, value, { noCredit: true, noBig: true });
  save();

  const W = Math.min(300, innerWidth * 0.74, (innerHeight - 220) * 0.715);
  const ov = el(`<div class="po" style="--cw:${W}px"><div class="po-top"><span data-count></span><span data-val class="muted"></span><button class="x" data-x aria-label="Fermer">${icon('close', 18)}</button></div>
    <div class="po-stage"><div class="po-aura"></div><div class="po-rays"></div><div class="po-flash"></div><div class="po-banner"><div class="r"></div><div class="p"></div></div></div>
    <div class="po-hint"></div><div class="po-actions"></div></div>`);
  $('#overlay-root').append(ov);
  const stage = $('.po-stage', ov), hint = $('.po-hint', ov), actions = $('.po-actions', ov);
  const aura = $('.po-aura', ov), rays = $('.po-rays', ov), flash = $('.po-flash', ov), banner = $('.po-banner', ov);
  let pi = 0, opened = 0, closed = false;
  const close = () => { closed = true; ov.remove(); onDone?.(); };
  $('[data-x]', ov).onclick = () => { sfx.click(); if (pi < packs.length) summary(true); else close(); };
  const header = () => {
    $('[data-count]', ov).textContent = nPacks > 1 ? `Booster ${Math.min(pi + 1, nPacks)}/${nPacks}` : set.name;
    $('[data-val]', ov).innerHTML = `${COIN}${fmt(opened)}`;
  };
  const setHint = (ic, txt) => { hint.innerHTML = ic ? `${icon(ic, 18)}<span>${txt}</span>` : txt; };
  const clearFx = () => { aura.classList.remove('on'); rays.classList.remove('on'); banner.classList.remove('on'); };

  // ---------------- pack + tear ----------------
  function showPack() {
    header(); clearFx();
    stage.querySelectorAll('.po-pack,.po-deck,.po-sum').forEach((n) => n.remove());
    actions.innerHTML = nPacks - pi > 1 ? `<button class="btn" data-fast>${icon('fast', 16)} Tout ouvrir (${nPacks - pi})</button>` : '';
    $('[data-fast]', actions)?.addEventListener('click', () => { sfx.click(); summary(true); });
    const cards = packs[pi];
    const covs = packCovers(set), cover = covs[Math.floor(Math.random() * covs.length)];
    const god = cards.every((e) => e.god);
    const p = el(`<div class="po-pack"><div class="body">${packHTML(set, cover, W * 0.86)}</div><div class="cap">${packHTML(set, cover, W * 0.86)}</div><div class="cut"></div><div class="tearzone"></div><div class="ld">Préparation…</div></div>`);
    stage.append(p);
    setHint('hand', 'Glisse le doigt le long du haut pour déchirer');
    let ready = false, progress = 0, startX = null, lastSnd = 0, ripped = false;
    // decode every image of this pack before the tear: no jank during the reveal
    preload(cards.map((e) => cardImg(set, e.c, lvlOf(e.c) >= 2 ? 'high' : 'low'))).then(() => { ready = true; $('.ld', p)?.remove(); });
    const cut = $('.cut', p);
    const rip = async () => {
      if (ripped) return;
      ripped = true;
      cut.style.setProperty('--p', '100%');
      p.classList.add('ripped');
      sfx.rip(); haptic(true);
      while (!ready && !closed) await sleep(60);
      await sleep(260);
      p.classList.add('out');
      if (god) godReveal();
      showDeck(cards);
    };
    const zone = $('.tearzone', p);
    zone.addEventListener('pointerdown', (e) => { startX = e.clientX; zone.setPointerCapture(e.pointerId); });
    zone.addEventListener('pointermove', (e) => {
      if (startX == null || ripped) return;
      progress = Math.max(progress, Math.min(1, Math.abs(e.clientX - startX) / (W * 0.8)));
      cut.style.setProperty('--p', `${progress * 100}%`);
      if (progress - lastSnd > 0.08) { lastSnd = progress; sfx.tearStep(); haptic(); }
      if (progress >= 0.9) rip();
    });
    zone.addEventListener('pointerup', () => { if (!ripped && progress < 0.15) rip(); startX = null; });
    p.addEventListener('click', (e) => { if (e.target === zone || ripped) return; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); setHint('hand', 'Glisse le long du haut… ou touche le haut du booster'); });
  }

  function godReveal() {
    ach('godpack', true);
    flash.style.setProperty('--fc', '#ffd66b');
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    rays.style.setProperty('--rc', 'rgba(255,214,107,.45)'); rays.classList.add('on');
    sfx.godPack(); haptic(true);
    confetti({ n: 220, coins: true, colors: ['#ffd66b', '#fff', '#f59e0b'] });
    const g = el(`<div class="po-god"><b>GOD PACK</b><span>Toutes les cartes sont des cartes rares</span></div>`);
    stage.append(g);
    setTimeout(() => g.remove(), 2600);
  }

  // ---------------- deck: swipe cards one by one ----------------
  function showDeck(cards) {
    let i = 0;
    const deck = el(`<div class="po-deck rise"><div class="po-count"></div><div class="edge"></div></div>`);
    stage.append(deck);
    setHint('hand', 'Fais glisser la carte pour voir la suivante');
    const count = $('.po-count', deck);
    const make = (k) => {
      const e = cards[k];
      const n = el(`<div class="po-card">${cardHTML(set, e.c, { rev: e.rev, first: e.first, w: W, q: lvlOf(e.c) >= 2 ? 'high' : 'low' })}</div>`);
      return n;
    };
    let top = make(0), under = cards[1] ? make(1) : null;
    top.classList.add('top'); deck.append(top);
    if (under) { under.classList.add('under'); deck.insertBefore(under, top); }
    const upd = () => {
      count.textContent = `${i + 1}/${cards.length}`;
      const nxt = cards[i + 1];
      const lv = nxt ? lvlOf(nxt.c) : 0;
      // subtle aura when something shiny is hiding under the current card
      aura.style.setProperty('--ac', LVL_COLOR[lv]);
      aura.classList.toggle('on', lv >= 3);
    };
    const reveal = () => {
      const e = cards[i];
      const lv = lvlOf(e.c);
      opened = round2(opened + e.item.price);
      header();
      banner.classList.remove('on');
      if (lv >= 1 || e.rev) {
        $('.r', banner).textContent = `${e.rev ? 'Reverse ' : ''}${e.c.rar}${e.first ? ' · 1re édition' : ''}`;
        $('.r', banner).style.color = LVL_COLOR[Math.max(lv, 1)];
        $('.p', banner).innerHTML = money(e.item.price);
        requestAnimationFrame(() => banner.classList.add('on'));
      }
      if (lv >= 2) {
        top.classList.add('pop');
        $('.tc', top).classList.add('sweep');
        flash.style.setProperty('--fc', LVL_COLOR[lv]);
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
        sfx.rarity(lv);
        haptic(lv >= 3);
        if (lv >= 3) { rays.style.setProperty('--rc', lv >= 4 ? 'rgba(255,214,107,.35)' : 'rgba(196,181,253,.3)'); rays.classList.add('on'); }
        if (lv >= 3) confetti({ n: lv >= 4 ? 140 : 60, y: 0.42, colors: lv >= 4 ? ['#ffd66b', '#fff', '#f59e0b', '#ff9ed2'] : ['#c4b5fd', '#fff', '#60a5fa'] });
        if (lv >= 4) setTimeout(() => confetti({ n: 80, x: 0.2, y: 0.5, coins: true }), 300);
        tilt($('.tc', top));
      } else if (lv === 1 || e.rev) sfx.shine();
      upd();
    };
    reveal();

    // drag logic
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, busy = false;
    const onDown = (e) => { if (busy) return; dragging = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; top.classList.remove('snap'); top.setPointerCapture?.(e.pointerId); };
    const onMove = (e) => {
      if (!dragging) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      top.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.06}deg)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const dist = Math.hypot(dx, dy);
      if (dist > 70 || dist < 6) advance(dist < 6 ? -1 : Math.sign(dx || -1), dist < 6 ? -0.4 : dy / (Math.abs(dx) + 1));
      else { top.classList.add('snap'); top.style.transform = ''; }
    };
    const advance = (dir, slope) => {
      busy = true;
      const old = top;
      old.classList.add('fly');
      old.style.transform = `translate(${dir * W * 1.4}px, ${slope * W * 0.6}px) rotate(${dir * 28}deg)`;
      sfx.cardSlide();
      clearFx();
      setTimeout(() => old.remove(), 400);
      i++;
      if (i >= cards.length) { aura.classList.remove('on'); setTimeout(() => { busy = false; packDone(cards); }, 300); return; }
      top = under; top.classList.remove('under'); top.classList.add('top');
      under = cards[i + 1] ? make(i + 1) : null;
      if (under) { under.classList.add('under'); deck.insertBefore(under, top); }
      bind();
      reveal();
      setTimeout(() => (busy = false), 160);
    };
    const bind = () => {
      top.onpointerdown = onDown; top.onpointermove = onMove; top.onpointerup = onUp; top.onpointercancel = onUp;
    };
    bind();
  }

  function packDone(cards) {
    pi++;
    stage.querySelectorAll('.po-deck').forEach((n) => n.remove());
    if (pi < packs.length) {
      const best = [...cards].sort((a, b) => b.item.price - a.item.price)[0];
      showPack();
      setHint('sparkle', `Meilleure carte : ${esc(best.c.name)} · ${fmt(best.item.price)}`);
      return;
    }
    summary(false);
  }

  // ---------------- summary ----------------
  function summary(fast) {
    pi = packs.length;
    const entries = packs.flat();
    opened = value;
    header(); clearFx();
    stage.querySelectorAll('.po-pack,.po-deck').forEach((n) => n.remove());
    const sorted = [...entries].sort((a, b) => b.item.price - a.item.price);
    const shown = nPacks > 1 ? sorted.slice(0, 24) : sorted;
    const best = sorted[0];
    if (fast) { const lv = lvlOf(best.c); sfx.rarity(Math.min(4, lv)); if (lv >= 3) confetti({ n: 120 }); }
    const profit = value - cost;
    const cw = Math.floor((Math.min(innerWidth, 560) - 44) / 3);
    const sum = el(`<div class="po-sum"><div class="tot"><div class="muted" style="font-size:12px">${nPacks} booster${nPacks > 1 ? 's' : ''} · ${entries.length} cartes</div><b>${money(value)}</b><div class="${profit >= 0 ? 'green' : 'red'}" style="font-size:12px;font-weight:800">${profit >= 0 ? '+' : ''}${fmt(profit)} vs prix payé</div></div>
      <div class="grid">${shown.map((e) => `<div>${cardHTML(set, e.c, { rev: e.rev, first: e.first, w: cw })}${priceRow(e.item.price, e.c)}</div>`).join('')}</div>
      ${sorted.length > shown.length ? `<div class="dim center" style="font-size:12px;margin-top:10px">+ ${sorted.length - shown.length} autres cartes (${fmt(sorted.slice(shown.length).reduce((a, e) => a + e.item.price, 0))})</div>` : ''}</div>`);
    stage.append(sum);
    hint.innerHTML = ''; hint.style.minHeight = '0'; hint.style.padding = '0';
    const owned = (e) => S.inv.cards.some((c) => c.id === e.item.id);
    const cheap = entries.filter((e) => e.item.price < 1 && owned(e));
    actions.innerHTML = `<button class="btn" data-cheap ${cheap.length ? '' : 'disabled'}>Vendre &lt; 1 (${cheap.length})</button><button class="btn" data-all>Tout vendre</button><button class="btn green" data-keep>Garder</button>${again && nPacks === 1 ? `<button class="btn blue" data-again style="flex-basis:100%">${icon('refresh', 16)} Ouvrir un autre booster</button>` : ''}`;
    $('[data-cheap]', actions).onclick = () => { const g = sellItems('cards', cheap.map((e) => e.item.id)); sfx.cashout(); toast(`${cheap.length} cartes vendues · +${fmt(g)}`, { icon: icon('coins') }); close(); };
    $('[data-all]', actions).onclick = () => { const ids = entries.filter(owned).map((e) => e.item.id); const g = sellItems('cards', ids); sfx.cashout(); toast(`Tout vendu · +${fmt(g)}`, { icon: icon('coins') }); close(); };
    $('[data-keep]', actions).onclick = () => { sfx.click(); close(); };
    $('[data-again]', actions)?.addEventListener('click', () => { sfx.click(); close(); setTimeout(again, 60); });
  }

  showPack();
}
