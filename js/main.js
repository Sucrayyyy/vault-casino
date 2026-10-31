import {
  S, settings, saveSettings, bus, loadMode, hasSave, peekSave, netWorth, invValue, isStory, isUnlocked,
  dailyState, claimDaily, faucetLeft, faucetAmount, claimFaucet, claimRake, refill, ensureMissions, missionText,
  claimMission, ACH, fair, saveNow, START,
} from './store.js';
import { GAMES, CHAPTERS, VIP, gameById } from './catalog.js';
import { $, $$, el, fmt, fmtShort, fmtX, money, COIN, toast, sheet, confirmSheet, haptic, confetti, bigWinOverlay, countUp, esc } from './ui.js';
import { sfx, unlockAudio, audioSettings } from './audio.js';
import { thumb } from './thumbs.js';
import { startFeed, getFeed, avatar, leaderboard, gameName } from './bots.js';
import { sha256Hex } from './rng.js';

const view = $('#view');
const topbar = $('#topbar');
const tabbar = $('#tabbar');

const MODULES = {
  dice: './games/dice.js', mines: './games/mines.js', limbo: './games/limbo.js', plinko: './games/plinko.js',
  hilo: './games/hilo.js', keno: './games/keno.js', crash: './games/crash.js', chicken: './games/chicken.js',
  wheel: './games/wheel.js', blackjack: './games/blackjack.js', tower: './games/tower.js', roulette: './games/roulette.js',
  slots: './games/slots.js', cases: './cs/cases.js', upgrader: './cs/upgrader.js', battles: './cs/battles.js',
  boosters: './poke/packs.js', etb: './poke/packs.js', display: './poke/packs.js', grading: './poke/grading.js',
};

// ---------------- audio unlock + settings ----------------
const unlock = () => { unlockAudio(); audioSettings(settings); };
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('touchend', unlock, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('button')) haptic(); }, { capture: true });

// ---------------- topbar ----------------
let shownBalance = 0;
function renderTop(route) {
  const inGame = route.startsWith('g/');
  const id = route.slice(2).split('/')[0];
  topbar.innerHTML = `
    ${inGame ? `<button class="back-btn" data-back aria-label="Retour"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="top-title">${esc(gameById[id]?.name || '')}</div>`
      : `<div class="logo"><span class="dot"></span>VAULT</div>`}
    <div class="wallet"><button class="bal" data-wallet>${COIN}<span data-bal>${fmt(S.balance)}</span></button><button class="wbtn" data-wallet aria-label="Portefeuille"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h13v3H5" fill="none" stroke="#fff" stroke-width="2.2"/><rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="16.5" cy="13.5" r="1.6" fill="#fff"/></svg></button></div>
    ${inGame ? '' : `<button class="icon-btn" data-go="profil" aria-label="Profil"><svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`}`;
  shownBalance = S.balance;
  $('[data-back]', topbar)?.addEventListener('click', () => { sfx.click(); goBack(); });
  $$('[data-wallet]', topbar).forEach((b) => (b.onclick = () => { sfx.click(); openWallet(); }));
  $('[data-go]', topbar)?.addEventListener('click', () => { sfx.tab(); go('profil'); });
}

let balTimer;
bus.on('balance', ({ delta }) => {
  const b = $('[data-bal]');
  if (!b) return;
  const from = shownBalance, to = S.balance;
  shownBalance = to;
  const wrap = b.parentElement;
  wrap.classList.remove('up', 'down');
  if (Math.abs(to - from) > 0.001) {
    if (delta > 0) wrap.classList.add('up'); else if (delta < 0) wrap.classList.add('down');
    countUp(b, from, to, delta > 0 ? 500 : 200);
  } else b.textContent = fmt(to);
  clearTimeout(balTimer);
  balTimer = setTimeout(() => wrap.classList.remove('up', 'down'), 700);
  updateBadges();
});

