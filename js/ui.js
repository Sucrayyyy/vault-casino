// Shared UI kit: formatting, toasts, sheets, bet panel, effects.
import { S, settings, isStory, rememberBet, round2 } from './store.js';
import { sfx } from './audio.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, settings.fast ? ms * 0.5 : ms));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- numbers ----------
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
export function fmt(n) {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e12) return nf2.format(n / 1e12) + ' T';
  if (Math.abs(n) >= 1e9) return nf2.format(n / 1e9) + ' Md';
  if (Math.abs(n) >= 1e7) return nf2.format(n / 1e6) + ' M';
  return nf2.format(n);
}
export function fmtShort(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace('.', ',') + ' Md';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' M';
  if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace('.', ',') + ' k';
  return nf0.format(n);
}
export const fmtX = (m) => (m >= 1000 ? nf0.format(m) : m.toFixed(2)) + '×';

export const COIN = `<svg class="coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="url(#cg)"/><circle cx="12" cy="12" r="8.2" fill="none" stroke="#007a01" stroke-width="1.6" opacity=".55"/><path d="M8 7.5h3.2l.8 5.2 2.6-5.2H17l-4.6 9h-2.6z" fill="#003d00"/></svg>`;
export const money = (n, cls = '') => `<span class="amt ${cls}">${COIN}<span>${fmt(n)}</span></span>`;

// ---------- haptics (iOS 18 switch trick + Android vibrate) ----------
let hapLabel = null;
export function haptic(strong = false) {
  if (!settings.haptics) return;
  if (navigator.vibrate) { navigator.vibrate(strong ? 30 : 8); return; }
  if (!hapLabel) {
    hapLabel = document.createElement('label');
    hapLabel.style.cssText = 'position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none';
    const inp = document.createElement('input');
    inp.type = 'checkbox'; inp.setAttribute('switch', '');
    hapLabel.append(inp);
    document.body.append(hapLabel);
  }
  hapLabel.click();
}

// ---------- toasts ----------
let toastWrap;
export function toast(html, { type = '', icon = '', sub = '', ms = 2600 } = {}) {
  if (!toastWrap) { toastWrap = el('<div class="toasts"></div>'); $('#overlay-root').append(toastWrap); }
  const t = el(`<div class="toast ${type}">${icon ? `<div class="ti">${icon}</div>` : ''}<div>${html}${sub ? `<small>${sub}</small>` : ''}</div></div>`);
  toastWrap.prepend(t);
  while (toastWrap.children.length > 3) toastWrap.lastChild.remove();
  t.onclick = () => close();
  const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
  setTimeout(close, ms);
}

// ---------- sheets / modals ----------
export function sheet(html, { center = false, onClose, closable = true } = {}) {
  const back = el(`<div class="modal-back ${center ? 'center' : ''}"><div class="modal">${center ? '' : '<div class="grab"></div>'}${closable ? '<button class="x" aria-label="Fermer"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' : ''}${html}</div></div>`);
  const modal = $('.modal', back);
  const close = () => {
    if (!back.isConnected) return;
    back.style.transition = 'opacity .2s'; back.style.opacity = '0';
    setTimeout(() => back.remove(), 200);
    onClose?.();
  };
  if (closable) {
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    $('.x', back).onclick = () => { sfx.click(); close(); };
  }
  $('#overlay-root').append(back);
  return { el: modal, back, close };
}

export function confirmSheet(title, body, okLabel = 'Confirmer', cls = 'green') {
  return new Promise((res) => {
    const s = sheet(`<h3>${title}</h3><div class="muted" style="font-size:13px;line-height:1.5">${body}</div><div class="spacer"></div><div class="row"><button class="btn ghost grow" data-no>Annuler</button><button class="btn ${cls} grow" data-ok>${okLabel}</button></div>`, { center: true, onClose: () => res(false) });
    $('[data-no]', s.el).onclick = () => { s.close(); };
    $('[data-ok]', s.el).onclick = () => { res(true); s.back.remove(); };
  });
}

