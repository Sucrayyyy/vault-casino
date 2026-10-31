// Online accounts, friends and cloud save (Supabase RPC functions from supabase/schema.sql).
import CONFIG from './online-config.js';
import { S, settings, saveSettings, netWorth, saveNow, bus } from './store.js';
import { VIP } from './catalog.js';

export const onlineReady = () => !!(CONFIG.url && CONFIG.key);
export const linked = () => !!settings.online?.token;

const MESSAGES = {
  pseudo_invalide: 'Pseudo invalide (2 à 20 lettres ou chiffres)',
  code_trop_court: 'Le code doit faire au moins 4 caractères',
  pseudo_pris: 'Ce pseudo est déjà pris',
  pseudo_inconnu: 'Aucun joueur avec ce pseudo',
  code_faux: 'Code incorrect',
  bloque: 'Trop d’essais : réessaie dans 10 minutes',
  session: 'Session expirée, reconnecte-toi',
  toi_meme: 'Tu ne peux pas t’ajouter toi-même',
  sauvegarde_trop_grosse: 'Sauvegarde trop volumineuse pour le cloud',
};

async function rpc(fn, args) {
  if (!onlineReady()) throw new Error('Mode en ligne pas encore configuré');
  let r;
  try {
    r = await fetch(`${CONFIG.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: CONFIG.key, Authorization: `Bearer ${CONFIG.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch (e) { throw new Error('Pas de connexion internet'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || 'Erreur du serveur');
  if (j && j.error) {
    if (j.error === 'session') { delete settings.online; saveSettings(); bus.emit('online'); }
    throw new Error(MESSAGES[j.error] || j.error);
  }
  return j;
}
const token = () => settings.online?.token;

export async function register(pseudo, pin) { return rpc('vault_register', { p_pseudo: pseudo, p_pin: pin }); }
export async function signIn(pseudo, pin) { return rpc('vault_login', { p_pseudo: pseudo, p_pin: pin }); }
export async function signOut() { const t = token(); delete settings.online; saveSettings(); bus.emit('online'); if (t) rpc('vault_logout', { p_token: t }).catch(() => {}); }
export const search = (q) => rpc('vault_search', { p_token: token(), p_query: q });
export const friendRequest = (pseudo) => rpc('vault_friend_request', { p_token: token(), p_pseudo: pseudo });
export const friendRespond = (pseudo, accept) => rpc('vault_friend_respond', { p_token: token(), p_pseudo: pseudo, p_accept: accept });
export const friendRemove = (pseudo) => rpc('vault_friend_remove', { p_token: token(), p_pseudo: pseudo });
export const friends = () => rpc('vault_friends', { p_token: token() });

export function link(res) {
  settings.online = { token: res.token, pseudo: res.pseudo };
  saveSettings();
  bus.emit('online');
}

// Public profile shown to friends
export function publicStats() {
  if (!S) return {};
  const v = VIP[S.vip] || VIP[0];
  const show = [...S.inv.cards.filter((c) => c.kind === 'card'), ...S.inv.skins].sort((a, b) => b.price - a.price).slice(0, 3);
  return {
    fortune: netWorth(), mode: S.mode, vip: v.name, vipColor: v.color,
    bestWin: S.stats.bestWin, bestMult: S.stats.bestMult, bets: S.stats.bets,
    cases: S.stats.cases, packs: S.stats.packs, ach: Object.keys(S.ach).length,
    mascot: settings.mascot || 'gold', chapter: S.chapter,
    top: show.map((x) => ({ kind: x.kind, price: x.price, k: x.k, set: x.set, lid: x.lid })),
  };
}

// Whole local save of this user (both modes), for the cloud
export function localBundle() {
  if (S) saveNow();
  const out = { v: 1, at: Date.now(), saves: {} };
  for (const m of ['sandbox', 'story']) {
    const raw = localStorage.getItem(`vault.u.${localStorage.getItem('vault.user')}.save.${m}`);
    if (raw) out.saves[m] = JSON.parse(raw);
  }
  return out;
}

let lastSaveSig = '';
export async function sync(force = false) {
  if (!onlineReady() || !linked() || !S) return;
  const bundle = localBundle();
  const sig = JSON.stringify([bundle.saves.sandbox?.balance, bundle.saves.story?.balance, S.stats.bets, S.inv.skins.length, S.inv.cards.length]);
  const sendSave = force || sig !== lastSaveSig;
  try {
    await rpc('vault_push', { p_token: token(), p_stats: publicStats(), p_save: sendSave ? bundle : null });
    if (sendSave) lastSaveSig = sig;
  } catch (e) { /* offline: next tick will retry */ }
}

let timer = null;
export function startSync() {
  if (timer) return;
  timer = setInterval(() => sync(), 60000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sync(); });
  setTimeout(() => sync(true), 3000);
}
