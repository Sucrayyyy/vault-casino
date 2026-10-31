import { S, placeBet, settle, fair, addItems, removeItems, ach, uid, round2, lucky } from '../store.js';
import { $, $$, el, css, money, fmt, sleep, confetti, haptic, shake, segmented, COIN, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { icon } from '../icons.js';
import { ITEMS, RAR, TARGETS, makeItem } from './data.js';
import { skinCard, skinImg } from './art.js';

const EDGE = 0.95, MAXC = 0.8, MINC = 0.01;
const R = 104, CIRC = 2 * Math.PI * R;

css('upgrader', `
.up-top { padding: 12px 12px 4px; background: radial-gradient(circle at 50% 28%, #133a5e, var(--bg) 72%); }
.up-hist { display: flex; gap: 5px; justify-content: center; min-height: 22px; margin-bottom: 4px; }
.up-hist span { font-size: 10.5px; font-weight: 800; padding: 3px 7px; border-radius: 99px; background: var(--bg4); }
.up-hist span.w { background: rgba(0,231,1,.18); color: var(--green); } .up-hist span.l { background: rgba(237,65,99,.18); color: var(--red); }
.up-gauge { position: relative; width: 248px; height: 248px; margin: 0 auto; }
.up-gauge svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.up-gauge .ring { transform: rotate(-90deg); }
.up-gauge .needle { transform-origin: 50% 50%; will-change: transform; }
.up-gauge .mid { position: absolute; inset: 40px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle, #183247, #0f212e 70%); box-shadow: inset 0 0 20px rgba(0,0,0,.5); }
.up-gauge .mid b { font-size: 36px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
.up-gauge .mid span { font-size: 12px; color: var(--txt2); margin-top: 4px; }
.up-gauge .mid img { width: 70%; max-height: 52%; object-fit: contain; display: none; }
.up-gauge.res .mid img { display: block; animation: popIn .4s cubic-bezier(.3,1.6,.5,1); }
.up-gauge.res .mid b { font-size: 18px; }
.up-gauge.win .mid { box-shadow: inset 0 0 30px rgba(0,231,1,.45); } .up-gauge.win .mid b { color: var(--green); }
.up-gauge.lose .mid { box-shadow: inset 0 0 30px rgba(237,65,99,.45); } .up-gauge.lose .mid b { color: var(--red); }
.up-pair { display: grid; grid-template-columns: 1fr 34px 1fr; gap: 6px; align-items: stretch; margin-top: 10px; }
.up-slot { position: relative; background: var(--bg2); border-radius: 10px; padding: 8px; min-height: 128px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 2px dashed var(--line); overflow: hidden; }
.up-slot.filled { border-style: solid; border-color: var(--rc, var(--line)); background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--rc, #2f4553) 35%, transparent), var(--bg2) 70%); }
.up-slot .t { position: absolute; top: 6px; left: 8px; font-size: 10px; color: var(--txt2); font-weight: 800; }
.up-slot img.big { width: 92%; height: 64px; object-fit: contain; filter: drop-shadow(0 6px 8px rgba(0,0,0,.5)); }
.up-slot .stack { display: flex; justify-content: center; height: 64px; align-items: center; }
.up-slot .stack img { width: 56px; height: 44px; object-fit: contain; margin: 0 -10px; filter: drop-shadow(0 3px 4px rgba(0,0,0,.5)); }
.up-slot .nm { font-size: 11px; font-weight: 800; margin-top: 4px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.up-slot .pv { font-size: 13px; font-weight: 900; margin-top: 2px; }
.up-slot .hint { font-size: 11.5px; color: var(--txt3); padding: 0 6px; }
.up-mid { display: grid; place-items: center; color: var(--txt3); }
.up-chance { display: flex; align-items: center; gap: 10px; }
.up-chance input { flex: 1; }
.up-chance b { width: 64px; text-align: right; font-size: 15px; }
.up-mults { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.up-mults::-webkit-scrollbar { display: none; }
.up-mults button { flex: 1 0 auto; height: 34px; padding: 0 10px; border-radius: 6px; background: var(--bg4); font-size: 12.5px; font-weight: 800; }
.up-list { max-height: 420px; overflow-y: auto; padding: 2px; -webkit-overflow-scrolling: touch; }
.up-search { display: flex; gap: 8px; }
`);

export function mount(root) {
  root.innerHTML = `<div>
    <div class="up-top">
      <div class="up-hist" data-hist></div>
      <div class="up-gauge" data-g>
        <svg viewBox="0 0 248 248" class="ring"><circle cx="124" cy="124" r="${R}" fill="none" stroke="#1d3443" stroke-width="22"/>
          ${Array.from({ length: 40 }, (_, i) => `<line x1="124" y1="${124 - R - 11}" x2="124" y2="${124 - R + 11}" stroke="#0f212e" stroke-width="1.5" transform="rotate(${i * 9} 124 124)"/>`).join('')}
          <circle data-arc cx="124" cy="124" r="${R}" fill="none" stroke="url(#upg)" stroke-width="22" stroke-dasharray="0 ${CIRC}" style="transition:stroke-dasharray .35s, stroke-dashoffset .35s"/>
          <defs><linearGradient id="upg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5dff5e"/><stop offset="1" stop-color="#00b301"/></linearGradient></defs></svg>
        <svg viewBox="0 0 248 248" class="needle" data-needle><path d="M124 4 l11 26 h-22z" fill="#fff" stroke="#0f212e" stroke-width="2.5"/><circle cx="124" cy="10" r="3" fill="#ffc800"/></svg>
        <div class="mid"><img data-resimg alt=""><b data-ch>0 %</b><span data-mu>Choisis une mise</span></div>
      </div>
      <div class="up-pair">
        <div class="up-slot" data-in><div class="t">TA MISE</div><div data-inv class="hint">Sélectionne tes skins<br>et/ou du solde</div></div>
        <div class="up-mid">${icon('arrow', 22)}</div>
        <div class="up-slot" data-out><div class="t">CIBLE</div><div data-tgt class="hint">Choisis une cible<br>ou règle la chance</div></div>
      </div>
    </div>
    <div class="controls" style="border-radius:12px 12px 0 0;margin-top:8px">
      <div class="ctl-row">
        <div><div class="label"><span>Solde ajouté</span></div><div class="field"><div class="in">${COIN}<input data-bali inputmode="decimal" value="0"></div><button class="fbtn" data-b="0.1">10%</button></div></div>
        <div style="flex:0 0 42%"><div class="label"><span>Lancer</span></div><div data-mode></div></div>
      </div>
      <div><div class="label"><span>Chance de gain</span><span class="dim">max ${MAXC * 100} %</span></div><div class="up-chance"><input type="range" class="range" min="1" max="80" step="1" value="50" data-slider><b data-sv>50 %</b></div></div>
      <div class="up-mults">${[1.5, 2, 3, 5, 10, 20, 50, 100].map((m) => `<button data-m="${m}">×${m}</button>`).join('')}</div>
      <button class="btn green full lg" data-go disabled>Améliorer</button>
      <div data-tabs></div>
      <div class="up-search hidden" data-searchrow><div class="field" style="flex:1"><div class="in">${icon('search', 16)}<input data-q placeholder="Rechercher (AK, Karambit…)"></div></div></div>
      <div class="up-list"><div class="grid2" data-list></div><button class="btn full sm hidden" data-more style="margin-top:8px">Voir plus</button></div>
    </div></div>`;
  const arc = $('[data-arc]', root), needle = $('[data-needle]', root), gauge = $('[data-g]', root);
  const balIn = $('[data-bali]', root), goB = $('[data-go]', root), list = $('[data-list]', root), slider = $('[data-slider]', root);
  const sel = new Set();
  let target = null, tab = 'inv', busy = false, rot = 0, mode = 'under', limit = 60, query = '';
  const hist = [];

  const stakeItems = () => S.inv.skins.filter((s) => sel.has(s.id));
  const balPart = () => { const v = parseFloat(String(balIn.value).replace(',', '.')); return isFinite(v) && v > 0 ? round2(Math.min(v, S.balance)) : 0; };
  const stake = () => round2(stakeItems().reduce((a, b) => a + b.price, 0) + balPart());
  const chance = () => (target && stake() > 0 ? Math.max(MINC, Math.min(MAXC, (stake() * EDGE) / target.price)) : 0);

  function paintArc() {
    const c = chance();
    const len = c * CIRC;
    arc.style.strokeDasharray = `${len}px ${CIRC}px`;
    arc.style.strokeDashoffset = mode === 'under' ? '0px' : `${len - CIRC}px`;
  }

  function refresh() {
    paintArc();
    const c = chance(), st = stake();
    gauge.classList.remove('res', 'win', 'lose');
    $('[data-ch]', root).textContent = target && st ? (c * 100).toFixed(2) + ' %' : '0 %';
    $('[data-mu]', root).textContent = target && st ? `×${(target.price / st).toFixed(2)}` : st ? 'Choisis une cible' : 'Choisis une mise';
    if (target && st) { slider.value = Math.round(c * 100); $('[data-sv]', root).textContent = Math.round(c * 100) + ' %'; }
    const items = stakeItems();
    const inS = $('[data-in]', root);
    if (items.length || balPart()) {
      const best = [...items].sort((a, b) => b.price - a.price)[0];
      inS.classList.add('filled');
      inS.style.setProperty('--rc', best ? RAR[ITEMS[best.k].r].color : '#00e701');
      $('[data-inv]', root).outerHTML = `<div data-inv style="display:contents">${items.length ? `<div class="stack">${items.slice(0, 4).map((it) => skinImg(it.k, 128)).join('')}</div>` : `<div class="stack" style="color:var(--green)">${icon('coins', 40)}</div>`}<div class="nm">${items.length ? `${items.length} skin${items.length > 1 ? 's' : ''}${balPart() ? ' + solde' : ''}` : 'Solde'}</div><div class="pv">${money(st)}</div></div>`;
    } else {
      inS.classList.remove('filled');
      $('[data-inv]', root).outerHTML = '<div data-inv class="hint">Sélectionne tes skins<br>et/ou du solde</div>';
    }
    const outS = $('[data-out]', root);
    if (target) {
      const it = ITEMS[target.k];
      outS.classList.add('filled'); outS.style.setProperty('--rc', RAR[it.r].color);
      $('[data-tgt]', root).outerHTML = `<div data-tgt style="display:contents">${skinImg(target.k, 256, 'big')}<div class="nm">${target.st ? '<span style="color:#cf6a32">ST </span>' : ''}${esc(it.w)} | ${esc(it.n)}</div><div class="pv">${money(target.price)} <span class="dim" style="font-size:10px">${target.wear}</span></div></div>`;
    } else {
      outS.classList.remove('filled');
      $('[data-tgt]', root).outerHTML = '<div data-tgt class="hint">Choisis une cible<br>ou règle la chance</div>';
    }
    const ok = !busy && target && st > 0 && target.price > st;
    goB.disabled = !ok;
    goB.innerHTML = target && st && target.price <= st ? 'La cible doit valoir plus que la mise' : `${icon('up', 18)} Améliorer${target && st ? ` · ${(c * 100).toFixed(1)} %` : ''}`;
    $('[data-hist]', root).innerHTML = hist.map((h) => `<span class="${h.w ? 'w' : 'l'}">${(h.c * 100).toFixed(0)} %</span>`).join('');
  }

  function pickByChance(c) {
    const s = stake();
    if (!s) return;
    const want = (s * EDGE) / c;
    let best = null;
    for (const t of TARGETS) if (t.price > s && (!best || Math.abs(t.price - want) < Math.abs(best.price - want))) best = t;
    if (best) target = { ...best };
  }

  function drawList() {
    $('[data-searchrow]', root).classList.toggle('hidden', tab !== 'tgt');
    const more = $('[data-more]', root);
    if (tab === 'inv') {
      const items = [...S.inv.skins].sort((a, b) => b.price - a.price);
      list.innerHTML = items.length ? items.slice(0, limit).map((it) => skinCard(it, { sel: sel.has(it.id) })).join('') : `<div class="empty" style="grid-column:span 2"><div class="e">${icon('bag', 34)}</div>Aucun skin. Ouvre des caisses ou mise uniquement du solde.</div>`;
      more.classList.toggle('hidden', items.length <= limit);
    } else {
      const min = stake();
      const q = query.trim().toLowerCase();
      const opts = TARGETS.filter((t) => t.price > min && (!q || `${ITEMS[t.k].w} ${ITEMS[t.k].n}`.toLowerCase().includes(q)));
      list.innerHTML = opts.slice(0, limit).map((t) => skinCard(t, { sel: target && target.k === t.k && target.wear === t.wear && target.st === t.st }).replace('class="skin', `data-t="${TARGETS.indexOf(t)}" class="skin`)).join('') || '<div class="empty" style="grid-column:span 2">Aucune cible.</div>';
      more.classList.toggle('hidden', opts.length <= limit);
    }
  }
  const tabs = segmented([{ v: 'inv', l: 'Mes skins' }, { v: 'tgt', l: 'Cibles' }], tab, (v) => { tab = v; limit = 60; drawList(); });
  $('[data-tabs]', root).append(tabs.el);
  const modeSeg = segmented([{ v: 'under', l: 'Sous' }, { v: 'over', l: 'Dessus' }], mode, (v) => { mode = v; paintArc(); }, 'sq');
  $('[data-mode]', root).append(modeSeg.el);
  $('[data-more]', root).onclick = () => { limit += 60; drawList(); };
  $('[data-q]', root).oninput = (e) => { query = e.target.value; limit = 60; drawList(); };

  list.onclick = (e) => {
    if (busy) return;
    const card = e.target.closest('.skin');
    if (!card) return;
    if (tab === 'inv' && card.dataset.id) {
      const id = card.dataset.id;
      if (sel.has(id)) sel.delete(id); else if (sel.size < 10) sel.add(id); else { sfx.error(); return; }
      if (target && target.price <= stake()) target = null;
      if (!target && stake()) pickByChance(+slider.value / 100);
      sfx.tick(1.2, 0.08);
    } else if (card.dataset.t) {
      target = { ...TARGETS[+card.dataset.t] };
      sfx.click();
    }
    drawList(); refresh();
  };
  let lastS = 0;
  slider.oninput = () => {
    $('[data-sv]', root).textContent = slider.value + ' %';
    if (Math.abs(slider.value - lastS) >= 2) { sfx.tick(0.8 + slider.value / 100, 0.05); lastS = +slider.value; }
    pickByChance(+slider.value / 100);
    refresh();
    if (tab === 'tgt') drawList();
  };
  $$('[data-m]', root).forEach((b) => (b.onclick = () => {
    const s = stake();
    if (!s) { sfx.error(); return; }
    pickByChance(Math.min(MAXC, EDGE / +b.dataset.m));
    sfx.click(); drawList(); refresh();
  }));
  $('[data-b]', root).onclick = () => { balIn.value = round2(S.balance * 0.1).toFixed(2); sfx.click(); if (!target) pickByChance(+slider.value / 100); refresh(); if (tab === 'tgt') drawList(); };
  balIn.oninput = () => refresh();
  balIn.onchange = () => { if (!target && stake()) pickByChance(+slider.value / 100); refresh(); if (tab === 'tgt') drawList(); };

  goB.onclick = async () => {
    if (busy || !target) return;
    const items = stakeItems(), cash = balPart(), st = stake(), c = chance();
    if (cash && !placeBet('upgrader', cash)) return;
    busy = true; refresh(); tabs.disable(true); modeSeg.disable(true); slider.disabled = true;
    removeItems('skins', items.map((i) => i.id));
    sel.clear();
    sfx.bet();
    const winF = (x) => (mode === 'under' ? x < c : x > 1 - c);
    let firstF = true;
    const f = lucky(() => (firstF ? ((firstF = false), fair.bet(1)[0]) : Math.random()), winF);
    const win = winF(f);
    // needle: several turns, then a slow crawl to the result (suspense near the edge)
    const land = f * 360;
    const from = rot, to = rot - (rot % 360) + 360 * 6 + land;
    const t0 = performance.now(), dur = 5200;
    let lastTick = Math.floor(rot / 9);
    await new Promise((res) => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 4.2);
        rot = from + (to - from) * e;
        needle.style.transform = `rotate(${rot}deg)`;
        const tk = Math.floor(rot / 9);
        if (tk !== lastTick) { lastTick = tk; sfx.spinTick(); }
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    gauge.classList.add('res', win ? 'win' : 'lose');
    hist.unshift({ w: win, c }); hist.length = Math.min(hist.length, 8);
    let wonItem = null;
    if (win) {
      wonItem = { ...makeItem(target.k, 0, target.st), wear: target.wear, float: +(target.float + (Math.random() - 0.5) * 0.02).toFixed(5), price: target.price, id: uid(), src: 'Upgrader' };
      addItems('skins', [wonItem]);
      settle('upgrader', st, wonItem.price, { noCredit: true });
      $('[data-resimg]', root).src = $('[data-out] img')?.src || '';
      $('[data-ch]', root).textContent = 'AMÉLIORÉ !';
      $('[data-mu]', root).textContent = `+${fmt(wonItem.price - st)}`;
      sfx.rarity(Math.max(2, ITEMS[target.k].r)); confetti({ n: 140 }); haptic(true);
      ach('upgrade_low', c < 0.1);
    } else {
      settle('upgrader', st, 0, { noCredit: true });
      $('[data-resimg]', root).src = $('[data-out] img')?.src || '';
      $('[data-ch]', root).textContent = 'RATÉ';
      $('[data-mu]', root).textContent = `-${fmt(st)}`;
      sfx.lose(); shake(gauge); haptic(true);
    }
    $('[data-hist]', root).innerHTML = hist.map((h) => `<span class="${h.w ? 'w' : 'l'}">${(h.c * 100).toFixed(0)} %</span>`).join('');
    await sleep(1800);
    busy = false; target = null; balIn.value = '0';
    tabs.disable(false); modeSeg.disable(false); slider.disabled = false;
    // chain: the won item becomes the next stake
    if (wonItem) { sel.add(wonItem.id); tab = 'inv'; tabs.set('inv'); pickByChance(+slider.value / 100); }
    drawList(); refresh();
  };

  drawList(); refresh();
}
