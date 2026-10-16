-- =============================================================================
-- FUTBOLEROS · 0001 · Fundación
-- Perfiles, grupos, miembros, jugadores, posiciones, alias, temporadas,
-- invitaciones y auditoría. RLS en todas las tablas.
--
-- Convenciones:
--   * Funciones SECURITY DEFINER: search_path = '' y nombres calificados.
--   * Errores de negocio: raise exception '<clave>' (ver src/lib/errors.ts).
--   * Privilegios mínimos explícitos por tabla además de RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Normaliza nombres para comparar sin importar mayúsculas, acentos, signos ni
-- espacios repetidos. Debe mantenerse idéntica a src/domain/names/normalize.ts.
create or replace function public.normalize_name(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          -- Incluye mayúsculas acentuadas: no depender del locale de lower().
          translate(
            lower(coalesce(p_value, '')),
            'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
            'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc'
          ),
          '[^a-z0-9]+', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

create or replace function public.slugify(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(replace(coalesce(public.normalize_name(p_value), ''), ' ', '-'), '');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type public.group_role as enum ('admin', 'player');
create type public.player_position as enum ('goalkeeper', 'defender', 'midfielder', 'forward');
create type public.dominant_foot as enum ('right', 'left', 'both');

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil público de cada cuenta (1 a 1 con auth.users).';

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  slug text not null unique
    check (char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 280),
  timezone text not null default 'America/Argentina/Buenos_Aires',
  default_players_per_team smallint not null default 5
    check (default_players_per_team between 3 and 11),
  voting_window_hours smallint not null default 48
    check (voting_window_hours between 1 and 336),
  ranking_min_matches smallint not null default 3
    check (ranking_min_matches between 1 and 50),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.groups is 'Grupo de fútbol: aísla jugadores, partidos y estadísticas.';

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'player',
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index group_members_profile_id_idx on public.group_members (profile_id);
comment on table public.group_members is 'Pertenencia de cuentas a grupos con su rol.';

create table public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid,
  nickname text not null
    check (char_length(btrim(nickname)) between 1 and 30 and public.normalize_name(nickname) is not null),
  nickname_normalized text generated always as (public.normalize_name(nickname)) stored,
  full_name text check (full_name is null or char_length(full_name) <= 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  dominant_foot public.dominant_foot,
  base_rating numeric(3, 1) not null default 5.0 check (base_rating between 1 and 10),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_id_group_key unique (id, group_id),
  constraint players_group_nickname_key unique (group_id, nickname_normalized),
  constraint players_group_profile_key unique (group_id, profile_id),
  -- Solo se puede vincular a alguien que es miembro; si deja el grupo, la
  -- ficha queda (con sus estadísticas) pero se desvincula.
  constraint players_member_fkey foreign key (group_id, profile_id)
    references public.group_members (group_id, profile_id) on delete set null (profile_id)
);
create index players_profile_id_idx on public.players (profile_id) where profile_id is not null;
comment on table public.players is 'Ficha deportiva dentro de un grupo. Puede existir sin cuenta vinculada.';
comment on column public.players.base_rating is 'Nivel inicial provisional (1-10) fijado por un admin.';

create table public.player_positions (
  player_id uuid not null,
  group_id uuid not null,
  position public.player_position not null,
  priority smallint not null check (priority in (1, 2)),
  primary key (player_id, position),
  constraint player_positions_priority_key unique (player_id, priority),
  constraint player_positions_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete cascade
);
create index player_positions_group_id_idx on public.player_positions (group_id);
comment on column public.player_positions.priority is '1 = principal, 2 = secundaria.';

create table public.player_aliases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  player_id uuid not null,
  alias text not null
    check (char_length(btrim(alias)) between 1 and 40 and public.normalize_name(alias) is not null),
  alias_normalized text generated always as (public.normalize_name(alias)) stored,
  created_at timestamptz not null default now(),
  constraint player_aliases_group_alias_key unique (group_id, alias_normalized),
  constraint player_aliases_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete cascade
);
create index player_aliases_player_id_idx on public.player_aliases (player_id);
comment on table public.player_aliases is 'Otros nombres con los que aparece un jugador en listas de WhatsApp.';

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  constraint seasons_dates_check check (ends_on is null or ends_on >= starts_on)
);
create index seasons_group_id_idx on public.seasons (group_id, starts_on desc);
comment on table public.seasons is 'Temporadas. Un partido pertenece a la temporada que contiene su fecha local.';

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token text not null unique
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  role public.group_role not null default 'player',
  player_id uuid,
  max_uses smallint check (max_uses is null or max_uses between 1 and 500),
  use_count smallint not null default 0 check (use_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invitations_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete cascade,
  constraint invitations_player_single_use check (player_id is null or coalesce(max_uses, 0) = 1),
  constraint invitations_uses_check check (max_uses is null or use_count <= max_uses)
);
create index invitations_group_id_idx on public.invitations (group_id, created_at desc);
comment on table public.invitations is 'Links de invitación. Si apuntan a un jugador, al aceptarlos se vincula esa ficha.';

