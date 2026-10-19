-- =============================================================================
-- Administrador único de la app
--
-- FutBot tiene un solo administrador (el dueño). El resto de las cuentas entra
-- como jugador: ve y vota. En vez de tocar cada política, la regla vive en
-- is_group_admin(): además del rol en el grupo, exige estar en app_admins.
-- Así todas las políticas y RPC que ya preguntaban por el admin del grupo
-- quedan restringidas de una vez.
-- =============================================================================

create table public.app_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.app_admins is
  'Cuentas con permisos de administración en la app. Se gestiona solo desde la base (sin escritura desde la app).';

alter table public.app_admins enable row level security;

-- Cada cuenta puede saber si es admin; nadie lista a los demás ni escribe.
create policy app_admins_select_self on public.app_admins for select to authenticated
  using (profile_id = (select auth.uid()));

revoke all on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;

-- Semilla: quienes crearon los grupos existentes (hoy, el dueño de la app).
insert into public.app_admins (profile_id)
select distinct g.created_by
from public.groups g
join public.profiles p on p.id = g.created_by
where g.created_by is not null
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Funciones de autorización
-- -----------------------------------------------------------------------------

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a where a.profile_id = (select auth.uid())
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.app_admins a on a.profile_id = gm.profile_id
    where gm.group_id = p_group_id
      and gm.profile_id = (select auth.uid())
      and gm.role = 'admin'
  );
$$;

revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- El rol "admin" en un grupo queda reservado al administrador de la app
-- -----------------------------------------------------------------------------

create or replace function public.group_members_admin_reserved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role <> 'admin' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.role = 'admin' then
    return new;
  end if;
  -- La promoción automática de group_members_keep_admin (cuenta eliminada)
  -- corre dentro de otro trigger: se permite para no dejar grupos huérfanos.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if exists (select 1 from public.app_admins a where a.profile_id = new.profile_id) then
    return new;
  end if;
  raise exception 'admin_reserved';
end;
$$;

create trigger group_members_admin_reserved before insert or update of role on public.group_members
  for each row execute function public.group_members_admin_reserved();

create or replace function public.invitations_admin_reserved()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'admin' then
    raise exception 'admin_reserved';
  end if;
  return new;
end;
$$;

create trigger invitations_admin_reserved before insert or update of role on public.invitations
  for each row execute function public.invitations_admin_reserved();

revoke execute on function
  public.group_members_admin_reserved(),
  public.invitations_admin_reserved()
from public, anon, authenticated;

-- Invitaciones de admin que quedaron pendientes pasan a ser de jugador.
update public.invitations set role = 'player' where role = 'admin';

-- Otros admins de grupo (donde el admin de la app también lo es) pasan a jugadores.
update public.group_members gm
set role = 'player'
where gm.role = 'admin'
  and not exists (select 1 from public.app_admins a where a.profile_id = gm.profile_id)
  and exists (
    select 1
    from public.group_members other
    join public.app_admins a on a.profile_id = other.profile_id
    where other.group_id = gm.group_id and other.role = 'admin'
  );

-- -----------------------------------------------------------------------------
-- Los jugadores solo ven y votan: ya no editan su ficha ni sus posiciones
-- (vincularse o crear la propia ficha sigue siendo posible, vía RPC).
-- -----------------------------------------------------------------------------

drop policy players_update on public.players;
create policy players_update_admin on public.players for update to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

drop policy player_positions_write on public.player_positions;
create policy player_positions_write_admin on public.player_positions for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- -----------------------------------------------------------------------------
-- Crear grupos: solo el administrador de la app
-- -----------------------------------------------------------------------------

create or replace function public.create_group(
  p_name text,
  p_description text default null,
  p_players_per_team smallint default 5,
  p_player_nickname text default null
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
  v_base text;
  v_slug text;
  v_local_now timestamp;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.app_admins a where a.profile_id = v_uid) then
    raise exception 'forbidden';
  end if;

  if (
    select count(*) from public.groups g
    where g.created_by = v_uid and g.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'rate_limited';
  end if;

  v_base := left(coalesce(public.slugify(p_name), 'grupo'), 60);
  v_base := btrim(v_base, '-');
  if char_length(v_base) < 2 then
    v_base := 'grupo';
  end if;

  loop
    v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
    exit when not exists (select 1 from public.groups g where g.slug = v_slug);
  end loop;

  insert into public.groups (name, slug, description, default_players_per_team, created_by)
  values (
    btrim(p_name),
    v_slug,
    nullif(btrim(p_description), ''),
    coalesce(p_players_per_team, 5),
    v_uid
  )
  returning * into v_group;

  insert into public.group_members (group_id, profile_id, role)
  values (v_group.id, v_uid, 'admin');

  v_local_now := now() at time zone v_group.timezone;
  insert into public.seasons (group_id, name, starts_on)
  values (
    v_group.id,
    'Temporada ' || extract(year from v_local_now)::int,
    date_trunc('year', v_local_now)::date
  );

  if nullif(btrim(p_player_nickname), '') is not null then
    insert into public.players (group_id, profile_id, nickname, created_by)
    values (v_group.id, v_uid, btrim(p_player_nickname), v_uid);
  end if;

  return v_group;
end;
$$;
