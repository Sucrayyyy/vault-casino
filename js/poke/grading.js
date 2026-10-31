import { S, placeBet, settle, fair, ach, round2, save, bus } from '../store.js';
import { $, $$, css, money, fmt, sleep, confetti, haptic, esc } from '../ui.js';
import { sfx } from '../audio.js';
import { icon } from '../icons.js';
import { weighted } from '../rng.js';
import { loadSet, loadedSet } from './data.js';
import { cardHTML, priceRow, tilt } from './card.js';
import { gradeMul } from './lobby.js';
import { go } from '../main.js';

const GRADES = [
  { g: 10, w: 6, l: 'GEM MINT' }, { g: 9, w: 24, l: 'MINT' }, { g: 8, w: 32, l: 'NM-MT' }, { g: 7, w: 18, l: 'NEAR MINT' },
  { g: 6, w: 10, l: 'EX-MT' }, { g: 5, w: 6, l: 'EXCELLENT' }, { g: 4, w: 3, l: 'VG-EX' }, { g: 3, w: 1, l: 'VERY GOOD' },
];
const fee = (v) => round2(Math.max(5, v * 0.2));

css('grading', `
.gr-stage { display: flex; flex-direction: column; align-items: center; padding: 18px 12px 10px; background: radial-gradient(circle at 50% 30%, #3a2a05, var(--bg) 70%); min-height: 380px; position: relative; }
.slab { position: relative; padding: 46px 12px 14px; border-radius: 10px; background: linear-gradient(160deg, rgba(255,255,255,.3), rgba(255,255,255,.1)); border: 2px solid rgba(255,255,255,.5); box-shadow: 0 16px 40px rgba(0,0,0,.6); }
.slab .lbl { position: absolute; top: 8px; left: 10px; right: 10px; height: 32px; border-radius: 4px; background: linear-gradient(180deg, #fff, #e5e7eb); border: 2px solid #dc2626; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; color: #111; font-size: 9px; font-weight: 900; }
.slab .lbl .g { font-size: 20px; color: #dc2626; }
.slab .scan { position: absolute; left: 0; right: 0; height: 4px; background: #00e701; box-shadow: 0 0 18px #00e701; top: 46px; animation: scan 1s ease-in-out infinite alternate; }
@keyframes scan { to { top: calc(100% - 18px); } }
.gr-res { font-size: 46px; font-weight: 900; margin-top: 10px; animation: popIn .5s cubic-bezier(.3,1.7,.5,1); }
.gr-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.gr-list > div { min-width: 0; border-radius: 8px; padding: 4px; }
.gr-list > div.on { outline: 2px solid var(--green); background: rgba(0,231,1,.08); }
.gr-list .tc { width: 100%; }
`);