create table public.audit_logs (
  id bigint generated always as identity primary key,
  group_id uuid references public.groups (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_group_created_idx on public.audit_logs (group_id, created_at desc);
comment on table public.audit_logs is 'Registro de cambios relevantes. Solo lo escriben triggers y RPC.';

-- -----------------------------------------------------------------------------
-- Funciones auxiliares de autorización (SECURITY DEFINER: evitan recursión RLS)
-- -----------------------------------------------------------------------------

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.profile_id = (select auth.uid())
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
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.profile_id = (select auth.uid())
      and gm.role = 'admin'
  );
$$;

create or replace function public.shares_group_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.profile_id = (select auth.uid()) and theirs.profile_id = p_profile_id
  );
$$;

create or replace function public.is_own_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players p
    where p.id = p_player_id and p.profile_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Perfil automático al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Jugador'
  )), 40);

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(v_name, ''), 'Jugador'))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();
create trigger players_set_updated_at before update on public.players
  for each row execute function public.set_updated_at();

-- Zona horaria válida.
create or replace function public.groups_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform now() at time zone new.timezone;
  return new;
exception
  when invalid_parameter_value then
    raise exception 'invalid_timezone';
end;
$$;

create trigger groups_validate before insert or update of timezone on public.groups
  for each row execute function public.groups_validate();

-- Un grupo nunca se queda sin administrador.
create or replace function public.group_members_keep_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_successor uuid;
begin
  if not (old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')) then
    return coalesce(new, old);
  end if;

  -- Borrado en cascada del grupo completo: nada que proteger.
  if not exists (select 1 from public.groups g where g.id = old.group_id) then
    return coalesce(new, old);
  end if;

  if exists (
    select 1 from public.group_members gm
    where gm.group_id = old.group_id and gm.role = 'admin' and gm.profile_id <> old.profile_id
  ) then
    return coalesce(new, old);
  end if;

  -- La cuenta se está eliminando: se promueve al miembro más antiguo.
  if tg_op = 'DELETE' and not exists (select 1 from public.profiles p where p.id = old.profile_id) then
    select gm.profile_id into v_successor
    from public.group_members gm
    where gm.group_id = old.group_id and gm.profile_id <> old.profile_id
    order by gm.joined_at
    limit 1;

    if v_successor is not null then
      update public.group_members set role = 'admin'
      where group_id = old.group_id and profile_id = v_successor;
    end if;
    return old;
  end if;

  raise exception 'last_admin';
end;
$$;

create trigger group_members_keep_admin before update or delete on public.group_members
  for each row execute function public.group_members_keep_admin();

-- Un jugador que edita su propia ficha (sin ser admin) solo toca datos no
-- sensibles. Las RPC SECURITY DEFINER (current_user <> authenticated) aplican
-- sus propias reglas.
create or replace function public.players_guard_self_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or public.is_group_admin(old.group_id) then
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id
     or new.nickname is distinct from old.nickname
     or new.base_rating is distinct from old.base_rating
     or new.is_active is distinct from old.is_active then
    raise exception 'player_field_forbidden';
  end if;

  return new;
end;
$$;

create trigger players_guard_self_edit before update on public.players
  for each row execute function public.players_guard_self_edit();

-- Temporadas sin solapamiento dentro del grupo.
create or replace function public.seasons_prevent_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serializa altas/ediciones concurrentes del mismo grupo.
  perform 1 from public.groups g where g.id = new.group_id for update;

  if exists (
    select 1 from public.seasons s
    where s.group_id = new.group_id
      and s.id <> new.id
      and daterange(s.starts_on, s.ends_on, '[]') && daterange(new.starts_on, new.ends_on, '[]')
  ) then
    raise exception 'season_overlap';
  end if;

  return new;
end;
$$;

create trigger seasons_prevent_overlap before insert or update on public.seasons
  for each row execute function public.seasons_prevent_overlap();

-- Auditoría genérica por fila.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_group_id uuid;
  v_entity_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old) - 'token';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new) - 'token';
  end if;

  if tg_op = 'UPDATE' and (v_old - 'updated_at') = (v_new - 'updated_at') then
    return new;
  end if;

  if tg_table_name = 'groups' then
    v_group_id := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);
  else
    v_group_id := coalesce((v_new ->> 'group_id')::uuid, (v_old ->> 'group_id')::uuid);
  end if;

  -- Cascada de borrado del grupo: no hay dónde registrar.
  if v_group_id is null or not exists (select 1 from public.groups g where g.id = v_group_id) then
    return coalesce(new, old);
  end if;

  v_entity_id := coalesce(
    v_new ->> 'id', v_old ->> 'id',
    v_new ->> 'profile_id', v_old ->> 'profile_id',
    v_new ->> 'player_id', v_old ->> 'player_id'
  );

  insert into public.audit_logs (group_id, actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_group_id,
    (select p.id from public.profiles p where p.id = (select auth.uid())),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_old,
    v_new
  );

  return coalesce(new, old);
