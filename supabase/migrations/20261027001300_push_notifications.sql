-- =============================================================================
-- Avisos al celular (Web Push)
--
-- Cada dispositivo que acepta los avisos guarda su suscripción (endpoint y
-- claves). Cada cuenta elige qué avisos recibe. Los avisos salen de la app
-- (Server Actions) cuando pasa algo: partido nuevo, votación abierta o un
-- compañero que pide validar sus atributos.
--
-- La app nunca usa la service role key, así que para leer las suscripciones
-- de otros usa get_push_targets, que exige dos cosas a la vez:
--   1. que quien la llama sea quien hizo la acción (admin del grupo o dueño
--      de la ficha), con su sesión;
--   2. una clave de despacho que solo conoce el servidor (se deriva de la
--      clave privada VAPID). En la base se guarda solo su hash, en una tabla
--      sin permisos para nadie; se carga a mano, nunca en una migración.
-- Cada aviso sale una sola vez por evento (push_dispatches).
-- =============================================================================

create type public.push_event as enum ('match_created', 'voting_open', 'validation_request');

create table public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null check (length(p256dh) between 1 and 200),
  auth text not null check (length(auth) between 1 and 100),
  user_agent text check (length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

comment on table public.push_subscriptions is
  'Dispositivos que aceptaron avisos. Cada uno ve los suyos; los ajenos solo via get_push_targets.';

create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- Qué avisos recibe cada cuenta. Sin fila = todos activados.
create table public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  match_created boolean not null default true,
  voting_open boolean not null default true,
  validation_request boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Avisos ya despachados: uno por evento y referencia (partido o ficha).
create table public.push_dispatches (
  event public.push_event not null,
  ref_id uuid not null,
  dispatched_at timestamptz not null default now(),
  primary key (event, ref_id)
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Hash (sha256) de la clave de despacho del servidor. Se carga fuera de las migraciones.
create table private.push_dispatch_keys (
  key_hash bytea primary key,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_dispatches enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (profile_id = (select auth.uid()));
create policy notification_preferences_select_own on public.notification_preferences for select to authenticated
  using (profile_id = (select auth.uid()));

revoke all on public.push_subscriptions, public.notification_preferences, public.push_dispatches from anon, authenticated;
grant select on public.push_subscriptions, public.notification_preferences to authenticated;

-- Guarda la suscripción de este dispositivo. Si el dispositivo era de otra cuenta
-- (se cambió de sesión), pasa a la actual.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200
     or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'invalid_subscription';
  end if;

  insert into public.push_subscriptions (endpoint, profile_id, p256dh, auth, user_agent)
  values (p_endpoint, v_uid, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, p256dh = excluded.p256dh,
        auth = excluded.auth, user_agent = excluded.user_agent;
end;
$$;

-- Saca la suscripción de este dispositivo (solo si es mía).
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and profile_id = (select auth.uid());
$$;

-- Activa o desactiva un tipo de aviso para mi cuenta.
create or replace function public.set_notification_preference(p_event public.push_event, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_event is null or p_enabled is null then
    raise exception 'invalid_preference';
  end if;

  insert into public.notification_preferences (profile_id) values (v_uid)
  on conflict (profile_id) do nothing;

  update public.notification_preferences
  set match_created = case when p_event = 'match_created' then p_enabled else match_created end,
      voting_open = case when p_event = 'voting_open' then p_enabled else voting_open end,
      validation_request = case when p_event = 'validation_request' then p_enabled else validation_request end
  where profile_id = v_uid;
end;
$$;

create or replace function public._push_key_ok(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_key is not null and length(p_key) >= 32 and exists (
    select 1 from private.push_dispatch_keys k
    where k.key_hash = sha256(convert_to(p_key, 'UTF8'))
  );
$$;

-- ¿La cuenta quiere este tipo de aviso? (sin fila = sí)
create or replace function public._push_wanted(p_profile_id uuid, p_event public.push_event)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_event
      when 'match_created' then np.match_created
      when 'voting_open' then np.voting_open
      when 'validation_request' then np.validation_request
    end
    from public.notification_preferences np where np.profile_id = p_profile_id
  ), true);
$$;

-- Dispositivos a los que avisar de un evento que acabo de provocar. Devuelve
-- vacío si el evento ya se avisó o ya no corresponde. Marca el evento como
-- avisado: llamarla dos veces no duplica avisos.
--   match_created       p_ref = partido. Yo soy admin; avisa a los demás miembros.
--   voting_open         p_ref = partido. Yo soy admin y la votación está abierta;
--                       avisa a los que jugaron (los que pueden votar).
--   validation_request  p_ref = mi ficha. Avisa a los demás miembros con ficha.
create or replace function public.get_push_targets(p_key text, p_event public.push_event, p_ref uuid)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
  v_recipients uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public._push_key_ok(p_key) then
    raise exception 'forbidden';
  end if;

  if p_event = 'match_created' then
    select m.group_id into v_group from public.matches m
    where m.id = p_ref and m.status = 'scheduled' and m.scheduled_at > now();
    if v_group is null or not public.is_group_admin(v_group) then
      return;
    end if;
    select array_agg(gm.profile_id) into v_recipients
    from public.group_members gm
    where gm.group_id = v_group and gm.profile_id <> v_uid;

  elsif p_event = 'voting_open' then
    select m.group_id into v_group from public.matches m
    where m.id = p_ref and m.status = 'finished'
      and m.voting_closes_at is not null and now() < m.voting_closes_at;
    if v_group is null or not public.is_group_admin(v_group) then
      return;
    end if;
    select array_agg(distinct p.profile_id) into v_recipients
    from public.team_members tm
    join public.players p on p.id = tm.player_id
    join public.group_members gm on gm.group_id = v_group and gm.profile_id = p.profile_id
    where tm.match_id = p_ref and p.profile_id <> v_uid;

  elsif p_event = 'validation_request' then
    select p.group_id into v_group from public.players p
    where p.id = p_ref and p.profile_id = v_uid
      and exists (select 1 from public.player_self_assessments s where s.player_id = p.id);
    if v_group is null then
      return;
    end if;
    select array_agg(distinct p.profile_id) into v_recipients
    from public.players p
    join public.group_members gm on gm.group_id = v_group and gm.profile_id = p.profile_id
    where p.group_id = v_group and p.profile_id <> v_uid;

  else
    return;
  end if;

  insert into public.push_dispatches (event, ref_id) values (p_event, p_ref)
  on conflict do nothing;
  if not found then
    return;
  end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    where s.profile_id = any (coalesce(v_recipients, '{}'))
      and public._push_wanted(s.profile_id, p_event);
end;
$$;

-- Borra suscripciones que el servicio de push dio de baja (404/410).
create or replace function public.prune_push_subscriptions(p_key text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public._push_key_ok(p_key) then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions where endpoint = any (coalesce(p_endpoints, '{}'));
end;
$$;

revoke execute on function
  public._push_key_ok(text),
  public._push_wanted(uuid, public.push_event)
from public, anon, authenticated;

revoke execute on function
  public.save_push_subscription(text, text, text, text),
  public.delete_push_subscription(text),
  public.set_notification_preference(public.push_event, boolean),
  public.get_push_targets(text, public.push_event, uuid),
  public.prune_push_subscriptions(text, text[])
from public, anon;
grant execute on function
  public.save_push_subscription(text, text, text, text),
  public.delete_push_subscription(text),
  public.set_notification_preference(public.push_event, boolean),
  public.get_push_targets(text, public.push_event, uuid),
  public.prune_push_subscriptions(text, text[])
to authenticated;
