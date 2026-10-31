// Save data, virtual economy, VIP, missions, achievements and story progression.
import { Fair, sha256Hex } from './rng.js';
import { GAMES, CHAPTERS, VIP, gameById } from './catalog.js';

const KEY = (m) => `vault.save.${m}`;
const SKEY = 'vault.settings';

// ---------- tiny event bus ----------
const handlers = {};
export const bus = {
  on(ev, fn) { (handlers[ev] ||= new Set()).add(fn); return () => handlers[ev].delete(fn); },
  emit(ev, data) { handlers[ev]?.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
};

// ---------- settings ----------
export const settings = Object.assign(
  { sound: true, music: false, haptics: true, mode: null, fast: false, name: 'Toi' },
  safeParse(localStorage.getItem(SKEY)),
);
export function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {} }

function safeParse(s) { try { return JSON.parse(s) || {}; } catch (e) { return {}; } }

// ---------- god mode (cheats, device-local, password protected) ----------
const GOD_HASH = '4288f6a2dd1421ae5f952d20cd71f9477530b963889d1a8cd189d4f2973f9314';
export const cheats = Object.assign({ on: false, luck: 0, god: 1, hits: 1, rare: 1, payout: 1, safeCrash: false }, settings.cheats || {});
export const checkGodPassword = (pw) => sha256Hex('vault:' + pw) === GOD_HASH;
export function saveCheats() { settings.cheats = { ...cheats }; saveSettings(); bus.emit('cheats'); }
// % of losing outcomes that get re-rolled
export const luckRoll = () => cheats.on && cheats.luck > 0 && Math.random() * 100 < cheats.luck;
// Re-roll a generated outcome while it is a loss (only when god mode luck is on)
export function lucky(gen, good, tries = 14) {
  let r = gen();
  if (!cheats.on || cheats.luck <= 0) return r;
  for (let i = 0; i < tries && !good(r); i++) { if (Math.random() * 100 >= cheats.luck) break; r = gen(); }
  return r;
}
export const cheatMul = (k) => (cheats.on ? cheats[k] || 1 : 1);

// ---------- save ----------
export const START = { sandbox: 10000, story: 100 };

function fresh(mode) {
  return {
    v: 2, mode, created: Date.now(),
    balance: START[mode], peak: START[mode],
    stats: { wagered: 0, bets: 0, wins: 0, profit: 0, bestWin: 0, bestMult: 0, refills: 0, cases: 0, packs: 0, perGame: {} },
    rake: 0, vip: 0,
    daily: { last: 0, streak: 0 },
    faucet: { last: 0 },
    missions: { day: '', list: [] },
    ach: {},
    chapter: 0,
    seenUnlock: {},
    inv: { skins: [], cards: [] },
    dex: {},
    bets: {},
    fair: {},
    uid: 1,
  };
}

export let S = null;
export let fair = null;

export function hasSave(mode) { return !!localStorage.getItem(KEY(mode)); }
export function peekSave(mode) { return safeParse(localStorage.getItem(KEY(mode))); }

export function loadMode(mode, reset = false) {
  let data = reset ? null : safeParse(localStorage.getItem(KEY(mode)));
  if (!data || !data.v) data = fresh(mode);
  // forward-compat defaults
  const def = fresh(mode);
  for (const k in def) if (data[k] === undefined) data[k] = def[k];
  for (const k in def.stats) if (data.stats[k] === undefined) data.stats[k] = def.stats[k];
  // v2: inventory moved to real CS skins / real TCG cards. Old procedural items are refunded.
  if ((data.v || 1) < 2) {
    const oldSkins = data.inv.skins.filter((x) => x.k == null);
    const oldCards = data.inv.cards.filter((x) => (x.kind === 'card' && !x.lid) || (x.kind === 'sealed' && !x.v2));
    const refund = round2([...oldSkins, ...oldCards].reduce((a, b) => a + (b.price || 0), 0));
    data.inv.skins = data.inv.skins.filter((x) => x.k != null);
    data.inv.cards = data.inv.cards.filter((x) => !oldCards.includes(x));
    data.dex = {};
    data.balance = round2(data.balance + refund);
    data.v = 2;
    if (refund > 0) setTimeout(() => bus.emit('migrated', refund), 1200);
  }
  S = data;
  fair = new Fair(S.fair);
  settings.mode = mode;
  saveSettings();
  ensureMissions();
  saveNow();
  bus.emit('balance', { delta: 0 });
  return S;
}

let saveT = null;
export function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 400); }
export function saveNow() {
  if (!S) return;
  try { localStorage.setItem(KEY(S.mode), JSON.stringify(S)); } catch (e) { console.warn('save failed', e); }
}
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

