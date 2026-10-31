import { S, placeBet, settle, fair, addItems, removeItems, ach, uid, round2, canAfford } from '../store.js';
import { $, $$, el, css, money, fmt, sleep, confetti, haptic, shake, segmented, COIN } from '../ui.js';
import { sfx } from '../audio.js';
import { SKINS, WEARS, RAR, makeItem } from './data.js';
import { skinCard, weaponSVG } from './art.js';

const EDGE = 0.95, MAXC = 0.9;
const TARGETS = SKINS.flatMap((s) => ['FN', 'MW', 'FT'].map((w) => {
  const wear = WEARS.find((x) => x.k === w);
  return { sid: s.id, wear: w, float: w === 'FN' ? 0.03 : w === 'MW' ? 0.1 : 0.25, price: round2(Math.max(0.03, s.p * wear.mul)) };
})).sort((a, b) => a.price - b.price);

css('upgrader', `
.up-top { display: flex; flex-direction: column; align-items: center; padding: 14px 12px 6px; background: radial-gradient(circle at 50% 30%, #12345a, var(--bg) 70%); }
.up-gauge { position: relative; width: 230px; height: 230px; }
.up-gauge svg.ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.up-gauge .arrow { position: absolute; inset: 0; transition: none; }
.up-gauge .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.up-gauge .mid b { font-size: 34px; font-weight: 900; }
.up-gauge .mid span { font-size: 12px; color: var(--txt2); }
.up-gauge.win .mid b { color: var(--green); } .up-gauge.lose .mid b { color: var(--red); }
.up-slots { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; margin-top: 10px; }
.up-slot { background: var(--bg2); border-radius: 10px; padding: 8px; min-height: 120px; display: flex; flex-direction: column; gap: 6px; border: 2px dashed var(--line); }
.up-slot .t { font-size: 11px; color: var(--txt2); font-weight: 800; }
.up-slot .skin { background: transparent; padding: 0; }
.up-slot .skin::after { display: none; }
.up-mults { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.up-mults button { flex: 1 0 auto; height: 34px; padding: 0 10px; border-radius: 6px; background: var(--bg4); font-size: 12.5px; font-weight: 800; }
.up-list { max-height: 360px; overflow-y: auto; padding: 2px; }
`);