// ---------- bet amount field ----------
export function betField(game, { label = 'Montant du pari', min = 0.01 } = {}) {
  const def = isStory() ? 1 : 10;
  const wrap = el(`<div>
    <div class="label"><span>${label}</span><span class="dim" data-usd></span></div>
    <div class="field">
      <div class="in">${COIN}<input type="text" inputmode="decimal" autocomplete="off" /></div>
      <button class="fbtn" data-half>½</button><div class="sep"></div>
      <button class="fbtn" data-dbl>2×</button><div class="sep"></div>
      <button class="fbtn" data-max>Max</button>
    </div></div>`);
  const input = $('input', wrap);
  let val = round2(rememberBet(game, def));
  const show = () => { input.value = val.toFixed(2).replace('.', ','); };
  const parse = () => {
    const v = parseFloat(String(input.value).replace(/\s/g, '').replace(',', '.'));
    val = isFinite(v) && v >= 0 ? round2(v) : val;
    show();
  };
  input.addEventListener('blur', parse);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('focus', () => setTimeout(() => input.select(), 10));
  $('[data-half]', wrap).onclick = () => { sfx.click(); parse(); val = Math.max(min, round2(val / 2)); show(); api.onChange?.(); };
  $('[data-dbl]', wrap).onclick = () => { sfx.click(); parse(); val = round2(Math.min(Math.max(val * 2, min), S.balance)); show(); api.onChange?.(); };
  $('[data-max]', wrap).onclick = () => { sfx.click(); val = round2(Math.floor(S.balance * 100) / 100); show(); api.onChange?.(); };
  input.addEventListener('input', () => api.onChange?.());
  show();
  const api = {
    el: wrap,
    get value() { parse(); return val; },
    set value(v) { val = round2(v); show(); },
    disable(d) { input.disabled = d; $$('button', wrap).forEach((b) => (b.disabled = d)); wrap.style.opacity = d ? 0.6 : 1; },
    onChange: null,
  };
  return api;
}

// Read-only "profit on win" field
export function infoField(label, valueHtml = '') {
  const w = el(`<div><div class="label"><span>${label}</span></div><div class="field ro"><div class="in" data-v>${valueHtml}</div></div></div>`);
  return { el: w, set(html) { $('[data-v]', w).innerHTML = html; } };
}

export function segmented(options, value, onChange, cls = '') {
  const w = el(`<div class="seg ${cls}">${options.map((o) => `<button data-v="${o.v}">${o.l}</button>`).join('')}</div>`);
  const set = (v) => { value = v; $$('button', w).forEach((b) => b.classList.toggle('on', b.dataset.v === String(v))); };
  $$('button', w).forEach((b) => (b.onclick = () => {
    if (b.disabled) return;
    sfx.click(); const o = options.find((x) => String(x.v) === b.dataset.v); set(o.v); onChange(o.v);
  }));
  set(value);
  return { el: w, set, disable(d) { $$('button', w).forEach((b) => (b.disabled = d)); w.style.opacity = d ? 0.6 : 1; } };
}

export function selectField(label, options, value, onChange) {
  const w = el(`<div><div class="label"><span>${label}</span></div><div class="select"><select>${options.map((o) => `<option value="${o.v}">${o.l}</option>`).join('')}</select></div></div>`);
  const s = $('select', w);
  s.value = value;
  s.onchange = () => { sfx.click(); onChange(isNaN(+s.value) ? s.value : +s.value); };
  return { el: w, set(v) { s.value = v; }, disable(d) { s.disabled = d; w.style.opacity = d ? 0.6 : 1; } };
}

// ---------- game page skeleton ----------
export function gameLayout(root, { id, edge = '1 %' } = {}) {
  root.innerHTML = `<div class="game">
    <div class="stage"></div>
    <div class="controls"></div>
    <div class="game-foot"><span>Avantage maison ${edge}</span><button data-fair><svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>Équité prouvable</button></div>
  </div>`;
  $('[data-fair]', root).onclick = () => import('./main.js').then((m) => m.openFairness());
  return { stage: $('.stage', root), controls: $('.controls', root) };
}

export function historyBar(stage, max = 8) {
  const h = el('<div class="history"></div>');
  stage.prepend(h);
  return {
    el: h,
    push(mult, win, label) {
      const p = el(`<div class="hp ${win ? (mult >= 10 ? 'big' : 'w') : ''}">${label ?? fmtX(mult)}</div>`);
      h.append(p);
      while (h.children.length > max) h.firstChild.remove();
    },
  };
}

export function resultPop(stage) {
  const p = el('<div class="result-pop"><div class="m"></div><div class="p"></div></div>');
  stage.append(p);
  let t;
  return {
    show(mult, payout) {
      $('.m', p).textContent = fmtX(mult);
      $('.p', p).innerHTML = money(payout);
      p.classList.add('show');
      clearTimeout(t); t = setTimeout(() => p.classList.remove('show'), 1800);
    },
    hide() { p.classList.remove('show'); },
  };
}

