// Friends page + online account sheet.
import { S, settings, bus } from './store.js';
import { $, $$, el, css, money, fmt, fmtShort, fmtX, toast, sheet, confirmSheet, esc, shake, confetti, COIN } from './ui.js';
import { sfx } from './audio.js';
import { icon } from './icons.js';
import { MASCOTS, mascotSVG } from './mascots.js';
import { onlineReady, linked, register, signIn, signOut, link, search, friendRequest, friendRespond, friendRemove, friends, sync, publicStats } from './online.js';

css('friends', `
.fr-me { display: flex; align-items: center; gap: 12px; }
.fr-me .pz { font-size: 20px; font-weight: 900; }
.fr-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; background: rgba(37, 68, 90, .55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); text-align: left; width: 100%; }
.fr-row .tx { flex: 1; min-width: 0; }
.fr-row .tx b { display: flex; align-items: center; gap: 6px; font-size: 14px; }
.fr-row .tx small { display: block; color: var(--txt2); font-size: 11.5px; margin-top: 2px; font-weight: 600; }
.fr-rank { width: 24px; text-align: center; font-weight: 900; color: var(--txt3); }
.fr-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--txt3); flex: none; }
.fr-dot.on { background: var(--green); box-shadow: 0 0 8px var(--green); }
.fr-top { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.fr-top > div { border-radius: 10px; background: rgba(10,26,40,.5); padding: 6px; text-align: center; font-size: 11px; font-weight: 800; }
.fr-top img { width: 100%; aspect-ratio: 63/88; object-fit: contain; border-radius: 6px; }
.fr-top img.sk { aspect-ratio: 1.3; }
`);

const mascotOf = (id) => MASCOTS.find((m) => m.id === id) || MASCOTS[0];
const onlineNow = (t) => Date.now() - new Date(t).getTime() < 5 * 60000;
const seen = (t) => {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
  if (m < 5) return 'En ligne';
  if (m < 60) return `Vu il y a ${m} min`;
  if (m < 1440) return `Vu il y a ${Math.round(m / 60)} h`;
  return `Vu il y a ${Math.round(m / 1440)} j`;
};

// ---------- account sheet (create / connect) ----------
export function accountSheet(onDone, { pseudo = settings.name, fromLogin = false } = {}) {
  const s = sheet(`<h3>${icon('wifi', 20)} Compte en ligne</h3>
    <div class="muted" style="font-size:12.5px;line-height:1.5;margin-bottom:12px">Un pseudo unique pour que tes amis puissent t’ajouter, et ta partie sauvegardée dans le cloud. Le code protège ton pseudo : garde-le pour te reconnecter sur un autre téléphone.</div>
    <div class="col" style="gap:8px">
      <div class="field"><div class="in">${icon('user', 16)}<input data-p maxlength="16" placeholder="Pseudo" value="${esc(pseudo || '')}" autocapitalize="off" autocomplete="username"></div></div>
      <div class="field"><div class="in">${icon('key', 16)}<input data-c type="password" maxlength="64" placeholder="Code secret (4 caractères min.)" autocomplete="current-password"></div></div>
      <button class="btn green full lg" data-new>Créer mon compte</button>
      <button class="btn full" data-old>J’ai déjà un compte : me connecter</button>
    </div>`, { center: true });
  const P = $('[data-p]', s.el), C = $('[data-c]', s.el);
  const busy = (b) => $$('button', s.el).forEach((x) => (x.disabled = b));
  const run = async (fn) => {
    busy(true);
    try {
      const res = await fn(P.value.trim(), C.value);
      sfx.levelUp(); confetti({ n: 80, y: 0.3 });
      s.close();
      onDone?.(res);
    } catch (e) {
      sfx.error(); shake(s.el); toast(e.message, { type: 'red', icon: icon('warn') });
    }
    busy(false);
  };
  $('[data-new]', s.el).onclick = () => run(register);
  $('[data-old]', s.el).onclick = () => run(signIn);
  C.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(signIn); });
  if (!fromLogin) setTimeout(() => (pseudo ? C : P).focus(), 250);
}