end;
$$;

create trigger groups_audit after update on public.groups
  for each row execute function public.audit_row_change();
create trigger group_members_audit after insert or update or delete on public.group_members
  for each row execute function public.audit_row_change();
create trigger players_audit after insert or update or delete on public.players
  for each row execute function public.audit_row_change();
create trigger seasons_audit after insert or update or delete on public.seasons
  for each row execute function public.audit_row_change();
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.players enable row level security;
alter table public.player_positions enable row level security;
alter table public.player_aliases enable row level security;
alter table public.seasons enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_group_with(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- groups (alta solo vía create_group)
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id));
create policy groups_update_admin on public.groups for update to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

-- group_members (alta solo vía create_group / accept_invitation)
create policy group_members_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));
create policy group_members_update_admin on public.group_members for update to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));
create policy group_members_delete on public.group_members for delete to authenticated
  using (public.is_group_admin(group_id) or profile_id = (select auth.uid()));

-- players
create policy players_select on public.players for select to authenticated
  using (public.is_group_member(group_id));
create policy players_insert_admin on public.players for insert to authenticated
  with check (public.is_group_admin(group_id));
create policy players_update on public.players for update to authenticated
  using (public.is_group_admin(group_id) or profile_id = (select auth.uid()))
  with check (public.is_group_admin(group_id) or profile_id = (select auth.uid()));
create policy players_delete_admin on public.players for delete to authenticated
  using (public.is_group_admin(group_id));

-- player_positions
create policy player_positions_select on public.player_positions for select to authenticated
  using (public.is_group_member(group_id));
create policy player_positions_write on public.player_positions for all to authenticated
  using (public.is_group_admin(group_id) or public.is_own_player(player_id))
  with check (public.is_group_admin(group_id) or public.is_own_player(player_id));

-- player_aliases
create policy player_aliases_select on public.player_aliases for select to authenticated
  using (public.is_group_member(group_id));
create policy player_aliases_write_admin on public.player_aliases for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- seasons
create policy seasons_select on public.seasons for select to authenticated
  using (public.is_group_member(group_id));
create policy seasons_write_admin on public.seasons for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- invitations (consumo solo vía accept_invitation)
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- audit_logs (escritura solo por triggers / RPC)
create policy audit_logs_select_admin on public.audit_logs for select to authenticated
  using (public.is_group_admin(group_id));

-- -----------------------------------------------------------------------------
-- Privilegios mínimos (además de RLS)
-- -----------------------------------------------------------------------------

revoke all on table
  public.profiles, public.groups, public.group_members, public.players,
  public.player_positions, public.player_aliases, public.seasons,
  public.invitations, public.audit_logs
from anon, authenticated;

grant select on table
  public.profiles, public.groups, public.group_members, public.players,
  public.player_positions, public.player_aliases, public.seasons,
  public.invitations, public.audit_logs
to authenticated;

grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (name, description, timezone, default_players_per_team, voting_window_hours, ranking_min_matches)
  on public.groups to authenticated;
grant update (role), delete on public.group_members to authenticated;
grant insert (group_id, nickname, full_name, avatar_url, dominant_foot, base_rating, is_active)
  on public.players to authenticated;
grant update (profile_id, nickname, full_name, avatar_url, dominant_foot, base_rating, is_active)
  on public.players to authenticated;
grant delete on public.players to authenticated;
grant insert, update, delete on public.player_positions to authenticated;
grant insert (group_id, player_id, alias), delete on public.player_aliases to authenticated;
grant insert (group_id, name, starts_on, ends_on), update (name, starts_on, ends_on), delete
  on public.seasons to authenticated;
