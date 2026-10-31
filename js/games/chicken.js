import { placeBet, settle, fair, ach } from '../store.js';
import { $, $$, el, css, gameLayout, betField, segmented, money, fmt, fmtX, sleep, resultPop, shake, haptic, confetti } from '../ui.js';
import { sfx } from '../audio.js';

const DIFF = {
  easy: { p: 1 / 25, lanes: 30, l: 'Facile' },
  med: { p: 3 / 25, lanes: 25, l: 'Moyen' },
  hard: { p: 5 / 25, lanes: 22, l: 'Difficile' },
  hc: { p: 10 / 25, lanes: 18, l: 'Extrême' },
};
const multAt = (d, k) => (k === 0 ? 1 : Math.floor((0.99 / Math.pow(1 - DIFF[d].p, k)) * 100) / 100);
const LANE = 76;

const CHICK = `<svg viewBox="0 0 80 90" class="chk"><ellipse cx="40" cy="84" rx="20" ry="5" fill="rgba(0,0,0,.35)"/><path d="M32 70 l-3 12 M48 70 l3 12" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/><ellipse cx="40" cy="50" rx="26" ry="24" fill="#fff"/><path d="M18 52 q-12 2 -10 -10 q8 4 12 4z" fill="#e5e7eb"/><circle cx="46" cy="22" r="15" fill="#fff"/><path d="M38 8 q4-9 8-2 q4-9 8-1 q5-5 5 4z" fill="#ef4444"/><path d="M58 21 l11 4 -11 4z" fill="#f59e0b"/><circle cx="51" cy="18" r="3" fill="#111"/><circle cx="52" cy="17" r="1" fill="#fff"/><path d="M57 31 q2 7 -4 7 q-3-4 4-7z" fill="#ef4444"/><ellipse cx="30" cy="54" rx="10" ry="7" fill="#f3f4f6"/></svg>`;
const carSVG = (col, dir) => `<svg viewBox="0 0 96 48" style="transform:scaleX(${dir})"><rect x="4" y="6" width="88" height="38" rx="12" fill="rgba(0,0,0,.35)" transform="translate(0 4)"/><rect x="4" y="4" width="88" height="38" rx="12" fill="${col}"/><rect x="52" y="8" width="22" height="30" rx="5" fill="#1e293b"/><rect x="18" y="9" width="16" height="28" rx="4" fill="#1e293b" opacity=".85"/><rect x="36" y="9" width="14" height="28" rx="3" fill="rgba(255,255,255,.18)"/><rect x="86" y="8" width="5" height="8" rx="2" fill="#fde047"/><rect x="86" y="30" width="5" height="8" rx="2" fill="#fde047"/><rect x="4" y="9" width="4" height="7" rx="1" fill="#ef4444"/><rect x="4" y="30" width="4" height="7" rx="1" fill="#ef4444"/></svg>`;
const CAR_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#e5e7eb', '#f97316', '#06b6d4'];