export const round2 = (x) => Math.round(x * 100) / 100;
export const isStory = () => S?.mode === 'story';
export const uid = () => `${Date.now().toString(36)}${(S.uid++).toString(36)}`;

// ---------- worth ----------
export function invValue() {
  let v = 0;
  for (const s of S.inv.skins) v += s.price;
  for (const c of S.inv.cards) v += c.price;
  return round2(v);
}
export const netWorth = () => round2(S.balance + invValue());

// ---------- unlocks / story ----------
export function isUnlocked(id) {
  if (!isStory()) return true;
  const g = gameById[id];
  return !g || S.peak >= g.unlock;
}

function checkProgress() {
  const nw = netWorth();
  if (nw > S.peak) {
    const before = S.peak;
    S.peak = nw;
    if (isStory()) {
      for (const g of GAMES) {
        if (g.unlock > before && g.unlock <= nw && !S.seenUnlock[g.id]) {
          S.seenUnlock[g.id] = 1;
          bus.emit('unlock', g);
        }
      }
    }
  }
  if (isStory()) {
    while (S.chapter < CHAPTERS.length && S.peak >= CHAPTERS[S.chapter].goal) {
      const ch = CHAPTERS[S.chapter];
      S.chapter++;
      S.balance = round2(S.balance + ch.reward);
      bus.emit('chapter', { ch, index: S.chapter });
    }
  }
  ach('nw_10k', nw >= 1e4); ach('nw_100k', nw >= 1e5); ach('nw_1m', nw >= 1e6);
  ach('nw_100m', nw >= 1e8); ach('nw_1b', nw >= 1e9);
}

// ---------- wallet ----------
export function canAfford(x) { return x > 0 && x <= S.balance + 1e-9; }

export function placeBet(game, amount) {
  amount = round2(amount);
  if (!(amount > 0)) { bus.emit('error', 'Mise invalide'); return false; }
  if (!canAfford(amount)) { bus.emit('error', 'Solde insuffisant'); return false; }
  S.balance = round2(S.balance - amount);
  S.stats.wagered += amount;
  S.stats.bets++;
  const pg = (S.stats.perGame[game] ||= { bets: 0, wagered: 0, profit: 0, best: 0 });
  pg.bets++; pg.wagered += amount;
  S.rake += amount * VIP[S.vip].rake;
  S.bets[game] = amount;
  const vi = vipIndex(S.stats.wagered);
  if (vi > S.vip) {
    for (let i = S.vip + 1; i <= vi; i++) {
      const reward = round2(VIP[i].at * 0.01);
      S.balance = round2(S.balance + reward);
      bus.emit('vip', { tier: VIP[i], reward });
    }
    S.vip = vi;
  }
  mission('bets', 1); mission('play', 1, game); mission('wager', amount);
  ach('first_bet', true); ach('bets_100', S.stats.bets >= 100); ach('bets_1000', S.stats.bets >= 1000);
  bus.emit('balance', { delta: -amount });
  save();
  return true;
}

// payout = total amount returned (0 on loss). mult informational.
export function settle(game, bet, payout, opts = {}) {
  if (cheats.on && cheats.payout > 1 && payout > bet && !opts.noCredit) payout = bet + (payout - bet) * cheats.payout;
  payout = round2(payout);
  const mult = opts.mult ?? (bet > 0 ? payout / bet : 0);
  const profit = round2(payout - bet);
  if (!opts.noCredit) S.balance = round2(S.balance + payout);
  S.stats.profit = round2(S.stats.profit + profit);
  const pg = (S.stats.perGame[game] ||= { bets: 0, wagered: 0, profit: 0, best: 0 });
  pg.profit = round2(pg.profit + profit);
  if (payout > bet) {
    S.stats.wins++;
    mission('wins', 1);
    if (profit > S.stats.bestWin) S.stats.bestWin = profit;
  }
  if (mult > pg.best) pg.best = mult;
  if (mult > S.stats.bestMult) S.stats.bestMult = mult;
  if (mult >= 2) mission('mult', 1, mult);
  ach('win_x10', mult >= 10); ach('win_x100', mult >= 100); ach('win_x1000', mult >= 1000);
  checkProgress();
  bus.emit('balance', { delta: payout });
  bus.emit('bet', { game, bet, payout, mult, me: true });
  if (payout > 0 && mult >= 10 && profit >= Math.max(netWorth() * 0.02, 5) && !opts.noBig) bus.emit('bigwin', { payout, mult, game });
  save();
}