export async function mount(root, { args }) {
  let selId = args[0] || null, busy = false;
  const eligibleAll = () => S.inv.cards.filter((c) => c.kind === 'card' && !c.grade && c.price >= 0.5).sort((a, b) => b.price - a.price);
  await Promise.all([...new Set(eligibleAll().slice(0, 60).map((c) => c.set))].map((id) => loadSet(id)));
  const one = S.inv.cards.find((c) => c.id === selId);
  if (one) await loadSet(one.set);

  function draw() {
    const eligible = eligibleAll().slice(0, 60);
    const sel = S.inv.cards.find((c) => c.id === selId);
    const set = sel && loadedSet(sel.set), card = sel && set?.byLid[sel.lid];
    const w = Math.min(200, innerWidth * 0.52);
    const lw = Math.floor((Math.min(innerWidth, 560) - 60) / 3);
    root.innerHTML = `<div>
      <div class="gr-stage">
        ${card ? `<div class="slab" data-slab>${sel.grade ? `<div class="lbl"><span>VGS · ${esc(card.name.toUpperCase())}<br>${GRADES.find((x) => x.g === sel.grade).l}</span><span class="g">${sel.grade}</span></div>` : '<div class="lbl"><span>VAULT GRADING SERVICE</span><span class="g">?</span></div>'}${cardHTML(set, card, { rev: sel.rev, first: sel.first, w, q: 'high', cls: 'big' })}</div>
          <div style="margin-top:12px;text-align:center"><b>${esc(card.name)}</b><div class="muted" style="font-size:12px">${esc(set.name)} · ${esc(card.rar)}</div><div style="margin-top:4px">Valeur : <b>${money(sel.price)}</b></div></div>`
        : `<div class="empty" style="padding-top:60px"><div class="e">${icon('search', 36)}</div>Choisis une carte de ta collection à faire grader.<br><small>Une note de 10 multiplie la valeur jusqu’à ×5,6 !</small></div>`}
      </div>
      <div class="controls">
        ${card && !sel.grade ? `<div class="panel-2" style="font-size:12px;line-height:1.7"><div class="row" style="justify-content:space-between"><span class="muted">Frais de gradation</span><b>${money(fee(sel.price))}</b></div><div class="row" style="justify-content:space-between"><span class="muted">Note 10 (6 %)</span><b class="green">${money(sel.price * gradeMul(10, card))}</b></div><div class="row" style="justify-content:space-between"><span class="muted">Note 9 (24 %)</span><b>${money(sel.price * gradeMul(9, card))}</b></div><div class="row" style="justify-content:space-between"><span class="muted">Note 7 (18 %)</span><b class="red">${money(sel.price * gradeMul(7, card))}</b></div></div>
          <button class="btn gold full lg" data-go>Envoyer en gradation · ${money(fee(sel.price))}</button>` : ''}
        ${sel?.grade ? '<button class="btn full" data-again>Grader une autre carte</button><button class="btn ghost full" data-col>Voir ma collection</button>' : ''}
        ${!sel?.grade ? `<div class="label" style="margin-top:4px"><span>Tes cartes éligibles (${eligible.length})</span></div>
          ${eligible.length ? `<div class="gr-list">${eligible.map((c) => { const s = loadedSet(c.set); const cd = s?.byLid[c.lid]; return cd ? `<div data-id="${c.id}" class="${c.id === selId ? 'on' : ''}">${cardHTML(s, cd, { rev: c.rev, first: c.first, w: lw })}${priceRow(c.price, cd)}</div>` : ''; }).join('')}</div>` : '<div class="empty">Aucune carte d’une valeur ≥ 0,50. Ouvre des boosters !</div>'}` : ''}
      </div></div>`;
    if (card) tilt($('.tc', root));
    $$('[data-id]', root).forEach((n) => (n.onclick = async () => { if (busy) return; sfx.click(); selId = n.dataset.id; draw(); document.querySelector('#view').scrollTop = 0; }));
    $('[data-again]', root)?.addEventListener('click', () => { selId = null; draw(); });
    $('[data-col]', root)?.addEventListener('click', () => go('poke'));
    $('[data-go]', root)?.addEventListener('click', async () => {
      if (busy) return;
      const f = fee(sel.price);
      if (!placeBet('grading', f)) return;
      busy = true; sfx.bet();
      $('[data-go]', root).disabled = true;
      $('[data-slab]', root).insertAdjacentHTML('beforeend', '<div class="scan"></div>');
      const before = sel.price;
      const gr = weighted(GRADES, fair.bet(1)[0]);
      sel.grade = gr.g;
      sel.price = round2(sel.price * gradeMul(gr.g, card));
      save(); bus.emit('inv', 'cards');
      for (let i = 0; i < 8; i++) { await sleep(280); sfx.tick(1 + i * 0.1, 0.08); }
      settle('grading', f, sel.price - before + f, { noCredit: true, noBig: true });
      ach('psa10', gr.g === 10);
      if (gr.g >= 9) { sfx.rarity(gr.g === 10 ? 4 : 3); confetti({ n: gr.g === 10 ? 180 : 90, colors: ['#ffd66b', '#fff', '#dc2626'] }); haptic(true); }
      else if (gr.g >= 8) sfx.smallWin(); else sfx.lose();
      busy = false;
      draw();
      $('.gr-stage', root).insertAdjacentHTML('beforeend', `<div class="gr-res" style="color:${gr.g >= 9 ? 'var(--green)' : gr.g >= 8 ? '#fff' : 'var(--red)'}">${gr.g}/10</div><div class="${sel.price >= before ? 'green' : 'red'}" style="font-weight:800">${sel.price >= before ? '+' : ''}${fmt(sel.price - before)} de valeur</div>`);
    });
  }
  draw();
}