css('chicken', `
.ck-view { flex: 1; position: relative; overflow: hidden; background: #2a2d36; min-height: 360px; }
.ck-world { position: absolute; left: 0; right: 0; bottom: 0; transition: transform .45s cubic-bezier(.3,.9,.3,1); }
.ck-lane { position: absolute; left: 0; right: 0; height: ${LANE}px; background: #33363f; }
.ck-lane::after { content: ''; position: absolute; left: 0; right: 0; top: -2px; height: 4px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 24px, transparent 24px 46px); }
.ck-lane.side { background: repeating-linear-gradient(90deg, #6b7280 0 38px, #5b616c 38px 40px); }
.ck-lane.side::after { display: none; }
.ck-lane.finish { background: repeating-conic-gradient(#fff 0 25%, #111 0 50%) 0 0/24px 24px; opacity: .9; }
.ck-lane.finish::after { display: none; }
.ck-badge { position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; background: radial-gradient(circle, #4b5563, #374151); border: 3px solid #6b7280; display: grid; place-items: center; font-weight: 900; font-size: 13px; color: #fff; box-shadow: inset 0 0 0 4px rgba(0,0,0,.25); transition: all .3s; }
.ck-badge.passed { background: radial-gradient(circle, #fbbf24, #d97706); border-color: #fde047; color: #3a2400; box-shadow: 0 0 18px rgba(251,191,36,.6); }
.ck-badge.next { border-color: var(--green); box-shadow: 0 0 0 3px rgba(0,231,1,.25); animation: ckPulse 1.2s infinite; }
@keyframes ckPulse { 50% { box-shadow: 0 0 0 9px rgba(0,231,1,0); } }
.ck-barrier { position: absolute; left: 6px; right: 6px; top: 6px; height: 10px; border-radius: 3px; background: repeating-linear-gradient(90deg, #ef4444 0 14px, #fff 14px 28px); box-shadow: 0 3px 0 rgba(0,0,0,.3); transform: scaleX(0); transform-origin: left; transition: transform .35s cubic-bezier(.3,1.4,.5,1); }
.ck-lane.safe .ck-barrier { transform: scaleX(1); }
.ck-car { position: absolute; top: 14px; width: 96px; height: 48px; will-change: transform; }
.ck-chicken { position: absolute; left: 50%; width: 64px; height: 72px; margin-left: -32px; transition: bottom .32s cubic-bezier(.3,1.3,.5,1); z-index: 5; }
.ck-chicken .chk { width: 100%; height: 100%; }
.ck-chicken.hop .chk { animation: hop .32s ease-out; }
@keyframes hop { 40% { transform: translateY(-22px) scale(1.05, .95); } }
.ck-chicken.dead .chk { animation: dead .6s forwards; }
@keyframes dead { to { transform: rotate(90deg) scale(.9, .5) translateX(10px); opacity: .7; filter: grayscale(.4); } }
.ck-feather { position: absolute; width: 10px; height: 6px; border-radius: 50%; background: #fff; z-index: 6; animation: feather 1s ease-out forwards; }
@keyframes feather { to { transform: translate(var(--dx), var(--dy)) rotate(260deg); opacity: 0; } }
.ck-top { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; justify-content: space-between; z-index: 8; pointer-events: none; }
.ck-top .chip { background: rgba(15,33,46,.85); font-size: 12px; padding: 5px 10px; }
`);

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'chicken' });
  const pop = resultPop(stage);
  const view = el('<div class="ck-view"><div class="ck-top"><span class="chip" data-mult>×1.00</span><span class="chip" data-step>Voie 0</span></div><div class="ck-world"></div></div>');
  stage.append(view);
  const world = $('.ck-world', view);
  let diff = 'med', game = null, cars = [], raf, lastSpawn = {};

  function build() {
    const D = DIFF[diff];
    const n = D.lanes;
    world.innerHTML = '';
    world.style.height = (n + 2) * LANE + 'px';
    for (let i = 0; i <= n + 1; i++) {
      const lane = el(`<div class="ck-lane ${i === 0 ? 'side' : i === n + 1 ? 'finish' : ''}" data-i="${i}" style="bottom:${i * LANE}px">${i > 0 && i <= n ? `<div class="ck-barrier"></div><div class="ck-badge">${fmtX(multAt(diff, i))}</div>` : ''}</div>`);
      world.append(lane);
    }
    const ch = el(`<div class="ck-chicken" style="bottom:${2}px">${CHICK}</div>`);
    world.append(ch);
    cars.forEach((c) => c.el.remove()); cars = [];
    setCam(0, false);
    paintBadges(0);
  }
  const chickenEl = () => $('.ck-chicken', world);
  const laneEl = (i) => $(`.ck-lane[data-i="${i}"]`, world);

  function setCam(i, anim = true) {
    const vh = view.clientHeight || 360;
    const y = Math.max(0, i * LANE - vh * 0.32);
    world.style.transition = anim ? '' : 'none';
    world.style.transform = `translateY(${y}px)`;
  }
  function paintBadges(cur) {
    $$('.ck-badge', world).forEach((b) => {
      const i = +b.parentElement.dataset.i;
      b.classList.toggle('passed', i <= cur && cur > 0);
      b.classList.toggle('next', !!game && i === cur + 1);
    });
    $('[data-mult]', view).textContent = '×' + multAt(diff, cur).toFixed(2);
    $('[data-step]', view).textContent = `Voie ${cur}/${DIFF[diff].lanes}`;
  }

  // ambient traffic
  function trafficLoop(t) {
    const n = DIFF[diff].lanes;
    const cur = game ? game.k : -1;
    const vh = view.clientHeight;
    const camY = -(parseFloat(world.style.transform.replace(/[^\d.-]/g, '')) || 0);
    for (let i = 1; i <= n; i++) {
      const laneBottom = i * LANE;
      if (laneBottom < -camY - LANE || laneBottom > -camY + vh + LANE) continue;
      if (game && i <= cur) continue;
      if (i === (game?.deathLane ?? -1)) continue;
      if (!lastSpawn[i] || t - lastSpawn[i] > 1400 + ((i * 937) % 1600)) {
        if (Math.random() < 0.02) {
          lastSpawn[i] = t;
          const dir = i % 2 ? 1 : -1;
          const c = el(`<div class="ck-car">${carSVG(CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0], dir)}</div>`);
          laneEl(i).append(c);
          cars.push({ el: c, lane: i, dir, x: dir > 0 ? -110 : view.clientWidth + 10, v: (2.4 + Math.random() * 2.6) * dir });
        }
      }
    }
    for (let k = cars.length - 1; k >= 0; k--) {
      const c = cars[k];
      // lanes already crossed are closed by a barrier: their traffic vanishes
      const blocked = game && c.lane <= game.k && !c.killer;
      if (blocked) {
        c.el.style.transition = 'opacity .25s'; c.el.style.opacity = '0';
        setTimeout(() => c.el.remove(), 260);
        cars.splice(k, 1);
        continue;
      }
      c.x += c.v;
      c.el.style.transform = `translateX(${c.x}px)`;
      if (c.x > view.clientWidth + 120 || c.x < -140) { c.el.remove(); cars.splice(k, 1); }
    }
    raf = requestAnimationFrame(trafficLoop);
  }

  // controls
  const bet = betField('chicken');
  const diffSeg = segmented(Object.entries(DIFF).map(([v, d]) => ({ v, l: d.l })), diff, (v) => { diff = v; build(); }, 'sq');
  const diffW = el('<div><div class="label"><span>Difficulté</span><span class="dim" data-risk></span></div></div>'); diffW.append(diffSeg.el);
  const row = el('<div class="ctl-row hidden"><button class="btn green lg" data-go>Avancer</button><button class="btn orange lg" data-cash>Encaisser</button></div>');
  const btn = el('<button class="btn green full lg">Parier</button>');
  controls.append(bet.el, diffW, row, btn);
  const goB = $('[data-go]', row), cashB = $('[data-cash]', row);
  const updRisk = () => { $('[data-risk]', diffW).textContent = `Risque par voie : ${(DIFF[diff].p * 100).toFixed(0)} % · max ${fmtX(multAt(diff, DIFF[diff].lanes))}`; };
  diffSeg.el.addEventListener('click', updRisk); updRisk();

  function refreshBtns() {
    if (!game) { row.classList.add('hidden'); btn.classList.remove('hidden'); return; }
    row.classList.remove('hidden'); btn.classList.add('hidden');
    const m = multAt(diff, game.k);
    cashB.disabled = game.k === 0 || game.busy;
    goB.disabled = game.busy;
    cashB.textContent = game.k ? `Encaisser ${fmt(game.amount * m)}` : 'Encaisser';
  }

  btn.onclick = () => {
    const amount = bet.value;
    if (!placeBet('chicken', amount)) return;
    sfx.bet(); sfx.cluck(); pop.hide();
    build();
    const D = DIFF[diff];
    const fl = fair.bet(D.lanes);
    const deathLane = fl.findIndex((f) => f < D.p);
    game = { amount, k: 0, death: deathLane === -1 ? Infinity : deathLane + 1, busy: false };
    bet.disable(true); diffSeg.disable(true);
    paintBadges(0); refreshBtns();
  };

  goB.onclick = async () => {
    if (!game || game.busy) return;
    game.busy = true; refreshBtns();
    const next = game.k + 1;
    const ch = chickenEl();
    ch.classList.remove('hop'); void ch.offsetWidth; ch.classList.add('hop');
    ch.style.bottom = next * LANE + 2 + 'px';
    sfx.cluck(); haptic();
    setCam(next);
    await sleep(330);
    if (next === game.death) {
      // a car comes and runs the chicken over
      game.deathLane = next;
      const dir = next % 2 ? 1 : -1;
      const c = el(`<div class="ck-car" style="z-index:7">${carSVG('#ef4444', dir)}</div>`);
      laneEl(next).append(c);
      const car = { el: c, lane: next, dir, x: dir > 0 ? -110 : view.clientWidth + 10, v: 16 * dir, killer: true };
      cars.push(car);
      sfx.horn();
      await sleep(Math.abs((view.clientWidth / 2) / 16) * 16);
      ch.classList.add('dead');
      sfx.splat(); shake(stage); haptic(true);
      for (let i = 0; i < 14; i++) {
        const f = el(`<div class="ck-feather" style="left:calc(50% - 5px);bottom:${next * LANE + 30}px;--dx:${(Math.random() - 0.5) * 160}px;--dy:${-Math.random() * 120}px"></div>`);
        world.append(f); setTimeout(() => f.remove(), 1000);
      }
      settle('chicken', game.amount, 0, { mult: 0 });
      game = null;
      bet.disable(false); diffSeg.disable(false);
      paintBadges(next - 1);
      refreshBtns();
      return;
    }
    game.k = next;
    laneEl(next).classList.add('safe');
    sfx.gem(next);
    game.busy = false;
    paintBadges(next);
    refreshBtns();
    if (next === DIFF[diff].lanes) { ach('chicken', true); confetti({ n: 150 }); cashout(); }
  };

  function cashout() {
    if (!game || !game.k) return;
    const m = multAt(diff, game.k);
    settle('chicken', game.amount, game.amount * m, { mult: m });
    pop.show(m, game.amount * m);
    sfx.cashout();
    game = null;
    bet.disable(false); diffSeg.disable(false);
    refreshBtns();
  }
  cashB.onclick = cashout;

  build();
  requestAnimationFrame(() => setCam(0, false));
  raf = requestAnimationFrame(trafficLoop);
  return () => {
    cancelAnimationFrame(raf);
    if (game) { if (game.k) cashout(); else settle('chicken', game.amount, game.amount, { mult: 1, noBig: true }); }
  };
}
