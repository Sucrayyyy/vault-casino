// Offline support: app shell + data precached, skin and card images cached on first view.
const VERSION = 'vault-v7';
const SHELL = [
  './',
  'css/app.css',
  'css/games.css',
  'data/cs.json',
  'data/poke/30th.json',
  'data/poke/base1.json',
  'data/poke/base2.json',
  'data/poke/base5.json',
  'data/poke/cel25.json',
  'data/poke/g1.json',
  'data/poke/index.json',
  'data/poke/me01.json',
  'data/poke/me02.json',
  'data/poke/neo1.json',
  'data/poke/sm12.json',
  'data/poke/sm9.json',
  'data/poke/sv03.5.json',
  'data/poke/sv03.json',
  'data/poke/sv04.5.json',
  'data/poke/sv06.5.json',
  'data/poke/sv07.json',
  'data/poke/sv08.5.json',
  'data/poke/sv08.json',
  'data/poke/sv10.5w.json',
  'data/poke/sv10.json',
  'data/poke/swsh11.json',
  'data/poke/swsh12.5.json',
  'data/poke/swsh12.json',
  'data/poke/swsh4.5.json',
  'data/poke/swsh7.json',
  'data/poke/swsh9.json',
  'data/poke/xy12.json',
  'fonts/inter-latin.woff2',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'index.html',
  'js/audio.js',
  'js/bots.js',
  'js/catalog.js',
  'js/cs/art.js',
  'js/cs/battles.js',
  'js/cs/cases.js',
  'js/cs/data.js',
  'js/cs/lobby.js',
  'js/cs/spinner.js',
  'js/cs/upgrader.js',
  'js/games/blackjack.js',
  'js/games/chicken.js',
  'js/games/crash.js',
  'js/games/dice.js',
  'js/games/hilo.js',
  'js/games/keno.js',
  'js/games/limbo.js',
  'js/games/mines.js',
  'js/games/plinko.js',
  'js/games/roulette.js',
  'js/games/slots.js',
  'js/games/tower.js',
  'js/games/wheel.js',
  'js/icons.js',
  'js/main.js',
  'js/friends.js',
  'js/online-config.js',
  'js/online.js',
  'js/showcase.js',
  'js/mascots.js',
  'js/poke/card.js',
  'js/poke/data.js',
  'js/poke/grading.js',
  'js/poke/lobby.js',
  'js/poke/packs.js',
  'js/rng.js',
  'js/store.js',
  'js/thumbs.js',
  'js/ui.js',
  'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' so the precache never picks up stale files from the HTTP cache
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'vault-art').map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Artwork: cache-first, kept across versions
  if (url.hostname === 'assets.tcgdex.net' || url.hostname.endsWith('steamstatic.com') || url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      caches.open('vault-art').then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res.ok && res.type !== 'opaque') c.put(e.request, res.clone()).catch(() => {});
          return res;
        } catch (err) {
          return new Response('', { status: 504 });
        }
      }),
    );
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // always straight from the network
  // App files: network-first (fresh updates), cache fallback when offline
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
  );
});
