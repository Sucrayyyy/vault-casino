// AI players: live bet feed, opponents for battles, leaderboard.
import { bus, S, netWorth } from './store.js';
import { GAMES, gameById } from './catalog.js';

export const BOT_NAMES = [
  'xXSniperXx', 'LuckyLuke', 'MoonBoy', 'Kaïros', 'NeoGamb', 'Shadow_FR', 'BigBlind', 'Zéphyr', 'CryptoKing', 'Mamba', 'Pixel', 'R4ven',
  'LaFouine', 'Tchoupi', 'DiamondHands', 'Gigachad', 'Nyx', 'Okami', 'Valkyrie', 'Sushi', 'Biscotte', 'TurboMax', 'K1ngSlayer', 'Nova',
  'Bastos', 'Freya', 'Ragnar', 'Mister_V', 'Cobra', 'Jinx', 'LeBaron', 'Sakura', 'Wolfy', 'YoloSwag', 'Phantom', 'Hermès', 'Atlas',
  'Kraken', 'Panda', 'Loki', 'Mirage', 'Bandit', 'Echo', 'Flash', 'Gecko', 'Hydra', 'Iris', 'Jade', 'Karma', 'Lynx', 'Maverick',
];
export const AVATAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];

export function avatar(name, size = 28) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const col = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:${col};display:inline-grid;place-items:center;font-size:${size * 0.42}px;font-weight:900;color:#fff;flex:none;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)">${name[0].toUpperCase()}</span>`;
}

export const randomBot = (exclude = []) => {
  const pool = BOT_NAMES.filter((n) => !exclude.includes(n));
  return pool[Math.floor(Math.random() * pool.length)];
};

// Log-normal-ish bet size
function botBet() {
  const r = Math.random();
  if (r < 0.55) return +(Math.random() * 20 + 0.2).toFixed(2);
  if (r < 0.85) return +(Math.random() * 300 + 20).toFixed(2);
  if (r < 0.97) return +(Math.random() * 4000 + 300).toFixed(2);
  return +(Math.random() * 50000 + 4000).toFixed(2);
}
function botMult() {
  const f = Math.random();
  if (f < 0.48) return 0;
  const m = Math.floor(99 / (1 - Math.random() * 0.995)) / 100;
  return Math.max(1.01, m);
}

const feed = [];
export const getFeed = () => feed;

let timer = null;
export function startFeed() {
  if (timer) return;
  const tick = () => {
    const g = GAMES[Math.floor(Math.random() * 13)];
    const bet = botBet();
    const mult = botMult();
    const entry = { name: randomBot(), game: g.id, bet, mult, payout: +(bet * mult).toFixed(2), t: Date.now() };
    feed.unshift(entry);
    feed.length = Math.min(feed.length, 30);
    bus.emit('feed', entry);
    timer = setTimeout(tick, 700 + Math.random() * 1800);
  };
  for (let i = 0; i < 12; i++) {
    const g = GAMES[Math.floor(Math.random() * 13)], bet = botBet(), mult = botMult();
    feed.push({ name: randomBot(), game: g.id, bet, mult, payout: +(bet * mult).toFixed(2), t: Date.now() });
  }
  tick();
  bus.on('bet', (b) => {
    const entry = { name: 'Toi', game: b.game, bet: b.bet, mult: b.mult, payout: b.payout, t: Date.now(), me: true };
    feed.unshift(entry); feed.length = Math.min(feed.length, 30);
    bus.emit('feed', entry);
  });
}

// Leaderboard: deterministic bots whose fortune slowly grows with time.
export function leaderboard() {
  const days = (Date.now() - (S?.created || Date.now())) / 86400000;
  const story = S?.mode === 'story';
  const rows = BOT_NAMES.slice(0, 30).map((name, i) => {
    let h = 0;
    for (const c of name) h = (h * 131 + c.charCodeAt(0)) >>> 0;
    const base = story ? Math.pow(10, 2.3 + (h % 1000) / 1000 * 6.2) : Math.pow(10, 4.2 + (h % 1000) / 1000 * 5.4);
    const grow = 1 + days * (0.02 + (h % 7) * 0.012);
    return { name, worth: Math.round(base * grow) };
  });
  rows.push({ name: 'Toi', worth: netWorth(), me: true });
  rows.sort((a, b) => b.worth - a.worth);
  return rows;
}

export const gameName = (id) => gameById[id]?.name || id;