grant insert (group_id, role, player_id, max_uses, expires_at), update (revoked_at), delete
  on public.invitations to authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Crea un grupo con su admin, la temporada del año y (opcional) la ficha del creador.
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

-- Vista previa pública de una invitación (no requiere sesión).
create or replace function public.get_invitation_preview(p_token text)
returns table (
  group_name text,
  group_slug text,
  role public.group_role,
  player_nickname text,
  inviter_name text,
  status text,
  is_member boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_inv public.invitations;
begin
  if p_token is null or char_length(p_token) <> 64 then
    return;
  end if;

  select * into v_inv from public.invitations i where i.token = p_token;
  if not found then
    return;
  end if;

  return query
    select
      g.name,
      g.slug,
      v_inv.role,
      p.nickname,
      pr.display_name,
      case
        when v_inv.revoked_at is not null then 'revoked'
        when v_inv.expires_at is not null and v_inv.expires_at <= now() then 'expired'
        when v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then 'exhausted'
        else 'valid'
      end,
      exists (
        select 1 from public.group_members gm
        where gm.group_id = g.id and gm.profile_id = (select auth.uid())
      )
    from public.groups g
    left join public.players p on p.id = v_inv.player_id
    left join public.profiles pr on pr.id = v_inv.created_by
    where g.id = v_inv.group_id;
end;
$$;

-- Acepta una invitación: alta como miembro y, si la invitación apunta a una
-- ficha libre, la vincula. Bloquea la fila para respetar max_uses.
create or replace function public.accept_invitation(p_token text)
returns table (group_id uuid, group_slug text, player_id uuid, needs_player boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations;
  v_was_member boolean;
  v_player_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_inv from public.invitations i where i.token = p_token for update;
  if not found then
    raise exception 'invitation_not_found';
  end if;

  select exists (
    select 1 from public.group_members gm
    where gm.group_id = v_inv.group_id and gm.profile_id = v_uid
  ) into v_was_member;

  if not v_was_member then
    if v_inv.revoked_at is not null then
      raise exception 'invitation_revoked';
    end if;
    if v_inv.expires_at is not null and v_inv.expires_at <= now() then
      raise exception 'invitation_expired';
    end if;
    if v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then
      raise exception 'invitation_exhausted';
    end if;

    insert into public.group_members (group_id, profile_id, role)
    values (v_inv.group_id, v_uid, v_inv.role);

    update public.invitations i set use_count = i.use_count + 1 where i.id = v_inv.id;
  end if;

  select p.id into v_player_id
  from public.players p
  where p.group_id = v_inv.group_id and p.profile_id = v_uid;

  if v_player_id is null and v_inv.player_id is not null and not v_was_member then
    update public.players p set profile_id = v_uid
    where p.id = v_inv.player_id and p.profile_id is null
    returning p.id into v_player_id;
  end if;

  return query
    select g.id, g.slug, v_player_id, v_player_id is null
    from public.groups g where g.id = v_inv.group_id;
end;
$$;

-- Un miembro sin ficha reclama una ficha libre del grupo.
create or replace function public.claim_player(p_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_player public.players;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_player from public.players p where p.id = p_player_id for update;
  if not found or not public.is_group_member(v_player.group_id) then
    raise exception 'player_not_found';
  end if;
  if v_player.profile_id is not null then
    raise exception 'player_already_claimed';
  end if;
  if exists (
    select 1 from public.players p
    where p.group_id = v_player.group_id and p.profile_id = v_uid
  ) then
    raise exception 'already_has_player';
  end if;

  update public.players set profile_id = v_uid where id = p_player_id;
  return p_player_id;
end;
$$;

-- Un miembro sin ficha crea la suya.
create or replace function public.create_own_player(
  p_group_id uuid,
  p_nickname text,
  p_primary_position public.player_position default null,
  p_secondary_position public.player_position default null,
  p_dominant_foot public.dominant_foot default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_player_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'group_not_found';
  end if;
  if exists (
    select 1 from public.players p where p.group_id = p_group_id and p.profile_id = v_uid
  ) then
    raise exception 'already_has_player';
  end if;
  if p_secondary_position is not null and p_secondary_position = p_primary_position then
    raise exception 'positions_must_differ';
  end if;

  insert into public.players (group_id, profile_id, nickname, dominant_foot, created_by)
  values (p_group_id, v_uid, btrim(p_nickname), p_dominant_foot, v_uid)
  returning id into v_player_id;

  if p_primary_position is not null then
    insert into public.player_positions (player_id, group_id, position, priority)
    values (v_player_id, p_group_id, p_primary_position, 1);
  end if;
  if p_secondary_position is not null then
    insert into public.player_positions (player_id, group_id, position, priority)
    values (v_player_id, p_group_id, p_secondary_position, 2);
  end if;

  return v_player_id;
end;
$$;

-- Alta o edición de una ficha con sus posiciones, en una transacción.
-- SECURITY INVOKER: aplican las políticas RLS y el guard de auto-edición.
create or replace function public.save_player(
  p_group_id uuid,
  p_nickname text,
  p_player_id uuid default null,
  p_full_name text default null,
  p_dominant_foot public.dominant_foot default null,
  p_base_rating numeric default null,
  p_primary_position public.player_position default null,
  p_secondary_position public.player_position default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_player_id uuid;
begin
  if p_secondary_position is not null and p_secondary_position = p_primary_position then
    raise exception 'positions_must_differ';
  end if;

  if p_player_id is null then
    insert into public.players (group_id, nickname, full_name, dominant_foot, base_rating)
    values (
      p_group_id,
      btrim(p_nickname),
      nullif(btrim(p_full_name), ''),
      p_dominant_foot,
      coalesce(p_base_rating, 5.0)
    )
    returning id into v_player_id;
  else
    update public.players p set
      nickname = btrim(p_nickname),
      full_name = nullif(btrim(p_full_name), ''),
      dominant_foot = p_dominant_foot,
      base_rating = coalesce(p_base_rating, p.base_rating)
    where p.id = p_player_id and p.group_id = p_group_id
    returning p.id into v_player_id;

    if v_player_id is null then
      raise exception 'player_not_found';
    end if;
  end if;

  delete from public.player_positions pp where pp.player_id = v_player_id;
  if p_primary_position is not null then
    insert into public.player_positions (player_id, group_id, position, priority)
    values (v_player_id, p_group_id, p_primary_position, 1);
  end if;
  if p_secondary_position is not null then
    insert into public.player_positions (player_id, group_id, position, priority)
    values (v_player_id, p_group_id, p_secondary_position, 2);
  end if;

  return v_player_id;
end;
$$;

-- Cierra la temporada abierta el día anterior y abre una nueva, atómicamente.
-- SECURITY INVOKER: solo un admin pasa las políticas de seasons.
create or replace function public.start_new_season(p_group_id uuid, p_name text, p_starts_on date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_season_id uuid;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'forbidden';
  end if;

  update public.seasons s
  set ends_on = p_starts_on - 1
  where s.group_id = p_group_id
    and s.ends_on is null
    and s.starts_on < p_starts_on;

  insert into public.seasons (group_id, name, starts_on)
  values (p_group_id, btrim(p_name), p_starts_on)
  returning id into v_season_id;

  return v_season_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución
-- -----------------------------------------------------------------------------

revoke execute on function
  public.is_group_member(uuid),
  public.is_group_admin(uuid),
  public.shares_group_with(uuid),
  public.is_own_player(uuid),
  public.create_group(text, text, smallint, text),
  public.get_invitation_preview(text),
  public.accept_invitation(text),
  public.claim_player(uuid),
  public.create_own_player(uuid, text, public.player_position, public.player_position, public.dominant_foot),
  public.save_player(uuid, text, uuid, text, public.dominant_foot, numeric, public.player_position, public.player_position),
  public.start_new_season(uuid, text, date)
from public, anon;

revoke execute on function
  public.handle_new_user(),
  public.group_members_keep_admin(),
  public.players_guard_self_edit(),
  public.seasons_prevent_overlap(),
  public.audit_row_change(),
  public.groups_validate(),
  public.set_updated_at()
from public, anon, authenticated;

grant execute on function
  public.is_group_member(uuid),
  public.is_group_admin(uuid),
  public.shares_group_with(uuid),
  public.is_own_player(uuid),
  public.create_group(text, text, smallint, text),
  public.get_invitation_preview(text),
  public.accept_invitation(text),
  public.claim_player(uuid),
  public.create_own_player(uuid, text, public.player_position, public.player_position, public.dominant_foot),
  public.save_player(uuid, text, uuid, text, public.dominant_foot, numeric, public.player_position, public.player_position),
  public.start_new_season(uuid, text, date)
to authenticated;

grant execute on function public.get_invitation_preview(text) to anon;
