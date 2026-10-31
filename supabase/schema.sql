-- VAULT : comptes en ligne, amis et sauvegarde cloud.
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis "Run".
-- Les tables ne sont jamais accessibles directement : tout passe par les fonctions vault_* ci-dessous.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.vault_players (
  id uuid primary key default gen_random_uuid(),
  pseudo_key text not null unique,
  pseudo text not null,
  pin_hash text not null,
  stats jsonb not null default '{}'::jsonb,
  save jsonb,
  save_at timestamptz,
  last_seen timestamptz not null default now(),
  fails int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_sessions (
  token_hash text primary key,
  player_id uuid not null references public.vault_players(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.vault_friends (
  a uuid not null references public.vault_players(id) on delete cascade,
  b uuid not null references public.vault_players(id) on delete cascade,
  requester uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

alter table public.vault_players enable row level security;
alter table public.vault_sessions enable row level security;
alter table public.vault_friends enable row level security;
revoke all on public.vault_players, public.vault_sessions, public.vault_friends from anon, authenticated;

-- Pseudo -> clé unique (minuscules, sans accents ni symboles)
create or replace function public.vault_key(p text) returns text
language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(p, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'), '[^a-z0-9_-]', '', 'g')
$$;

create or replace function public.vault_session(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select player_id from public.vault_sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function public.vault_new_session(pid uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare tok text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.vault_sessions(token_hash, player_id) values (encode(extensions.digest(tok, 'sha256'), 'hex'), pid);
  return tok;
end $$;

create or replace function public.vault_public(p public.vault_players) returns json
language sql stable as $$
  select json_build_object('pseudo', p.pseudo, 'stats', p.stats, 'last_seen', p.last_seen)
$$;

-- Créer un compte
create or replace function public.vault_register(p_pseudo text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare k text := public.vault_key(p_pseudo); disp text := left(trim(coalesce(p_pseudo, '')), 16); pid uuid;
begin
  if length(k) < 2 or length(k) > 20 then return json_build_object('error', 'pseudo_invalide'); end if;
  if length(coalesce(p_pin, '')) < 4 or length(p_pin) > 64 then return json_build_object('error', 'code_trop_court'); end if;
  if exists (select 1 from public.vault_players where pseudo_key = k) then return json_build_object('error', 'pseudo_pris'); end if;
  insert into public.vault_players(pseudo_key, pseudo, pin_hash) values (k, disp, extensions.crypt(p_pin, extensions.gen_salt('bf'))) returning id into pid;
  return json_build_object('token', public.vault_new_session(pid), 'pseudo', disp);
end $$;

-- Se connecter (5 erreurs = 10 minutes de blocage)
create or replace function public.vault_login(p_pseudo text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare p public.vault_players;
begin
  select * into p from public.vault_players where pseudo_key = public.vault_key(p_pseudo);
  if not found then return json_build_object('error', 'pseudo_inconnu'); end if;
  if p.locked_until is not null and p.locked_until > now() then return json_build_object('error', 'bloque'); end if;
  if p.pin_hash <> extensions.crypt(coalesce(p_pin, ''), p.pin_hash) then
    update public.vault_players set fails = fails + 1,
      locked_until = case when fails + 1 >= 5 then now() + interval '10 minutes' else null end
    where id = p.id;
    return json_build_object('error', 'code_faux');
  end if;
  update public.vault_players set fails = 0, locked_until = null, last_seen = now() where id = p.id;
  return json_build_object('token', public.vault_new_session(p.id), 'pseudo', p.pseudo, 'save', p.save, 'save_at', p.save_at);
end $$;

create or replace function public.vault_logout(p_token text) returns json
language sql security definer set search_path = public, extensions as $$
  delete from public.vault_sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  select json_build_object('ok', true);
$$;

-- Envoyer ses stats publiques (+ sa sauvegarde si fournie)
create or replace function public.vault_push(p_token text, p_stats jsonb, p_save jsonb default null) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token);
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  if p_save is not null and pg_column_size(p_save) > 4000000 then return json_build_object('error', 'sauvegarde_trop_grosse'); end if;
  update public.vault_players set
    stats = coalesce(p_stats, stats),
    save = coalesce(p_save, save),
    save_at = case when p_save is not null then now() else save_at end,
    last_seen = now()
  where id = pid;
  return json_build_object('ok', true);
end $$;

create or replace function public.vault_pull(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token); p public.vault_players;
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  select * into p from public.vault_players where id = pid;
  return json_build_object('pseudo', p.pseudo, 'save', p.save, 'save_at', p.save_at);
end $$;

-- Rechercher des joueurs par début de pseudo
create or replace function public.vault_search(p_token text, p_query text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token); q text := public.vault_key(p_query);
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  if length(q) < 1 then return '[]'::json; end if;
  return coalesce((select json_agg(public.vault_public(p)) from (
    select * from public.vault_players where pseudo_key like q || '%' and id <> pid order by length(pseudo_key), pseudo_key limit 10) p), '[]'::json);
end $$;

-- Demande d'ami (si l'autre t'a déjà demandé, ça accepte directement)
create or replace function public.vault_friend_request(p_token text, p_pseudo text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token); tid uuid; x uuid; y uuid; f public.vault_friends;
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  select id into tid from public.vault_players where pseudo_key = public.vault_key(p_pseudo);
  if tid is null then return json_build_object('error', 'pseudo_inconnu'); end if;
  if tid = pid then return json_build_object('error', 'toi_meme'); end if;
  x := least(pid, tid); y := greatest(pid, tid);
  select * into f from public.vault_friends where a = x and b = y;
  if found then
    if f.status = 'pending' and f.requester <> pid then
      update public.vault_friends set status = 'accepted' where a = x and b = y;
      return json_build_object('status', 'accepted');
    end if;
    return json_build_object('status', f.status);
  end if;
  insert into public.vault_friends(a, b, requester) values (x, y, pid);
  return json_build_object('status', 'pending');
end $$;

create or replace function public.vault_friend_respond(p_token text, p_pseudo text, p_accept boolean) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token); tid uuid;
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  select id into tid from public.vault_players where pseudo_key = public.vault_key(p_pseudo);
  if tid is null then return json_build_object('error', 'pseudo_inconnu'); end if;
  if p_accept then
    update public.vault_friends set status = 'accepted' where a = least(pid, tid) and b = greatest(pid, tid) and requester = tid and status = 'pending';
  else
    delete from public.vault_friends where a = least(pid, tid) and b = greatest(pid, tid) and status = 'pending';
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.vault_friend_remove(p_token text, p_pseudo text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token); tid uuid;
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  select id into tid from public.vault_players where pseudo_key = public.vault_key(p_pseudo);
  delete from public.vault_friends where a = least(pid, tid) and b = greatest(pid, tid);
  return json_build_object('ok', true);
end $$;

-- Amis, demandes reçues et envoyées
create or replace function public.vault_friends(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public.vault_session(p_token);
begin
  if pid is null then return json_build_object('error', 'session'); end if;
  update public.vault_players set last_seen = now() where id = pid;
  return json_build_object(
    'friends', coalesce((select json_agg(public.vault_public(p)) from public.vault_friends f
      join public.vault_players p on p.id = case when f.a = pid then f.b else f.a end
      where (f.a = pid or f.b = pid) and f.status = 'accepted'), '[]'::json),
    'incoming', coalesce((select json_agg(public.vault_public(p)) from public.vault_friends f
      join public.vault_players p on p.id = f.requester
      where (f.a = pid or f.b = pid) and f.status = 'pending' and f.requester <> pid), '[]'::json),
    'outgoing', coalesce((select json_agg(public.vault_public(p)) from public.vault_friends f
      join public.vault_players p on p.id = case when f.a = pid then f.b else f.a end
      where (f.a = pid or f.b = pid) and f.status = 'pending' and f.requester = pid), '[]'::json)
  );
end $$;

-- Droits : seules les fonctions publiques sont appelables depuis l'app
revoke execute on all functions in schema public from anon, authenticated, public;
grant execute on function
  public.vault_register(text, text), public.vault_login(text, text), public.vault_logout(text),
  public.vault_push(text, jsonb, jsonb), public.vault_pull(text), public.vault_search(text, text),
  public.vault_friend_request(text, text), public.vault_friend_respond(text, text, boolean),
  public.vault_friend_remove(text, text), public.vault_friends(text)
to anon, authenticated;
