import { placeBet, settle, fair, ach, round2, lucky } from '../store.js';
import { $, el, css, gameLayout, betField, money, fmt, fitCanvas, shake, haptic, clamp, esc } from '../ui.js';
import { crashPoint } from '../rng.js';
import { sfx, engine } from '../audio.js';
import { randomBot, avatar } from '../bots.js';

css('crash', `
.crash-cv { flex: 1; width: 100%; min-height: 290px; display: block; }
.crash-hist { display: flex; gap: 6px; padding: 10px 10px 0; overflow: hidden; }
.crash-hist span { flex: none; font-size: 11.5px; font-weight: 800; padding: 4px 8px; border-radius: 99px; background: var(--bg4); }
.crash-hist span.g { color: var(--green); } .crash-hist span.p { color: #c084fc; } .crash-hist span.r { color: var(--txt2); }
.crash-players { background: var(--bg2); border-radius: 8px; padding: 8px; max-height: 210px; overflow: auto; }
.crash-players .pr { display: flex; align-items: center; gap: 8px; padding: 5px 4px; font-size: 12px; border-radius: 4px; }
.crash-players .pr.out { background: rgba(0,231,1,.08); }
.crash-players .pr.out .m { color: var(--green); }
.crash-players .pr.lost { opacity: .45; }
.crash-players .pr.me { outline: 1px solid var(--green); }
.crash-players .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crash-players .m { width: 54px; text-align: right; font-weight: 800; color: var(--txt3); }
`);

const RATE = 0.085; // m(t) = e^(RATE·t)
const multAt = (t) => Math.exp(RATE * t);
const timeFor = (m) => Math.log(m) / RATE;