export function mount(root) {
  root.innerHTML = `<div>
    <div class="up-top">
      <div class="up-gauge"><svg class="ring" viewBox="0 0 230 230"><circle cx="115" cy="115" r="100" fill="none" stroke="#213743" stroke-width="18"/><circle data-arc cx="115" cy="115" r="100" fill="none" stroke="#00e701" stroke-width="18" stroke-dasharray="0 999" style="filter:drop-shadow(0 0 6px rgba(0,231,1,.6));transition:stroke-dasharray .4s"/></svg>
        <svg class="arrow" viewBox="0 0 230 230"><path d="M115 6 l10 22 h-20z" fill="#fff" stroke="#0f212e" stroke-width="2"/></svg>
        <div class="mid"><b data-ch>0 %</b><span data-mu>Choisis une mise et une cible</span></div></div>
      <div class="up-slots"><div class="up-slot" data-in><div class="t">TA MISE</div><div data-inv class="muted" style="font-size:12px">Sélectionne des skins ci-dessous et/ou ajoute du solde.</div></div><div class="up-slot" data-out><div class="t">CIBLE</div><div data-tgt class="muted" style="font-size:12px">Choisis un skin cible.</div></div></div>
    </div>
    <div class="controls" style="border-radius:12px 12px 0 0">
      <div><div class="label"><span>Ajouter du solde</span><span class="dim">optionnel</span></div><div class="field"><div class="in">${COIN}<input data-bal inputmode="decimal" value="0"></div><button class="fbtn" data-b="0.1">10 %</button><button class="fbtn" data-b="0.5">50 %</button></div></div>
      <button class="btn green full lg" data-go disabled>Améliorer</button>
      <div data-tabs></div>
      <div class="up-mults hidden" data-mults>${[1.5, 2, 3, 5, 10, 20, 50].map((m) => `<button data-m="${m}">×${m}</button>`).join('')}</div>
      <div class="up-list"><div class="grid2" data-list></div></div>
    </div></div>`;
  const arc = $('[data-arc]', root), arrow = $('.arrow', root), gauge = $('.up-gauge', root);
  const balIn = $('[data-bal]', root), goB = $('[data-go]', root), list = $('[data-list]', root);
  const sel = new Set();
  let target = null, tab = 'inv', busy = false, rot = 0;

  const stakeItems = () => S.inv.skins.filter((s) => sel.has(s.id));
  const balPart = () => { const v = parseFloat(String(balIn.value).replace(',', '.')); return isFinite(v) && v > 0 ? round2(Math.min(v, S.balance)) : 0; };
  const stake = () => round2(stakeItems().reduce((a, b) => a + b.price, 0) + balPart());
  const chance = () => (target && stake() > 0 ? Math.min(MAXC, (stake() * EDGE) / target.price) : 0);

  function refresh() {
    const c = chance();
    arc.setAttribute('stroke-dasharray', `${c * 2 * Math.PI * 100} 999`);
    $('[data-ch]', root).textContent = (c * 100).toFixed(2) + ' %';
    $('[data-mu]', root).textContent = target && stake() ? `×${(target.price / stake()).toFixed(2)} · mise ${fmt(stake())}` : 'Choisis une mise et une cible';
    const items = stakeItems();
    $('[data-inv]', root).innerHTML = items.length || balPart()
      ? `${items.slice(0, 2).map((it) => skinCard(it)).join('')}${items.length > 2 ? `<div class="dim" style="font-size:11px">+${items.length - 2} autres</div>` : ''}${balPart() ? `<div style="font-size:12px">+ ${money(balPart())}</div>` : ''}<div style="font-size:12px;margin-top:auto">Total : <b>${money(stake())}</b></div>`
      : 'Sélectionne des skins ci-dessous et/ou ajoute du solde.';
    $('[data-tgt]', root).innerHTML = target ? skinCard(target) : 'Choisis un skin cible.';
    goB.disabled = busy || !target || !stake() || target.price <= stake();
    goB.textContent = target && target.price <= stake() ? 'La cible doit valoir plus que la mise' : 'Améliorer';
  }

  function drawList() {
    $('[data-mults]', root).classList.toggle('hidden', tab !== 'tgt');
    if (tab === 'inv') {
      const items = [...S.inv.skins].sort((a, b) => b.price - a.price);
      list.innerHTML = items.length ? items.slice(0, 150).map((it) => skinCard(it, { sel: sel.has(it.id) })).join('') : '<div class="empty" style="grid-column:span 2"><div class="e">🎒</div>Aucun skin. Ouvre des caisses ou utilise uniquement du solde.</div>';
    } else {
      const min = stake();
      const opts = TARGETS.filter((t) => t.price > min).slice(0, 120);
      list.innerHTML = opts.map((t, i) => skinCard(t, { sel: target && target.sid === t.sid && target.wear === t.wear }).replace('class="skin', `data-t="${TARGETS.indexOf(t)}" class="skin`)).join('') || '<div class="empty" style="grid-column:span 2">Aucune cible plus chère.</div>';
    }
  }
  const tabs = segmented([{ v: 'inv', l: 'Mes skins' }, { v: 'tgt', l: 'Cibles' }], tab, (v) => { tab = v; drawList(); });
  $('[data-tabs]', root).append(tabs.el);

  list.onclick = (e) => {
    if (busy) return;
    const card = e.target.closest('.skin');
    if (!card) return;
    if (tab === 'inv' && card.dataset.id) {
      const id = card.dataset.id;
      sel.has(id) ? sel.delete(id) : sel.add(id);
      if (target && target.price <= stake()) target = null;
      sfx.tick(1.2, 0.08);
    } else if (card.dataset.t) {
      target = { ...TARGETS[+card.dataset.t] };
      sfx.click();
    }
    drawList(); refresh();
  };
  $$('[data-m]', root).forEach((b) => (b.onclick = () => {
    const s = stake();
    if (!s) { sfx.error(); return; }
    const want = s * +b.dataset.m;
    let best = null;
    for (const t of TARGETS) if (t.price > s && (!best || Math.abs(t.price - want) < Math.abs(best.price - want))) best = t;
    if (best) { target = { ...best }; sfx.click(); drawList(); refresh(); }
  }));
  $$('[data-b]', root).forEach((b) => (b.onclick = () => { balIn.value = round2(S.balance * +b.dataset.b).toFixed(2); sfx.click(); refresh(); if (tab === 'tgt') drawList(); }));
  balIn.oninput = () => { refresh(); };
  balIn.onchange = () => { if (tab === 'tgt') drawList(); };

  goB.onclick = async () => {
    if (busy || !target) return;
    const items = stakeItems(), cash = balPart(), st = stake(), c = chance();
    if (cash && !placeBet('upgrader', cash)) return;
    busy = true; refresh(); tabs.disable(true);
    removeItems('skins', items.map((i) => i.id));
    sel.clear();
    sfx.bet();
    gauge.classList.remove('win', 'lose');
    const f = fair.bet(1)[0];
    const win = f < c;
    const land = f * 360;
    const targetRot = rot - (rot % 360) + 360 * 5 + land;
    const t0 = performance.now(), from = rot, dur = 3600;
    let lastTick = 0;
    await new Promise((res) => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        rot = from + (targetRot - from) * e;
        arrow.style.transform = `rotate(${rot}deg)`;
        if (Math.floor(rot / 12) !== lastTick) { lastTick = Math.floor(rot / 12); sfx.spinTick(); }
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    if (win) {
      const it = { ...makeItem(target.sid, target.float, false), id: uid(), src: 'Upgrader' };
      addItems('skins', [it]);
      settle('upgrader', st, it.price, { noCredit: true });
      gauge.classList.add('win');
      $('[data-ch]', root).textContent = 'GAGNÉ !';
      sfx.rarity(Math.max(2, SKINS[target.sid].r)); confetti({ n: 140 }); haptic(true);
      ach('upgrade_low', c < 0.1);
    } else {
      settle('upgrader', st, 0, { noCredit: true });
      gauge.classList.add('lose');
      $('[data-ch]', root).textContent = 'PERDU';
      sfx.lose(); shake(gauge); haptic(true);
    }
    await sleep(1400);
    busy = false; target = null; balIn.value = '0'; tabs.disable(false);
    gauge.classList.remove('win', 'lose');
    drawList(); refresh();
  };

  drawList(); refresh();
}