export function credit(amount, reason) {
  amount = round2(amount);
  S.balance = round2(S.balance + amount);
  checkProgress();
  bus.emit('balance', { delta: amount, reason });
  save();
}
export function debit(amount) {
  amount = round2(amount);
  if (!canAfford(amount)) { bus.emit('error', 'Solde insuffisant'); return false; }
  S.balance = round2(S.balance - amount);
  bus.emit('balance', { delta: -amount });
  save();
  return true;
}
// Purchases that should count as wagering (cases, boosters…)
export function spend(game, amount) { return placeBet(game, amount); }

// Item added to inventory: track worth
export function addItems(kind, items) {
  S.inv[kind].unshift(...items);
  checkProgress();
  bus.emit('inv', kind);
  save();
}
export function removeItems(kind, ids) {
  const set = new Set(ids);
  const removed = S.inv[kind].filter((x) => set.has(x.id));
  S.inv[kind] = S.inv[kind].filter((x) => !set.has(x.id));
  bus.emit('inv', kind);
  save();
  return removed;
}
export function sellItems(kind, ids, rate = 1) {
  const removed = removeItems(kind, ids);
  const total = round2(removed.reduce((s, x) => s + x.price, 0) * rate);
  if (total > 0) credit(total, 'sell');
  return total;
}

export function track(type, n = 1) {
  if (type === 'case') { S.stats.cases += n; mission('cases', n); }
  if (type === 'pack') { S.stats.packs += n; mission('packs', n); }
  save();
}

// ---------- VIP ----------
export function vipIndex(w) {
  let i = 0;
  for (let k = 0; k < VIP.length; k++) if (w >= VIP[k].at) i = k;
  return i;
}
export function claimRake() {
  const r = round2(S.rake);
  if (r < 0.01) return 0;
  S.rake = 0;
  credit(r, 'rake');
  return r;
}

// ---------- bonuses ----------
const DAY = 86400000;
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const STREAK = [1, 1.5, 2, 3, 4, 5, 8];
export function dailyBase() { return Math.max(isStory() ? 40 : 1000, netWorth() * 0.01); }
export function dailyState() {
  const last = S.daily.last;
  const can = dayKey(last) !== dayKey();
  const yesterday = dayKey(Date.now() - DAY);
  const streak = !last ? 0 : (dayKey(last) === dayKey() || dayKey(last) === yesterday) ? S.daily.streak : 0;
  const nextDay = can ? (streak % 7) + 1 : streak;
  return { can, streak, nextDay, amount: round2(dailyBase() * STREAK[(nextDay - 1) % 7]), table: STREAK };
}
export function claimDaily() {
  const st = dailyState();
  if (!st.can) return 0;
  S.daily = { last: Date.now(), streak: st.nextDay };
  ach('daily7', st.nextDay === 7);
  credit(st.amount, 'daily');
  return st.amount;
}

export function faucetCooldown() { return netWorth() < 1 ? 3 * 60000 : 15 * 60000; }
export function faucetAmount() { return round2(Math.max(isStory() ? 20 : 250, netWorth() * 0.004)); }
export function faucetLeft() { return Math.max(0, S.faucet.last + faucetCooldown() - Date.now()); }
export function claimFaucet() {
  if (faucetLeft() > 0) return 0;
  const a = faucetAmount();
  S.faucet.last = Date.now();
  credit(a, 'faucet');
  return a;
}
export function refill() {
  if (isStory()) return 0;
  S.stats.refills++;
  credit(10000, 'refill');
  return 10000;
}

// ---------- missions ----------
const MISSION_POOL = [
  () => ({ t: 'bets', n: pick([20, 30, 50]), txt: (m) => `Place ${m.n} paris` }),
  () => ({ t: 'wins', n: pick([10, 15, 25]), txt: (m) => `Gagne ${m.n} paris` }),
  () => { const g = pick(['mines', 'dice', 'plinko', 'limbo', 'crash', 'chicken', 'blackjack', 'wheel', 'hilo', 'keno', 'roulette', 'tower', 'slots'].filter(isUnlocked)); return { t: 'play', g, n: pick([10, 15, 20]), txt: (m) => `Joue ${m.n} parties de ${gameById[m.g].name}` }; },
  () => ({ t: 'mult', x: pick([5, 10, 25, 50]), n: 1, txt: (m) => `Décroche un multiplicateur ≥ ×${m.x}` }),
  () => ({ t: 'wager', n: Math.round(Math.max(isStory() ? 200 : 5000, netWorth() * 0.5)), txt: (m) => `Mise un total de ${m.n.toLocaleString('fr-FR')}` }),
  () => isUnlocked('cases') ? { t: 'cases', n: pick([3, 5, 10]), txt: (m) => `Ouvre ${m.n} caisses CS` } : null,
  () => isUnlocked('boosters') ? { t: 'packs', n: pick([3, 5, 10]), txt: (m) => `Ouvre ${m.n} boosters Pokémon` } : null,
];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