// ---------- count up ----------
export function countUp(node, from, to, ms = 900, fmtFn = fmt) {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmtFn(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- confetti / coin burst on #fx canvas ----------
const parts = [];
let fxRunning = false;
export function confetti({ x = 0.5, y = 0.45, n = 120, spread = 1, colors, coins = false } = {}) {
  const cv = $('#fx');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  const pal = colors || ['#00e701', '#ffc800', '#1475e1', '#ff2d75', '#ffffff', '#8847ff'];
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, 0) * spread + (spread < 1 ? -Math.PI / 2 * (1 - spread) : 0);
    const v = rnd(6, 16);
    parts.push({
      x: x * innerWidth, y: y * innerHeight, vx: Math.cos(a) * v * rnd(0.3, 1), vy: Math.sin(a) * v - rnd(2, 6),
      r: rnd(0, Math.PI * 2), vr: rnd(-0.3, 0.3), w: rnd(6, 11), h: rnd(4, 7), c: pal[i % pal.length], coin: coins && i % 2 === 0, life: rnd(110, 170),
    });
  }
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
}
function fxLoop() {
  const cv = $('#fx'), g = cv.getContext('2d');
  const dpr = cv.width / innerWidth;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    if (p.life <= 0 || p.y > innerHeight + 30) { parts.splice(i, 1); continue; }
    g.save(); g.translate(p.x, p.y); g.rotate(p.r);
    g.globalAlpha = Math.min(1, p.life / 30);
    if (p.coin) {
      const sx = Math.abs(Math.cos(p.r * 2));
      g.scale(sx, 1);
      g.fillStyle = '#00c901'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5dff5e'; g.beginPath(); g.arc(-1, -1, 5, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.5)));
    }
    g.restore();
  }
  if (parts.length) requestAnimationFrame(fxLoop);
  else { fxRunning = false; g.clearRect(0, 0, innerWidth, innerHeight); }
}

export function shake(node) {
  node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake');
}

// ---------- big win overlay ----------
export function bigWinOverlay(amount, mult, title) {
  const tier = mult >= 100 ? 'ÉNORME GAIN' : mult >= 25 ? 'MÉGA GAIN' : 'GROS GAIN';
  const o = el(`<div class="bigwin"><div class="rays"></div><div class="ttl">${title || tier}</div><div class="amt2">${COIN.replace('class="coin"', 'class="coin" style="width:30px;height:30px"')}<span>0,00</span></div>${mult ? `<div class="mult">${fmtX(mult)}</div>` : ''}<div class="tap">Touchez pour continuer</div></div>`);
  $('#overlay-root').append(o);
  sfx.bigWin(); haptic(true);
  countUp($('.amt2 span', o), 0, amount, 1600);
  confetti({ n: 160, coins: true, y: 0.5 });
  setTimeout(() => confetti({ n: 100, x: 0.2, y: 0.6 }), 500);
  setTimeout(() => confetti({ n: 100, x: 0.8, y: 0.6 }), 800);
  const close = () => { o.style.transition = 'opacity .25s'; o.style.opacity = 0; setTimeout(() => o.remove(), 250); };
  setTimeout(() => (o.onclick = close), 600);
  setTimeout(close, 6000);
}

// ---------- auto-bet helper ----------
// Renders Manual/Auto tabs; returns {mode, autoCount}.
export function modeTabs(onChange) {
  return segmented([{ v: 'manual', l: 'Manuel' }, { v: 'auto', l: 'Auto' }], 'manual', onChange);
}
export function autoField() {
  const w = el(`<div><div class="label"><span>Nombre de paris</span><span class="dim">0 = ∞</span></div><div class="field"><div class="in"><input type="text" inputmode="numeric" value="10"/></div><button class="fbtn" data-v="10">10</button><button class="fbtn" data-v="50">50</button><button class="fbtn" data-v="0">∞</button></div></div>`);
  const i = $('input', w);
  $$('[data-v]', w).forEach((b) => (b.onclick = () => { sfx.click(); i.value = b.dataset.v; }));
  return { el: w, get value() { return Math.max(0, parseInt(i.value) || 0); }, disable(d) { i.disabled = d; } };
}

// Animated number for multipliers etc
export function animateNumber(from, to, ms, onStep) {
  return new Promise((res) => {
    const t0 = performance.now();
    const f = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      onStep(from + (to - from) * (1 - Math.pow(1 - k, 3)), k);
      if (k < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
}

// Resize a canvas to its CSS box with DPR; returns ctx and size.
export function fitCanvas(cv) {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w: r.width, h: r.height, dpr };
}

export const profitHtml = (n) => `<span class="amt">${COIN}<span>${fmt(n)}</span></span>`;

// Per-module stylesheet injection (once)
const injected = new Set();
export function css(id, text) {
  if (injected.has(id)) return;
  injected.add(id);
  const s = document.createElement('style');
  s.dataset.mod = id;
  s.textContent = text;
  document.head.append(s);
}