export function mount(root) {
  const { stage, controls } = gameLayout(root, { id: 'crash' });
  const histEl = el('<div class="crash-hist"></div>');
  const cv = el('<canvas class="crash-cv"></canvas>');
  stage.append(histEl, cv);
  let G, W, H;
  const ro = new ResizeObserver(() => ({ g: G, w: W, h: H } = fitCanvas(cv)));
  ro.observe(cv);
  ({ g: G, w: W, h: H } = fitCanvas(cv));

  // ---------- controls ----------
  const bet = betField('crash');
  const autoCo = el(`<div><div class="label"><span>Encaissement auto</span><span class="dim">0 = désactivé</span></div><div class="field"><div class="in"><input inputmode="decimal" value="2.00"></div><span class="fbtn" style="display:grid;place-items:center;min-width:28px">×</span></div></div>`);
  const btn = el('<button class="btn green full lg">Parier</button>');
  const players = el('<div><div class="label"><span>Joueurs</span><span data-tot></span></div><div class="crash-players"></div></div>');
  controls.append(bet.el, autoCo, btn, players);
  const autoIn = $('input', autoCo);
  const plist = $('.crash-players', players);

  // ---------- round state ----------
  let phase = 'wait', t0 = 0, crashAt = 2, myBet = null, queued = false, eng = null, raf, timer, history = [];
  let bots = [];
  const stars = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.5 + 0.3 }));
  let explodeT = 0;

  const autoTarget = () => { const v = parseFloat(autoIn.value.replace(',', '.')); return v >= 1.01 ? v : 0; };

  function renderPlayers() {
    const rows = [...(myBet ? [{ name: 'Toi', bet: myBet.amount, out: myBet.out, me: true }] : []), ...bots];
    $('[data-tot]', players).innerHTML = `${rows.length} · ${money(rows.reduce((s, r) => s + r.bet, 0))}`;
    plist.innerHTML = rows.map((r) => `<div class="pr ${r.out ? 'out' : phase === 'crashed' ? 'lost' : ''} ${r.me ? 'me' : ''}">${avatar(r.name, 20)}<span class="nm">${esc(r.name)}</span>${money(r.out ? r.bet * r.out : r.bet)}<span class="m">${r.out ? r.out.toFixed(2) + '×' : '—'}</span></div>`).join('');
  }

  function updateBtn() {
    if (phase === 'fly' && myBet && !myBet.out) {
      const m = multAt((performance.now() - t0) / 1000);
      btn.className = 'btn orange full lg';
      btn.innerHTML = `Encaisser ${fmt(myBet.amount * m)}`;
      btn.disabled = false;
    } else if (phase === 'wait') {
      btn.className = 'btn green full lg';
      btn.textContent = myBet ? 'Pari placé ✓ (annuler)' : 'Parier';
      btn.disabled = false;
    } else {
      btn.className = 'btn green full lg';
      btn.textContent = queued ? 'Pari pour le prochain tour ✓' : 'Parier (prochain tour)';
      btn.disabled = false;
    }
  }

  function newRound() {
    phase = 'wait';
    t0 = performance.now() + 5000;
    bots = Array.from({ length: 6 + Math.floor(Math.random() * 9) }, () => {
      const r = Math.random();
      const b = r < 0.6 ? Math.random() * 30 + 1 : r < 0.9 ? Math.random() * 400 + 30 : Math.random() * 6000 + 400;
      return { name: randomBot(), bet: round2(b), target: Math.max(1.05, crashPoint(Math.random()) * (0.6 + Math.random() * 0.3)), out: 0 };
    });
    if (queued) { queued = false; tryBet(); }
    renderPlayers();
    updateBtn();
    timer = setTimeout(startFlight, 5000);
  }

  function tryBet() {
    const amount = bet.value;
    if (!placeBet('crash', amount)) return false;
    sfx.bet();
    myBet = { amount, out: 0, auto: autoTarget() };
    bet.disable(true);
    renderPlayers();
    return true;
  }

  function startFlight() {
    if (myBet) crashAt = lucky(() => crashPoint(fair.bet(1)[0]), (c) => c >= Math.max(myBet.auto || 0, 2));
    else crashAt = crashPoint(Math.random());
    phase = 'fly';
    t0 = performance.now();
    eng = engine();
    sfx.whoosh(0.8);
    updateBtn();
  }

  function cashOut(m) {
    if (!myBet || myBet.out) return;
    myBet.out = Math.floor(m * 100) / 100;
    settle('crash', myBet.amount, myBet.amount * myBet.out, { mult: myBet.out });
    ach('jet_100', myBet.out >= 100);
    sfx.cashout(); haptic();
    renderPlayers(); updateBtn();
  }

  function crash() {
    phase = 'crashed';
    explodeT = performance.now();
    eng?.stop(); eng = null;
    sfx.explode(); shake(stage); haptic(true);
    if (myBet && !myBet.out) settle('crash', myBet.amount, 0, { mult: 0 });
    history.unshift(crashAt);
    history = history.slice(0, 12);
    histEl.innerHTML = history.map((h) => `<span class="${h >= 10 ? 'p' : h >= 2 ? 'g' : 'r'}">${h.toFixed(2)}×</span>`).join('');
    renderPlayers();
    myBet = null;
    bet.disable(false);
    updateBtn();
    timer = setTimeout(newRound, 3000);
  }

  btn.onclick = () => {
    if (phase === 'fly' && myBet && !myBet.out) { cashOut(multAt((performance.now() - t0) / 1000)); return; }
    if (phase === 'wait') {
      if (myBet) { // cancel
        settle('crash', myBet.amount, myBet.amount, { mult: 1, noBig: true });
        myBet = null; bet.disable(false); sfx.click(); renderPlayers(); updateBtn(); return;
      }
      tryBet(); updateBtn(); return;
    }
    queued = !queued; sfx.click(); updateBtn();
  };

  // ---------- drawing ----------
  function drawPlane(x, y, ang, s = 1) {
    G.save(); G.translate(x, y); G.rotate(ang); G.scale(s, s);
    G.fillStyle = '#e11d48';
    G.beginPath(); G.moveTo(-24, 0); G.quadraticCurveTo(-22, -7, 0, -7); G.lineTo(24, -3); G.quadraticCurveTo(31, 0, 24, 3); G.lineTo(0, 7); G.quadraticCurveTo(-22, 7, -24, 0); G.fill();
    G.fillStyle = '#be123c';
    G.beginPath(); G.moveTo(-4, -5); G.lineTo(-14, -24); G.lineTo(-5, -24); G.lineTo(9, -5); G.fill();
    G.beginPath(); G.moveTo(-4, 5); G.lineTo(-12, 20); G.lineTo(-4, 20); G.lineTo(8, 5); G.fill();
    G.beginPath(); G.moveTo(-20, -2); G.lineTo(-29, -14); G.lineTo(-23, -14); G.lineTo(-15, -3); G.fill();
    G.fillStyle = '#93c5fd'; G.beginPath(); G.ellipse(15, -2, 5, 2.6, 0, 0, 7); G.fill();
    G.fillStyle = 'rgba(255,255,255,.35)'; G.fillRect(-16, -5, 26, 2);
    // propeller blur
    G.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.3})`;
    G.beginPath(); G.ellipse(27, 0, 2, 11, 0, 0, 7); G.fill();
    G.restore();
  }

  function frame(now) {
    if (!W) { raf = requestAnimationFrame(frame); return; }
    G.clearRect(0, 0, W, H);
    const pad = { l: 38, b: 26, t: 18, r: 18 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    let t = 0, m = 1;
    if (phase === 'fly') {
      t = (now - t0) / 1000; m = multAt(t);
      if (m >= crashAt) { m = crashAt; t = timeFor(crashAt); crash(); }
      else {
        eng?.set(m);
        for (const b of bots) if (!b.out && m >= b.target) { b.out = Math.floor(b.target * 100) / 100; renderPlayers(); }
        if (myBet && !myBet.out && myBet.auto && m >= myBet.auto) cashOut(myBet.auto);
        if (myBet && !myBet.out) updateBtn();
      }
    } else if (phase === 'crashed') { m = crashAt; t = timeFor(crashAt); }

    // background stars drifting
    const speed = phase === 'fly' ? 0.05 + Math.min(0.4, m / 40) : 0.01;
    G.fillStyle = '#fff';
    for (const s of stars) {
      s.x -= speed * s.s * 0.01; if (s.x < 0) s.x += 1;
      G.globalAlpha = 0.25 * s.s; G.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    G.globalAlpha = 1;

    const maxT = Math.max(10, t * 1.25), maxM = Math.max(2, 1 + (m - 1) * 1.25);
    const X = (tt) => pad.l + (tt / maxT) * pw;
    const Y = (mm) => pad.t + ph - ((mm - 1) / (maxM - 1)) * ph;
    // axes
    G.strokeStyle = 'rgba(255,255,255,.07)'; G.lineWidth = 1; G.fillStyle = '#6f839b'; G.font = '600 10px Inter'; G.textAlign = 'right'; G.textBaseline = 'middle';
    const stepM = niceStep((maxM - 1) / 4);
    for (let v = 1; v <= maxM; v += stepM) { const y = Y(v); G.beginPath(); G.moveTo(pad.l, y); G.lineTo(W - pad.r, y); G.stroke(); G.fillText(v.toFixed(v < 10 ? 1 : 0) + '×', pad.l - 6, y); }
    G.textAlign = 'center'; G.textBaseline = 'top';
    const stepT = niceStep(maxT / 5);
    for (let v = 0; v <= maxT; v += stepT) G.fillText(Math.round(v) + 's', X(v), H - pad.b + 8);

    if (phase !== 'wait') {
      // curve
      const pts = [];
      const N = 60;
      for (let i = 0; i <= N; i++) { const tt = (t * i) / N; pts.push([X(tt), Y(multAt(tt))]); }
      const grad = G.createLinearGradient(0, pad.t, 0, H - pad.b);
      const col = phase === 'crashed' ? '237,65,99' : '0,231,1';
      grad.addColorStop(0, `rgba(${col},.35)`); grad.addColorStop(1, `rgba(${col},0)`);
      G.beginPath(); G.moveTo(pts[0][0], H - pad.b);
      pts.forEach(([x, y]) => G.lineTo(x, y));
      G.lineTo(pts[N][0], H - pad.b); G.closePath(); G.fillStyle = grad; G.fill();
      G.beginPath(); pts.forEach(([x, y], i) => (i ? G.lineTo(x, y) : G.moveTo(x, y)));
      G.strokeStyle = `rgb(${col})`; G.lineWidth = 4; G.lineCap = 'round'; G.shadowColor = `rgba(${col},.8)`; G.shadowBlur = 12; G.stroke(); G.shadowBlur = 0;
      const [hx, hy] = pts[N], [px, py] = pts[N - 3];
      const ang = Math.atan2(hy - py, hx - px);
      if (phase === 'fly') drawPlane(hx, hy - 4, ang, 1.1);
      else {
        const k = Math.min(1, (now - explodeT) / 700);
        for (let i = 0; i < 3; i++) {
          G.fillStyle = ['rgba(255,200,0,', 'rgba(255,100,0,', 'rgba(255,40,60,'][i] + (1 - k) * 0.8 + ')';
          G.beginPath(); G.arc(hx, hy, (14 + i * 12) * (0.4 + k), 0, 7); G.fill();
        }
        if (k < 1) drawPlane(hx + k * 30, hy + k * k * 120, ang + k * 2, 1.1 * (1 - k * 0.3));
      }
    }

    // big label
    G.textAlign = 'center'; G.textBaseline = 'middle';
    if (phase === 'wait') {
      const left = Math.max(0, (t0 - now) / 1000);
      G.fillStyle = '#fff'; G.font = '900 18px Inter';
      G.fillText('Prochain décollage', W / 2, H / 2 - 30);
      G.font = '900 44px Inter'; G.fillText(left.toFixed(1) + 's', W / 2, H / 2 + 12);
      G.fillStyle = 'rgba(255,255,255,.12)'; G.fillRect(W / 2 - 80, H / 2 + 48, 160, 6);
      G.fillStyle = '#00e701'; G.fillRect(W / 2 - 80, H / 2 + 48, 160 * (left / 5), 6);
      drawPlane(pad.l + 26, H - pad.b - 12, -0.05, 1.1);
    } else {
      G.font = '900 52px Inter';
      G.fillStyle = phase === 'crashed' ? '#ed4163' : '#fff';
      G.shadowColor = 'rgba(0,0,0,.5)'; G.shadowBlur = 16;
      G.fillText(m.toFixed(2) + '×', W / 2, H * 0.47);
      G.shadowBlur = 0;
      if (phase === 'crashed') { G.font = '800 15px Inter'; G.fillText('L’AVION S’EST ENVOLÉ !', W / 2, H * 0.47 + 40); }
      else if (myBet?.out) { G.font = '800 14px Inter'; G.fillStyle = '#00e701'; G.fillText(`Encaissé à ${myBet.out.toFixed(2)}× · +${fmt(myBet.amount * myBet.out)}`, W / 2, H * 0.47 + 40); }
    }
    raf = requestAnimationFrame(frame);
  }
  function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const n = x / p; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p; }

  // seed history
  for (let i = 0; i < 10; i++) history.push(crashPoint(Math.random()));
  histEl.innerHTML = history.map((h) => `<span class="${h >= 10 ? 'p' : h >= 2 ? 'g' : 'r'}">${h.toFixed(2)}×</span>`).join('');
  newRound();
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf); clearTimeout(timer); ro.disconnect(); eng?.stop();
    if (myBet && !myBet.out) {
      if (phase === 'fly') cashOut(multAt((performance.now() - t0) / 1000));
      else settle('crash', myBet.amount, myBet.amount, { mult: 1, noBig: true });
    }
  };
}