export function ensureMissions() {
  const key = dayKey();
  if (S.missions.day === key && S.missions.list.length) return;
  const list = [];
  const used = new Set();
  let guard = 0;
  while (list.length < 3 && guard++ < 50) {
    const m = pick(MISSION_POOL)();
    if (!m || used.has(m.t + (m.g || ''))) continue;
    used.add(m.t + (m.g || ''));
    m.p = 0; m.done = false; m.claimed = false;
    m.reward = round2(Math.max(isStory() ? 30 : 500, netWorth() * 0.008) * (1 + list.length * 0.5));
    list.push(m);
  }
  S.missions = { day: key, list };
}
export const missionText = (m) => MISSION_POOL_TEXT[m.t](m);
const MISSION_POOL_TEXT = {
  bets: (m) => `Place ${m.n} paris`,
  wins: (m) => `Gagne ${m.n} paris`,
  play: (m) => `Joue ${m.n} parties de ${gameById[m.g]?.name || m.g}`,
  mult: (m) => `Décroche un multiplicateur ≥ ×${m.x}`,
  wager: (m) => `Mise un total de ${Math.round(m.n).toLocaleString('fr-FR')}`,
  cases: (m) => `Ouvre ${m.n} caisses CS`,
  packs: (m) => `Ouvre ${m.n} boosters Pokémon`,
};

function mission(t, amount, extra) {
  if (!S) return;
  for (const m of S.missions.list) {
    if (m.done || m.t !== t) continue;
    if (t === 'play' && m.g !== extra) continue;
    if (t === 'mult' && extra < m.x) continue;
    m.p = Math.min(m.n, m.p + amount);
    if (m.p >= m.n) { m.done = true; bus.emit('mission', m); }
  }
}
export function claimMission(i) {
  const m = S.missions.list[i];
  if (!m || !m.done || m.claimed) return 0;
  m.claimed = true;
  credit(m.reward, 'mission');
  return m.reward;
}

// ---------- achievements ----------
export const ACH = {
  first_bet: ['Premier pari', 'Place ton tout premier pari', 'dice'],
  bets_100: ['Régulier', '100 paris placés', 'chart'],
  bets_1000: ['Accro', '1 000 paris placés', 'flame'],
  win_x10: ['×10 !', 'Gagne un pari à ×10 ou plus', 'bolt'],
  win_x100: ['×100 !!', 'Gagne un pari à ×100 ou plus', 'sparkle'],
  win_x1000: ['×1000 !!!', 'Gagne un pari à ×1 000 ou plus', 'flame'],
  nw_10k: ['Cinq chiffres', 'Atteins 10 000 de fortune', 'coins'],
  nw_100k: ['Six chiffres', 'Atteins 100 000 de fortune', 'coins'],
  nw_1m: ['Millionnaire', 'Atteins 1 000 000 de fortune', 'chest'],
  nw_100m: ['Magnat', 'Atteins 100 000 000 de fortune', 'gem'],
  nw_1b: ['Milliardaire', 'Atteins 1 000 000 000 de fortune', 'crown'],
  bj: ['Blackjack naturel', 'Reçois un blackjack d’entrée', 'spade'],
  gold: ['Lame dorée', 'Obtiens un objet ★ rare dans une caisse', 'swords'],
  covert: ['Couvert', 'Obtiens un objet Covert (rouge)', 'star'],
  sir: ['Illustration spéciale', 'Tire une carte SIR ou Hyper Rare', 'sparkle'],
  chicken: ['Le poulet a traversé', 'Atteins la dernière voie au Poulet Express', 'egg'],
  battle: ['Gladiateur', 'Remporte une Case Battle', 'swords'],
  upgrade_low: ['Miracle', 'Réussis un upgrade à moins de 10 %', 'percent'],
  jet_100: ['Pilote de légende', 'Encaisse à ×100 ou plus au Jet', 'plane'],
  daily7: ['Fidèle', 'Récupère le 7e jour du bonus quotidien', 'calendar'],
  psa10: ['Gemme parfaite', 'Obtiens une note PSA 10', 'gem'],
  godpack: ['God pack', 'Ouvre un god pack (1 chance sur 2 000)', 'crown'],
  mines_big: ['Démineur', 'Révèle 20 gemmes ou plus en une partie de Mines', 'bomb'],
};
export function ach(id, cond) {
  if (!S || !cond || S.ach[id]) return;
  S.ach[id] = Date.now();
  const reward = round2(Math.max(isStory() ? 25 : 500, netWorth() * 0.005));
  S.balance = round2(S.balance + reward);
  bus.emit('ach', { id, data: ACH[id], reward });
  bus.emit('balance', { delta: reward });
  save();
}

export function rememberBet(game, def) { return S.bets[game] ?? def; }