// ---------------- tabbar ----------------
const TABS = [
  { r: '', l: 'Casino', i: '<path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2.2" rx="3"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>' },
  { r: 'cs', l: 'CS Skins', i: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>' },
  { r: 'poke', l: 'Pokémon', i: '<rect x="5" y="3" width="12" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2.2" transform="rotate(-8 11 11)"/><rect x="9" y="5" width="11" height="16" rx="2" fill="currentColor" opacity=".35" transform="rotate(10 14 13)"/><path d="M11 9l2 3-2 1 3 4" stroke="currentColor" stroke-width="1.8" fill="none" transform="rotate(-8 11 11)"/>' },
  { r: 'bonus', l: 'Bonus', i: '<rect x="3" y="9" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2 9h20M12 9v12" stroke="currentColor" stroke-width="2.2"/><path d="M12 9c-2-5-7-5-6-2 .6 2 6 2 6 2zm0 0c2-5 7-5 6-2-.6 2-6 2-6 2z" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { r: 'profil', l: 'Profil', i: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
];
function renderTabs(route) {
  const root = route.split('/')[0];
  tabbar.innerHTML = TABS.map((t) => `<button data-r="${t.r}" class="${root === t.r ? 'on' : ''}"><svg width="22" height="22" viewBox="0 0 24 24">${t.i}</svg>${t.l}${t.r === 'bonus' ? '<i class="badge-dot hidden" data-bonusdot></i>' : ''}</button>`).join('');
  $$('button', tabbar).forEach((b) => (b.onclick = () => { sfx.tab(); go(b.dataset.r); }));
  updateBadges();
}
function bonusPending() {
  if (!S) return false;
  return dailyState().can || faucetLeft() === 0 || S.missions.list.some((m) => m.done && !m.claimed) || S.rake >= 0.01;
}
function updateBadges() {
  const pend = bonusPending();
  $$('[data-bonusdot]').forEach((d) => d.classList.toggle('hidden', !pend));
}
setInterval(updateBadges, 5000);

// ---------------- router ----------------
let cleanup = null;
let current = '';
export function go(r) { location.hash = '#/' + r; }
function goBack() {
  const id = current.slice(2);
  const g = gameById[id.split('/')[0]];
  go(g?.sec === 'cs' ? 'cs' : g?.sec === 'poke' ? 'poke' : '');
}
window.addEventListener('hashchange', route);

async function route() {
  const r = location.hash.replace(/^#\/?/, '');
  if (!S) { renderSplash(); return; }
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  current = r;
  view.scrollTop = 0;
  view.classList.remove('no-scroll');
  renderTop(r);
  if (r.startsWith('g/')) {
    tabbar.classList.add('hidden-tabs');
    const [id, ...rest] = r.slice(2).split('/');
    const g = gameById[id];
    if (!g || !MODULES[id]) { go(''); return; }
    if (!isUnlocked(id)) { toast(`Débloqué à ${fmt(g.unlock)} de fortune`, { type: 'red', icon: '🔒' }); go(''); return; }
    view.innerHTML = '<div class="empty" style="padding-top:30vh"><div class="e">⏳</div>Chargement…</div>';
    try {
      const mod = await import(MODULES[id]);
      if (current !== r) return;
      view.innerHTML = '';
      const host = el('<div class="page-enter" style="min-height:100%;display:flex;flex-direction:column"></div>');
      view.append(host);
      cleanup = mod.mount(host, { id, args: rest }) || null;
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="empty"><div class="e">⚠️</div>Erreur de chargement<br><small class="mono">${esc(e.message)}</small></div>`;
    }
    return;
  }
  tabbar.classList.remove('hidden-tabs');
  renderTabs(r);
  const page = el('<div class="page page-enter"></div>');
  view.innerHTML = '';
  view.append(page);
  const root = r.split('/')[0];
  if (root === 'cs') cleanup = (await import('./cs/lobby.js')).mount(page, tileGrid);
  else if (root === 'poke') cleanup = (await import('./poke/lobby.js')).mount(page, tileGrid);
  else if (root === 'bonus') cleanup = renderBonus(page);
  else if (root === 'profil') cleanup = renderProfile(page);
  else cleanup = renderHome(page);
}

// ---------------- tiles ----------------
const playersOnline = (id) => {
  let h = 0; for (const c of id) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  const base = 80 + (h % 900);
  return Math.round(base * (0.85 + 0.3 * Math.sin(Date.now() / 600000 + h)));
};
export function tileGrid(games, scroll = false) {
  const wrap = el(`<div class="tiles ${scroll ? 'scroll' : ''}"></div>`);
  for (const g of games) {
    const locked = !isUnlocked(g.id);
    const fresh = isStory() && !locked && g.unlock > 0 && S.seenUnlock[g.id] === 1;
    const t = el(`<button class="tile">${thumb(g)}${locked ? `<div class="lock"><svg width="22" height="22" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="#fff"/><path d="M8 10V7a4 4 0 018 0v3" stroke="#fff" stroke-width="2.4" fill="none"/></svg><b>${COIN}${fmtShort(g.unlock)}</b>de fortune</div>` : `<div class="players"><i></i>${playersOnline(g.id)}</div>`}${fresh ? '<div class="new">NOUVEAU</div>' : ''}</button>`);
    t.onclick = () => {
      if (locked) { sfx.error(); toast(`Atteins <b>${fmt(g.unlock)}</b> de fortune pour débloquer ${g.name}`, { type: 'red', icon: '🔒', sub: `Fortune actuelle : ${fmt(netWorth())}` }); return; }
      if (S.seenUnlock[g.id] === 1) { S.seenUnlock[g.id] = 2; }
      sfx.click(); go('g/' + g.id);
    };
    wrap.append(t);
  }
  return wrap;
}

// ---------------- HOME ----------------
function renderHome(page) {
  const story = isStory();
  const nw = netWorth();
  const ch = CHAPTERS[S.chapter];
  const prevGoal = S.chapter ? CHAPTERS[S.chapter - 1].goal : START.story;
  const nextGame = GAMES.filter((g) => !isUnlocked(g.id)).sort((a, b) => a.unlock - b.unlock)[0];
  const lb = leaderboard();
  const myRank = lb.findIndex((r) => r.me) + 1;

  const hero = story && ch ? `
    <div class="hero" style="background:linear-gradient(120deg,#0b3d1f,#0f212e 70%)">
      <svg class="hbg" viewBox="0 0 400 140" preserveAspectRatio="xMaxYMid slice"><circle cx="350" cy="40" r="90" fill="#00e701" opacity=".09"/><circle cx="330" cy="70" r="46" fill="#00e701" opacity=".12"/><text x="330" y="88" text-anchor="middle" font-size="52">🏆</text></svg>
      <div class="chip green">MODE HISTOIRE · CHAPITRE ${S.chapter + 1}/${CHAPTERS.length}</div>
      <div class="t">${ch.title}</div>
      <div class="s">Atteins ${money(ch.goal)} de fortune${nextGame ? ` · prochain déblocage : <b>${nextGame.name}</b> à ${fmtShort(nextGame.unlock)}` : ''}</div>
      <div class="progress" style="margin-top:6px;max-width:100%"><i style="width:${Math.min(100, Math.max(2, ((nw - prevGoal) / (ch.goal - prevGoal)) * 100))}%"></i></div>
      <div class="s" style="display:flex;justify-content:space-between;max-width:100%"><span>${fmt(nw)}</span><span>Récompense : ${money(ch.reward)}</span></div>
    </div>` : `
    <div class="hero" style="background:linear-gradient(120deg,#123a63,#0f212e 75%)">
      <svg class="hbg" viewBox="0 0 400 140" preserveAspectRatio="xMaxYMid slice"><circle cx="340" cy="50" r="90" fill="#1475e1" opacity=".18"/><text x="330" y="92" text-anchor="middle" font-size="58">${story ? '👑' : '💎'}</text></svg>
      <div class="chip">${story ? 'HISTOIRE TERMINÉE' : 'BAC À SABLE'}</div>
      <div class="t">${story ? 'Tu possèdes le Vault.' : 'Deviens le plus riche du Vault'}</div>
      <div class="s">Classement : <b>#${myRank}</b> sur ${lb.length} joueurs · fortune ${money(nw)}</div>
      <button class="btn sm blue" style="align-self:flex-start;margin-top:4px" data-lb>Voir le classement</button>
    </div>`;

  page.innerHTML = `
    ${hero}
    <div class="sec" style="margin-top:14px"><div class="quick" data-quick></div></div>
    <div class="sec"><div class="sec-head"><div class="h2">🔥 Vault Originals</div><span class="more">${GAMES.filter((g) => g.sec === 'casino').length} jeux</span></div><div data-orig></div></div>
    <div class="sec"><div class="sec-head"><div class="h2">🃏 Jeux de table</div></div><div data-table></div></div>
    <div class="sec"><div class="sec-head"><div class="h2">🎁 Autres univers</div></div><div data-other></div></div>
    <div class="sec"><div class="sec-head"><div class="h2"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)"></span>Paris en direct</div></div>
      <table class="table"><thead><tr><th>Jeu</th><th>Joueur</th><th>Multi.</th><th>Gain</th></tr></thead><tbody data-feed></tbody></table></div>`;

  $('[data-orig]', page).append(tileGrid(GAMES.filter((g) => g.sec === 'casino')));
  $('[data-table]', page).append(tileGrid(GAMES.filter((g) => g.sec === 'table')));
  $('[data-other]', page).append(tileGrid(GAMES.filter((g) => g.sec === 'cs' || g.sec === 'poke'), true));
  $('[data-lb]', page)?.addEventListener('click', () => { sfx.click(); openLeaderboard(); });
  const q = $('[data-quick]', page);
  const stopQuick = renderQuick(q);

  const tbody = $('[data-feed]', page);
  const row = (f, isNew) => `<tr class="${isNew ? 'new' : ''} ${f.me ? 'me' : ''}"><td>${gameName(f.game)}</td><td>${f.me ? '<b>Toi</b>' : esc(f.name)}</td><td>${fmtX(f.mult)}</td><td><span class="amt ${f.mult >= 1 ? 'green' : 'red'}">${f.mult >= 1 ? '+' : '-'}${fmt(f.mult >= 1 ? f.payout - f.bet : f.bet)}${COIN}</span></td></tr>`;
  tbody.innerHTML = getFeed().slice(0, 12).map((f) => row(f)).join('');
  const off = bus.on('feed', (f) => {
    tbody.insertAdjacentHTML('afterbegin', row(f, true));
    while (tbody.children.length > 12) tbody.lastChild.remove();
  });
  return () => { off(); stopQuick(); };
}

function cdText(ms) {
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function renderQuick(q) {
  const draw = () => {
    const d = dailyState();
    const fl = faucetLeft();
    const doneM = S.missions.list.filter((m) => m.done && !m.claimed).length;
    q.innerHTML = `
      <button data-q="daily"><div class="ic" style="background:linear-gradient(135deg,#ffd84d,#f59e0b)">🎁</div>Quotidien${d.can ? '<i class="badge-dot"></i>' : `<span class="cd">Jour ${d.streak}/7</span>`}</button>
      <button data-q="faucet"><div class="ic" style="background:linear-gradient(135deg,#34d399,#059669)">💰</div>Coffre${fl === 0 ? '<i class="badge-dot"></i>' : `<span class="cd">${cdText(fl)}</span>`}</button>
      <button data-q="missions"><div class="ic" style="background:linear-gradient(135deg,#60a5fa,#2563eb)">🎯</div>Missions${doneM ? '<i class="badge-dot"></i>' : `<span class="cd">${S.missions.list.filter((m) => m.claimed).length}/3</span>`}</button>
      ${isStory() ? `<button data-q="lb"><div class="ic" style="background:linear-gradient(135deg,#c084fc,#7c3aed)">🏆</div>Classement<span class="cd">#${leaderboard().findIndex((r) => r.me) + 1}</span></button>`
        : `<button data-q="refill"><div class="ic" style="background:linear-gradient(135deg,#f472b6,#db2777)">⚡</div>Recharger<span class="cd">+10 000</span></button>`}`;
    $$('button', q).forEach((b) => (b.onclick = () => quickAction(b.dataset.q, draw)));
  };
  draw();
  const t = setInterval(draw, 1000);
  return () => clearInterval(t);
}

function quickAction(k, redraw) {
  sfx.click();
  if (k === 'daily') openDaily(redraw);
  if (k === 'faucet') {
    const a = claimFaucet();
    if (a) { sfx.cashout(); confetti({ n: 60, coins: true, y: 0.3 }); toast(`+${fmt(a)} récupérés dans le coffre`, { icon: '💰', sub: 'Reviens dans 15 min pour le prochain' }); }
    else { sfx.error(); toast(`Coffre disponible dans ${cdText(faucetLeft())}`, { type: 'blue', icon: '⏳', sub: `Prochain montant : ${fmt(faucetAmount())}` }); }
  }
  if (k === 'missions') go('bonus');
  if (k === 'lb') openLeaderboard();
  if (k === 'refill') { refill(); sfx.cashout(); toast('+10 000 ajoutés (bac à sable)', { icon: '⚡' }); }
  redraw?.();
}

function openDaily(redraw) {
  const d = dailyState();
  const s = sheet(`<h3>🎁 Bonus quotidien</h3>
    <div class="muted" style="font-size:12.5px;margin-bottom:12px">Reviens chaque jour pour faire grimper ta série. Le jour 7 rapporte ×8 !</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:14px">
      ${d.table.map((m, i) => {
        const day = i + 1, got = d.can ? day < d.nextDay : day <= d.streak, today = d.can && day === d.nextDay;
        return `<div style="border-radius:8px;padding:8px 2px;text-align:center;font-size:10.5px;background:${today ? 'linear-gradient(180deg,#ffd84d,#f59e0b)' : got ? 'rgba(0,231,1,.15)' : 'var(--bg3)'};color:${today ? '#3a2400' : got ? 'var(--green)' : 'var(--txt2)'};${today ? 'transform:scale(1.08);box-shadow:0 4px 14px rgba(255,200,0,.4)' : ''}"><div style="font-size:16px">${got ? '✓' : day === 7 ? '👑' : '🎁'}</div>J${day}<div style="font-weight:900">×${m}</div></div>`;
      }).join('')}
    </div>
    <button class="btn gold full lg ${d.can ? 'pulse' : ''}" ${d.can ? '' : 'disabled'} data-claim>${d.can ? `Récupérer ${fmt(d.amount)}` : 'Déjà récupéré aujourd’hui'}</button>`);
  $('[data-claim]', s.el).onclick = () => {
    const a = claimDaily();
    if (!a) return;
    s.close();
    bigWinOverlay(a, 0, `JOUR ${S.daily.streak}`);
    redraw?.();
  };
}

function openLeaderboard() {
  const lb = leaderboard();
  const meIdx = lb.findIndex((r) => r.me);
  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="dim">#${i + 1}</span>`);
  sheet(`<h3>🏆 Classement des fortunes</h3>
    <div class="list">${lb.slice(0, 25).map((r, i) => `<div class="li" style="${r.me ? 'outline:2px solid var(--green)' : ''};padding:9px 12px"><div style="width:28px;text-align:center;font-weight:900">${medal(i)}</div>${avatar(r.name, 30)}<div class="tx"><b>${esc(r.name)}${r.me ? ' (toi)' : ''}</b></div>${money(r.worth)}</div>`).join('')}
    ${meIdx >= 25 ? `<div class="li" style="outline:2px solid var(--green)"><div style="width:28px;text-align:center" class="dim">#${meIdx + 1}</div>${avatar('Toi', 30)}<div class="tx"><b>Toi</b></div>${money(lb[meIdx].worth)}</div>` : ''}</div>`);
}

// ---------------- wallet ----------------
function openWallet() {
  const iv = invValue();
  const s = sheet(`<h3>Portefeuille</h3>
    <div class="stat-grid">
      <div class="stat"><small>Solde</small><b>${money(S.balance)}</b></div>
      <div class="stat"><small>Inventaire (skins + cartes)</small><b>${money(iv)}</b></div>
      <div class="stat" style="grid-column:span 2"><small>Fortune totale</small><b style="font-size:20px">${money(netWorth())}</b></div>
    </div>
    <div class="spacer"></div>
    <div class="muted" style="font-size:11.5px;line-height:1.5;margin-bottom:12px">💡 Monnaie 100 % virtuelle, sans aucune valeur réelle. Impossible d’acheter ou de retirer de l’argent réel.</div>
    <div class="col">
      ${isStory() ? '' : '<button class="btn blue full" data-refill>⚡ Recharger +10 000 (bac à sable)</button>'}
      <button class="btn full" data-faucet>💰 Coffre gratuit ${faucetLeft() ? `(${cdText(faucetLeft())})` : '— disponible !'}</button>
      <button class="btn full" data-rake>♻️ Rakeback : ${fmt(S.rake)}</button>
    </div>`);
  $('[data-refill]', s.el)?.addEventListener('click', () => { refill(); sfx.cashout(); s.close(); });
  $('[data-faucet]', s.el).onclick = () => { s.close(); quickAction('faucet'); };
  $('[data-rake]', s.el).onclick = () => { const r = claimRake(); if (r) { sfx.cashout(); toast(`Rakeback : +${fmt(r)}`, { icon: '♻️' }); } else sfx.error(); s.close(); };
}

// ---------------- BONUS page ----------------
function renderBonus(page) {
  ensureMissions();
  const draw = () => {
    const d = dailyState();
    const fl = faucetLeft();
    const vi = S.vip;
    const cur = VIP[vi], nxt = VIP[vi + 1];
    const prog = nxt ? ((S.stats.wagered - cur.at) / (nxt.at - cur.at)) * 100 : 100;
    page.innerHTML = `
      <div class="h1">Bonus & récompenses</div>
      <div class="muted" style="font-size:12.5px">Tout ce qui te rapporte des jetons gratuitement.</div>

      <div class="panel" style="margin-top:14px;background:linear-gradient(135deg,${cur.color}33,var(--bg2) 60%)">
        <div class="row" style="justify-content:space-between"><div><div class="dim" style="font-size:11px">NIVEAU VIP</div><div style="font-size:20px;font-weight:900;color:${cur.color}">${cur.name}</div></div><div style="text-align:right"><div class="dim" style="font-size:11px">RAKEBACK</div><b>${(cur.rake * 100).toFixed(2)} %</b></div></div>
        <div class="progress gold" style="margin:10px 0 6px"><i style="width:${Math.max(2, Math.min(100, prog))}%"></i></div>
        <div class="row" style="justify-content:space-between;font-size:11.5px" class="muted"><span class="muted">Misé : ${fmtShort(S.stats.wagered)}</span><span class="muted">${nxt ? `${nxt.name} à ${fmtShort(nxt.at)}` : 'Niveau max'}</span></div>
        <div class="spacer"></div>
        <button class="btn full ${S.rake >= 0.01 ? 'green' : ''}" data-rake ${S.rake >= 0.01 ? '' : 'disabled'}>♻️ Récupérer le rakeback · ${fmt(S.rake)}</button>
      </div>

      <div class="grid2" style="margin-top:10px">
        <button class="panel" data-daily style="text-align:left"><div style="font-size:26px">🎁</div><b style="display:block;margin-top:4px">Quotidien</b><small class="muted">${d.can ? `<span class="green">Disponible · ${fmt(d.amount)}</span>` : `Série : ${d.streak}/7`}</small></button>
        <button class="panel" data-faucet style="text-align:left"><div style="font-size:26px">💰</div><b style="display:block;margin-top:4px">Coffre</b><small class="muted">${fl === 0 ? `<span class="green">Disponible · ${fmt(faucetAmount())}</span>` : `Dans ${cdText(fl)}`}</small></button>
      </div>

      <div class="sec"><div class="sec-head"><div class="h2">🎯 Missions du jour</div><span class="more">Renouvelées à minuit</span></div>
        <div class="list">${S.missions.list.map((m, i) => `<div class="li ${m.claimed ? 'done' : ''}"><div class="ic">${m.claimed ? '✅' : m.done ? '🎉' : '🎯'}</div><div class="tx"><b>${missionText(m)}</b><div class="progress" style="margin-top:6px;height:6px"><i style="width:${(m.p / m.n) * 100}%"></i></div><small>${Math.floor(m.p)}/${m.n} · récompense ${fmt(m.reward)}</small></div>${m.done && !m.claimed ? `<button class="btn green sm" data-m="${i}">Réclamer</button>` : ''}</div>`).join('')}</div></div>

      ${isStory() ? `<div class="sec"><div class="sec-head"><div class="h2">📖 Chapitres</div><span class="more">${S.chapter}/${CHAPTERS.length}</span></div>
        <div class="list">${CHAPTERS.map((c, i) => {
          const unlocks = GAMES.filter((g) => g.unlock > (i ? CHAPTERS[i - 1].goal : 100) && g.unlock <= c.goal).map((g) => g.name);
          return `<div class="li ${i < S.chapter ? 'done' : ''}" style="${i === S.chapter ? 'outline:2px solid var(--green)' : ''}"><div class="ic">${i < S.chapter ? '✅' : i === S.chapter ? '▶️' : '🔒'}</div><div class="tx"><b>${i + 1}. ${c.title}</b><small>Objectif ${fmt(c.goal)} · +${fmt(c.reward)}${unlocks.length ? ` · débloque ${unlocks.join(', ')}` : ''}</small></div></div>`;
        }).join('')}</div></div>` : ''}

      <div class="sec"><div class="sec-head"><div class="h2">🏅 Succès</div><span class="more">${Object.keys(S.ach).length}/${Object.keys(ACH).length}</span></div>
        <div class="grid3">${Object.entries(ACH).map(([id, [n, d, ic]]) => `<div class="panel-2" style="text-align:center;padding:10px 6px;${S.ach[id] ? '' : 'opacity:.4;filter:grayscale(1)'}"><div style="font-size:24px">${ic}</div><div style="font-size:11px;font-weight:800;margin-top:4px">${n}</div><div style="font-size:9.5px;color:var(--txt2);margin-top:2px;font-weight:600">${d}</div></div>`).join('')}</div></div>`;

    $('[data-rake]', page).onclick = () => { const r = claimRake(); if (r) { sfx.cashout(); confetti({ n: 50, coins: true, y: 0.3 }); toast(`Rakeback : +${fmt(r)}`, { icon: '♻️' }); draw(); } };
    $('[data-daily]', page).onclick = () => { sfx.click(); openDaily(draw); };
    $('[data-faucet]', page).onclick = () => { quickAction('faucet'); draw(); };
    $$('[data-m]', page).forEach((b) => (b.onclick = () => {
      const r = claimMission(+b.dataset.m);
      if (r) { sfx.cashout(); confetti({ n: 70, coins: true, y: 0.5 }); toast(`Mission accomplie : +${fmt(r)}`, { icon: '🎯' }); draw(); }
    }));
  };
  draw();
  const t = setInterval(() => { if (!document.querySelector('.modal-back')) draw(); }, 15000);
  return () => clearInterval(t);
}

// ---------------- PROFILE ----------------
function renderProfile(page) {
  const st = S.stats;
  const games = Object.entries(st.perGame).sort((a, b) => b[1].bets - a[1].bets);
  const sw = (k, label, sub) => `<div class="li" data-sw="${k}"><div class="tx"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div><div class="switch ${settings[k] ? 'on' : ''}"></div></div>`;
  page.innerHTML = `
    <div class="row" style="gap:12px">${avatar(settings.name || 'Toi', 54)}<div class="grow"><div class="h1" style="margin:0">${esc(settings.name || 'Toi')}</div><div class="chip" style="color:${VIP[S.vip].color}">VIP ${VIP[S.vip].name}</div> <div class="chip">${isStory() ? 'Mode histoire' : 'Bac à sable'}</div></div><button class="btn sm" data-rename>✏️</button></div>
    <div class="stat-grid" style="margin-top:14px">
      <div class="stat"><small>Fortune</small><b>${money(netWorth())}</b></div>
      <div class="stat"><small>Total misé</small><b>${money(st.wagered)}</b></div>
      <div class="stat"><small>Profit net</small><b class="${st.profit >= 0 ? 'green' : 'red'}">${money(st.profit)}</b></div>
      <div class="stat"><small>Paris / gagnés</small><b>${st.bets.toLocaleString('fr-FR')} / ${st.wins.toLocaleString('fr-FR')}</b></div>
      <div class="stat"><small>Plus gros gain</small><b>${money(st.bestWin)}</b></div>
      <div class="stat"><small>Meilleur multi.</small><b>${fmtX(st.bestMult || 0)}</b></div>
      <div class="stat"><small>Caisses ouvertes</small><b>${st.cases}</b></div>
      <div class="stat"><small>Boosters ouverts</small><b>${st.packs}</b></div>
    </div>
    <div class="sec"><button class="btn full" data-lb>🏆 Classement</button></div>
    ${games.length ? `<div class="sec"><div class="sec-head"><div class="h2">Par jeu</div></div><table class="table"><thead><tr><th>Jeu</th><th>Paris</th><th>Meilleur</th><th>Profit</th></tr></thead><tbody>${games.map(([id, g]) => `<tr><td>${gameName(id)}</td><td>${g.bets}</td><td>${fmtX(g.best)}</td><td class="${g.profit >= 0 ? 'green' : 'red'}">${fmt(g.profit)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="sec"><div class="sec-head"><div class="h2">Réglages</div></div><div class="list">
      ${sw('sound', 'Effets sonores', 'Sur iPhone, désactive le mode silencieux')}
      ${sw('music', 'Musique lounge', 'Ambiance générée en temps réel')}
      ${sw('haptics', 'Vibrations', 'Retour haptique sur les actions')}
      ${sw('fast', 'Animations rapides', 'Accélère cartes, caisses et roues')}
      <button class="li" data-fair style="text-align:left"><div class="ic">🛡️</div><div class="tx"><b>Équité prouvable</b><small>Seeds, hash SHA-256 et nonce</small></div></button>
      <button class="li" data-mode style="text-align:left"><div class="ic">🔁</div><div class="tx"><b>Changer de mode</b><small>Histoire ↔ Bac à sable (sauvegardes séparées)</small></div></button>
      <button class="li" data-reset style="text-align:left"><div class="ic">🗑️</div><div class="tx"><b class="red">Réinitialiser ce mode</b><small>Efface la progression de ${isStory() ? 'l’histoire' : 'du bac à sable'}</small></div></button>
    </div></div>
    <div class="center dim" style="font-size:11px;margin-top:20px;line-height:1.6">VAULT · jeu de simulation hors ligne<br>Aucun argent réel · jetons virtuels sans valeur<br>Joue pour le fun 🎲</div>`;
  $$('[data-sw]', page).forEach((r) => (r.onclick = () => {
    const k = r.dataset.sw;
    settings[k] = !settings[k];
    saveSettings();
    audioSettings(settings);
    $('.switch', r).classList.toggle('on', settings[k]);
    sfx.click();
  }));
  $('[data-lb]', page).onclick = () => { sfx.click(); openLeaderboard(); };
  $('[data-fair]', page).onclick = () => { sfx.click(); openFairness(); };
  $('[data-rename]', page).onclick = () => {
    const n = prompt('Ton pseudo', settings.name || 'Toi');
    if (n && n.trim()) { settings.name = n.trim().slice(0, 16); saveSettings(); route(); }
  };
  $('[data-mode]', page).onclick = () => { sfx.click(); saveNow(); S_reset(); };
  $('[data-reset]', page).onclick = async () => {
    if (await confirmSheet('Réinitialiser ?', 'Toute la progression de ce mode sera effacée (solde, inventaire, collection, succès).', 'Tout effacer', 'red')) {
      loadMode(S.mode, true);
      toast('Progression réinitialisée', { icon: '🗑️' });
      go('');
      route();
    }
  };
}

export function openFairness() {
  const s = sheet(`<h3>🛡️ Équité prouvable</h3>
    <div class="muted" style="font-size:12px;line-height:1.5;margin-bottom:10px">Chaque résultat = HMAC-SHA256(seed serveur, « seed client:nonce:round »). Le hash du seed serveur est affiché avant de jouer ; change de seed pour révéler l’ancien et vérifier tous tes paris.</div>
    <div class="label">Seed serveur (hashé)</div><div class="panel-2 mono">${fair.hashed}</div>
    <div class="label" style="margin-top:10px">Seed client</div><div class="field"><div class="in"><input data-client value="${esc(S.fair.client)}"/></div></div>
    <div class="label" style="margin-top:10px"><span>Nonce</span><span>${S.fair.nonce}</span></div>
    <button class="btn blue full" data-rot style="margin-top:6px">Changer de seed (révéler l’actuel)</button>
    ${S.fair.prev?.length ? `<div class="label" style="margin-top:14px">Seeds révélés</div>${S.fair.prev.map((p) => `<div class="panel-2 mono" style="margin-bottom:6px">serveur : ${p.server}<br>hash : ${sha256Hex(p.server)}<br>client : ${esc(p.client)} · paris : ${p.nonce}</div>`).join('')}` : ''}`);
  $('[data-rot]', s.el).onclick = () => {
    const c = $('[data-client]', s.el).value.trim().slice(0, 64);
    fair.rotate(c || undefined);
    saveNow();
    s.close();
    toast('Nouvelle paire de seeds active', { icon: '🛡️' });
    setTimeout(openFairness, 250);
  };
}

// ---------------- SPLASH / MODE SELECT ----------------
function S_reset() {
  renderSplash(true);
}
function renderSplash(fromProfile = false) {
  tabbar.classList.add('hidden-tabs');
  topbar.style.display = 'none';
  const info = (m) => {
    if (!hasSave(m)) return '<span class="dim">Nouvelle partie</span>';
    const d = peekSave(m);
    return `Sauvegarde : ${money(d.balance)}${m === 'story' ? ` · chapitre ${(d.chapter || 0) + 1}` : ''}`;
  };
  view.innerHTML = `<div class="splash page-enter">
    <div class="big-logo"><span class="dot"></span>VAULT</div>
    <div class="center muted" style="font-size:13px;margin-top:-6px">Casino · Skins · Cartes — 100 % virtuel</div>
    <div class="spacer"></div>
    <button class="mode-card" data-m="story" style="border-color:#00e70155"><div class="mi">📖</div><div class="chip green" style="align-self:flex-start">RECOMMANDÉ</div><div class="mt">Mode histoire</div><div class="ms">Commence avec ${fmt(START.story)} jetons. Atteins des paliers de fortune pour débloquer de nouveaux jeux, les caisses CS et les boosters Pokémon. 15 chapitres jusqu’au milliard.</div><div class="save">${info('story')}</div></button>
    <button class="mode-card" data-m="sandbox"><div class="mi">💎</div><div class="mt">Bac à sable</div><div class="ms">Tous les jeux débloqués, ${fmt(START.sandbox)} jetons de départ et recharge gratuite. Objectif : la plus grosse fortune possible.</div><div class="save">${info('sandbox')}</div></button>
    <div class="center dim" style="font-size:11px;margin-top:8px;line-height:1.6">Aucun argent réel. Les jetons n’ont aucune valeur et ne peuvent être ni achetés ni retirés.</div>
  </div>`;
  $$('[data-m]', view).forEach((b) => (b.onclick = () => {
    unlock(); sfx.levelUp();
    loadMode(b.dataset.m);
    topbar.style.display = '';
    startFeed();
    if (location.hash !== '#/') location.hash = '#/'; else route();
  }));
}

// ---------------- global event reactions ----------------
bus.on('error', (msg) => { sfx.error(); toast(msg, { type: 'red', icon: '⚠️' }); });
bus.on('bigwin', ({ payout, mult }) => setTimeout(() => bigWinOverlay(payout, mult), 350));
bus.on('ach', ({ data, reward }) => { sfx.levelUp(); toast(`Succès : <b>${data[0]}</b>`, { type: 'gold', icon: data[2], sub: `${data[1]} · +${fmt(reward)}`, ms: 3800 }); });
bus.on('mission', (m) => { sfx.shine(); toast(`Mission terminée !`, { type: 'blue', icon: '🎯', sub: `${missionText(m)} — réclame ta récompense dans Bonus` }); updateBadges(); });
bus.on('vip', ({ tier, reward }) => {
  setTimeout(() => {
    sfx.levelUp();
    confetti({ n: 120, colors: [tier.color, '#fff', '#ffc800'] });
    toast(`Nouveau niveau VIP : <b style="color:${tier.color}">${tier.name}</b>`, { type: 'gold', icon: '⭐', sub: `Bonus +${fmt(reward)} · rakeback ${(tier.rake * 100).toFixed(2)} %`, ms: 4000 });
  }, 600);
});
// Event modals are queued so they never stack on top of each other
const modalQueue = [];
function enqueueModal(fn) { modalQueue.push(fn); pumpModals(); }
function pumpModals() {
  if (!modalQueue.length) return;
  if (document.querySelector('.modal-back, .bigwin, .po')) { setTimeout(pumpModals, 600); return; }
  modalQueue.shift()();
}
bus.on('unlock', (g) => {
  if (!current.startsWith('g/')) setTimeout(route, 50);
  setTimeout(() => enqueueModal(() => {
    sfx.levelUp();
    confetti({ n: 140 });
    const s = sheet(`<div class="center"><div style="width:140px;margin:0 auto 12px;border-radius:10px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.5)">${thumb(g)}</div><div class="chip green">NOUVEAU JEU DÉBLOQUÉ</div><h3 style="margin:10px 0 6px;padding:0">${g.name}</h3><div class="muted" style="font-size:12.5px">Tu as atteint ${fmt(g.unlock)} de fortune !</div><div class="spacer"></div><button class="btn green full lg" data-play>Jouer maintenant</button></div>`, { center: true, onClose: () => setTimeout(pumpModals, 300) });
    $('[data-play]', s.el).onclick = () => { s.close(); S.seenUnlock[g.id] = 2; go('g/' + g.id); };
  }), 900);
});
bus.on('chapter', ({ ch, index }) => {
  setTimeout(() => enqueueModal(() => {
    sfx.levelUp();
    confetti({ n: 200, coins: true });
    const next = CHAPTERS[index];
    sheet(`<div class="center"><div style="font-size:54px">🏆</div><div class="chip gold">CHAPITRE ${index} TERMINÉ</div><h3 style="margin:10px 0 6px;padding:0">${ch.title}</h3><div class="muted" style="font-size:13px">Récompense : <b class="green">+${fmt(ch.reward)}</b></div>${next ? `<div class="panel-2" style="margin-top:14px;text-align:left"><div class="dim" style="font-size:11px">CHAPITRE SUIVANT</div><b>${next.title}</b><div class="muted" style="font-size:12px">Atteins ${fmt(next.goal)} de fortune</div></div>` : '<div class="panel-2" style="margin-top:14px">👑 Tu as terminé l’histoire. Le Vault t’appartient !</div>'}</div>`, { center: true, onClose: () => setTimeout(pumpModals, 300) });
  }), 800);
});

// ---------------- boot ----------------
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.addEventListener('gesturestart', (e) => e.preventDefault());

if (settings.mode && hasSave(settings.mode)) {
  loadMode(settings.mode);
  import('./poke/lobby.js').then((m) => m.refreshMarket());
  startFeed();
  route();
} else {
  renderSplash();
}