// ---------- friends page ----------
export function mount(page) {
  let alive = true, timer;
  if (!onlineReady()) {
    page.innerHTML = `<div class="h1">Amis</div><div class="empty"><div class="e">${icon('wifi', 36)}</div>Le mode en ligne n’est pas encore activé sur cette version de l’app.</div>`;
    return;
  }
  if (!linked()) {
    page.innerHTML = `<div class="h1">Amis</div><div class="panel center" style="margin-top:14px"><div style="display:grid;place-items:center;color:var(--txt2)">${icon('users', 40)}</div><b style="display:block;font-size:16px;margin-top:8px">Joue avec tes potes</b><div class="muted" style="font-size:12.5px;margin:6px 0 14px;line-height:1.5">Crée ton compte en ligne pour réserver ton pseudo, ajouter des amis et comparer vos fortunes.</div><button class="btn green full lg" data-acc>Créer ou relier mon compte</button></div>`;
    $('[data-acc]', page).onclick = () => accountSheet((res) => { link(res); sync(true); draw(); });
    return () => {};
  }
  let data = { friends: [], incoming: [], outgoing: [] };
  let q = '', results = [];
  function draw() {
    if (!alive) return;
    if (!linked()) { mount(page); return; }
    const me = { pseudo: settings.online.pseudo };
    const ranking = [...data.friends, { pseudo: me.pseudo, me: true, stats: publicStats(), last_seen: new Date().toISOString() }]
      .sort((a, b) => (b.stats?.fortune || 0) - (a.stats?.fortune || 0));
    page.innerHTML = `
      <div class="h1">Amis</div>
      <div class="panel fr-me" style="margin-top:12px">${mascotSVG(mascotOf(settings.mascot), 48, '')}<div class="grow"><div class="dim" style="font-size:11px">TON PSEUDO</div><div class="pz">${esc(me.pseudo)}</div><div class="muted" style="font-size:11.5px">Donne-le à tes amis pour qu’ils t’ajoutent</div></div></div>
      <div class="sec"><div class="sec-head"><div class="h2">${icon('plus', 18)} Ajouter un ami</div></div>
        <div class="field"><div class="in">${icon('search', 16)}<input data-q placeholder="Pseudo de ton ami" value="${esc(q)}" autocapitalize="off" autocomplete="off"></div></div>
        <div class="col" data-res style="margin-top:8px"></div></div>
      ${data.incoming.length ? `<div class="sec"><div class="sec-head"><div class="h2">Demandes reçues</div><span class="chip red">${data.incoming.length}</span></div><div class="col">${data.incoming.map((f) => `<div class="fr-row">${mascotSVG(mascotOf(f.stats?.mascot), 36, '')}<div class="tx"><b>${esc(f.pseudo)}</b><small>${money(f.stats?.fortune || 0)}</small></div><button class="btn sm green" data-acc="${esc(f.pseudo)}">Accepter</button><button class="btn sm" data-ref="${esc(f.pseudo)}">${icon('close', 14)}</button></div>`).join('')}</div></div>` : ''}
      <div class="sec"><div class="sec-head"><div class="h2">${icon('trophy', 18)} Classement entre amis</div><button class="more" data-reload>${icon('refresh', 14)} Actualiser</button></div>
        <div class="col">${ranking.map((f, i) => `<button class="fr-row" ${f.me ? '' : `data-f="${esc(f.pseudo)}"`} style="${f.me ? 'box-shadow:inset 0 0 0 2px var(--green)' : ''}"><span class="fr-rank">${i + 1}</span>${mascotSVG(mascotOf(f.me ? settings.mascot : f.stats?.mascot), 38, '')}<div class="tx"><b>${esc(f.pseudo)}${f.me ? ' <span class="chip green">toi</span>' : ''}</b><small>${f.me ? 'Toi' : `<span class="fr-dot ${onlineNow(f.last_seen) ? 'on' : ''}" style="display:inline-block;margin-right:4px"></span>${seen(f.last_seen)}`}${f.stats?.vip ? ` · VIP <span style="color:${f.stats.vipColor}">${esc(f.stats.vip)}</span>` : ''}</small></div><b>${money(f.stats?.fortune || 0)}</b></button>`).join('')}
        ${data.friends.length ? '' : '<div class="dim center" style="font-size:12px;padding:8px">Pas encore d’amis : cherche leur pseudo ci-dessus.</div>'}</div></div>
      ${data.outgoing.length ? `<div class="sec"><div class="sec-head"><div class="h2">Demandes envoyées</div></div><div class="col">${data.outgoing.map((f) => `<div class="fr-row">${mascotSVG(mascotOf(f.stats?.mascot), 32, '')}<div class="tx"><b>${esc(f.pseudo)}</b><small>En attente</small></div><button class="btn sm" data-cancel="${esc(f.pseudo)}">Annuler</button></div>`).join('')}</div></div>` : ''}
      <div class="sec"><button class="btn ghost full" data-out>Se déconnecter du compte en ligne</button></div>`;
    const qi = $('[data-q]', page);
    let qt;
    qi.oninput = () => { q = qi.value; clearTimeout(qt); qt = setTimeout(runSearch, 300); };
    if (q) { qi.focus(); qi.setSelectionRange(q.length, q.length); }
    drawResults();
    $('[data-reload]', page).onclick = () => { sfx.click(); load(); };
    $$('[data-acc]', page).forEach((b) => (b.onclick = () => act(() => friendRespond(b.dataset.acc, true), `${b.dataset.acc} est maintenant ton ami`)));
    $$('[data-ref]', page).forEach((b) => (b.onclick = () => act(() => friendRespond(b.dataset.ref, false))));
    $$('[data-cancel]', page).forEach((b) => (b.onclick = () => act(() => friendRemove(b.dataset.cancel))));
    $$('[data-f]', page).forEach((b) => (b.onclick = () => openFriend(data.friends.find((f) => f.pseudo === b.dataset.f))));
    $('[data-out]', page).onclick = async () => {
      if (await confirmSheet('Se déconnecter ?', 'Ta partie reste sur ce téléphone. Tu pourras te reconnecter avec ton pseudo et ton code.', 'Se déconnecter', 'red')) { await sync(true); signOut(); mount(page); }
    };
  }
  function drawResults() {
    const box = $('[data-res]', page);
    if (!box) return;
    const known = new Set([...data.friends, ...data.outgoing, ...data.incoming].map((f) => f.pseudo.toLowerCase()));
    box.innerHTML = results.map((f) => `<div class="fr-row">${mascotSVG(mascotOf(f.stats?.mascot), 32, '')}<div class="tx"><b>${esc(f.pseudo)}</b><small>${money(f.stats?.fortune || 0)}</small></div>${known.has(f.pseudo.toLowerCase()) ? '<span class="chip">Déjà ajouté</span>' : `<button class="btn sm green" data-add="${esc(f.pseudo)}">${icon('plus', 14)} Ajouter</button>`}</div>`).join('') || (q.trim().length >= 2 ? '<div class="dim" style="font-size:12px;padding:4px 2px">Aucun joueur trouvé</div>' : '');
    $$('[data-add]', box).forEach((b) => (b.onclick = () => act(async () => {
      const r = await friendRequest(b.dataset.add);
      return r;
    }, null, (r) => toast(r.status === 'accepted' ? `${b.dataset.add} est maintenant ton ami` : `Demande envoyée à ${b.dataset.add}`, { icon: icon('users') }))));
  }
  async function runSearch() {
    if (q.trim().length < 2) { results = []; drawResults(); return; }
    try { results = await search(q.trim()); } catch (e) { results = []; }
    drawResults();
  }
  async function act(fn, msg, after) {
    try { const r = await fn(); sfx.click(); if (msg) { sfx.levelUp(); toast(msg, { icon: icon('users') }); } after?.(r); await load(); }
    catch (e) { sfx.error(); toast(e.message, { type: 'red', icon: icon('warn') }); }
  }
  async function load() {
    try { data = await friends(); bus.emit('friends', data); } catch (e) { toast(e.message, { type: 'red', icon: icon('warn') }); }
    if (q) await runSearch();
    draw();
  }
  function openFriend(f) {
    if (!f) return;
    const st = f.stats || {};
    const s = sheet(`<div class="row" style="gap:12px;margin-bottom:12px">${mascotSVG(mascotOf(st.mascot), 56, '')}<div class="grow"><h3 style="margin:0;padding:0">${esc(f.pseudo)}</h3><div class="muted" style="font-size:12px"><span class="fr-dot ${onlineNow(f.last_seen) ? 'on' : ''}" style="display:inline-block;margin-right:4px"></span>${seen(f.last_seen)} · ${st.mode === 'story' ? 'Mode histoire' : 'Bac à sable'}</div></div></div>
      <div class="stat-grid">
        <div class="stat"><small>Fortune</small><b>${money(st.fortune || 0)}</b></div>
        <div class="stat"><small>VIP</small><b style="color:${st.vipColor || '#fff'}">${esc(st.vip || '—')}</b></div>
        <div class="stat"><small>Plus gros gain</small><b>${money(st.bestWin || 0)}</b></div>
        <div class="stat"><small>Meilleur multi.</small><b>${fmtX(st.bestMult || 0)}</b></div>
        <div class="stat"><small>Caisses / boosters</small><b>${st.cases || 0} / ${st.packs || 0}</b></div>
        <div class="stat"><small>Succès</small><b>${st.ach || 0}</b></div>
      </div>
      ${st.top?.length ? `<div class="label" style="margin-top:12px">Ses plus belles pièces</div><div class="fr-top" data-top></div>` : ''}
      <div class="spacer"></div><button class="btn ghost full" data-rm>Retirer de mes amis</button>`);
    if (st.top?.length) fillTop($('[data-top]', s.el), st.top);
    $('[data-rm]', s.el).onclick = async () => {
      if (await confirmSheet(`Retirer ${esc(f.pseudo)} ?`, 'Vous ne verrez plus vos fortunes respectives.', 'Retirer', 'red')) { s.close(); act(() => friendRemove(f.pseudo)); }
    };
  }
  draw();
  load();
  timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
  return () => { alive = false; clearInterval(timer); };
}

async function fillTop(box, top) {
  const parts = await Promise.all(top.map(async (t) => {
    if (t.kind === 'skin') {
      const cs = await import('./cs/data.js');
      const it = cs.ITEMS[t.k];
      return it ? `<div><img class="sk" src="${cs.imgURL(it.img, 256)}" alt=""><div>${esc(it.n)}</div>${fmt(t.price)}</div>` : '';
    }
    const pk = await import('./poke/data.js');
    try {
      const set = await pk.loadSet(t.set);
      const c = set.byLid[t.lid];
      return c ? `<div><img crossorigin="anonymous" src="${pk.cardImg(set, c, 'low')}" alt=""><div>${esc(c.name)}</div>${fmt(t.price)}</div>` : '';
    } catch (e) { return ''; }
  }));
  box.innerHTML = parts.join('');
}
