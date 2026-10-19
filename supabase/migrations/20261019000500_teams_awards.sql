-- =============================================================================
-- FUTBOLEROS · 0005 · Armado de equipos y mejoras (Fases 4 y 5)
-- Restricciones persistentes para el armado (juntos / separados), caché
-- reconstruible del motor de valoración y cara a cara entre dos jugadores
-- (rivalidades) calculado sobre los hechos.
-- =============================================================================

create type public.team_constraint_kind as enum ('together', 'apart');

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table public.team_constraints (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  player_a uuid not null,
  player_b uuid not null,
  kind public.team_constraint_kind not null,
  note text check (note is null or char_length(note) <= 120),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_constraints_distinct_players check (player_a <> player_b),
  constraint team_constraints_player_a_fkey foreign key (player_a, group_id)
    references public.players (id, group_id) on delete cascade,
  constraint team_constraints_player_b_fkey foreign key (player_b, group_id)
    references public.players (id, group_id) on delete cascade
);
-- Un único vínculo por par y grupo sin importar el orden (A-B = B-A): tampoco
-- pueden convivir "juntos" y "separados" para la misma pareja.
create unique index team_constraints_pair_key
  on public.team_constraints (group_id, least(player_a, player_b), greatest(player_a, player_b));
create index team_constraints_player_a_idx on public.team_constraints (player_a);
create index team_constraints_player_b_idx on public.team_constraints (player_b);
comment on table public.team_constraints is
  'Restricciones persistentes del grupo para el armado de equipos: pares que juegan juntos o separados.';

create table public.player_skill_history (
  group_id uuid not null,
  player_id uuid not null,
  match_id uuid not null,
  skill numeric(4, 2) not null check (skill between 1 and 10),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  performance numeric(4, 2) check (performance is null or performance between 1 and 10),
  engine_version text not null check (char_length(engine_version) between 1 and 32),
  computed_at timestamptz not null default now(),
  primary key (player_id, match_id, engine_version),
  constraint player_skill_history_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete cascade,
  constraint player_skill_history_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade
);
create index player_skill_history_group_version_idx
  on public.player_skill_history (group_id, engine_version);
create index player_skill_history_match_idx on public.player_skill_history (match_id);
comment on table public.player_skill_history is
  'Caché reconstruible del motor de valoración (habilidad tras cada partido). Se reemplaza entera por grupo y versión.';
comment on column public.player_skill_history.performance is 'Rendimiento P del partido (null si no hubo votos válidos).';

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

create trigger team_constraints_audit after insert or update or delete on public.team_constraints
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.team_constraints enable row level security;
alter table public.player_skill_history enable row level security;

-- team_constraints (sin edición: se borra y se vuelve a crear)
create policy team_constraints_select on public.team_constraints for select to authenticated
  using (public.is_group_member(group_id));
create policy team_constraints_insert_admin on public.team_constraints for insert to authenticated
  with check (public.is_group_admin(group_id));
create policy team_constraints_delete_admin on public.team_constraints for delete to authenticated
  using (public.is_group_admin(group_id));

-- player_skill_history (escritura solo vía replace_skill_history)
create policy player_skill_history_select on public.player_skill_history for select to authenticated
  using (public.is_group_member(group_id));

revoke all on table public.team_constraints, public.player_skill_history from anon, authenticated;

grant select on table public.team_constraints, public.player_skill_history to authenticated;
grant insert (group_id, player_a, player_b, kind, note), delete
  on public.team_constraints to authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Reemplaza la caché del motor para un grupo y una versión. Cualquier miembro
-- puede refrescarla: los valores son deterministas a partir de datos que ya ve.
-- p_rows: [{player_id, match_id, skill, confidence, performance?}]
create or replace function public.replace_skill_history(
  p_group_id uuid,
  p_engine_version text,
  p_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_players uuid[];
  v_matches uuid[];
  v_skills numeric[];
  v_confidences numeric[];
  v_performances numeric[];
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'group_not_found';
  end if;
  if p_engine_version is null or char_length(p_engine_version) not between 1 and 32 then
    raise exception 'invalid_skill_history';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_skill_history';
  end if;

  v_count := jsonb_array_length(p_rows);
  if v_count > 5000 then
    raise exception 'too_many_rows';
  end if;

  begin
    select
      coalesce(array_agg((x.e ->> 'player_id')::uuid order by x.ord), '{}'),
      coalesce(array_agg((x.e ->> 'match_id')::uuid order by x.ord), '{}'),
      coalesce(array_agg((x.e ->> 'skill')::numeric order by x.ord), '{}'),
      coalesce(array_agg((x.e ->> 'confidence')::numeric order by x.ord), '{}'),
      coalesce(array_agg((x.e ->> 'performance')::numeric order by x.ord), '{}')
    into v_players, v_matches, v_skills, v_confidences, v_performances
    from jsonb_array_elements(p_rows) with ordinality as x(e, ord);
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'invalid_skill_history';
  end;

  if exists (
    select 1
    from unnest(v_players, v_matches, v_skills, v_confidences, v_performances)
      as r(player_id, match_id, skill, confidence, performance)
    where r.player_id is null
       or r.match_id is null
       or r.skill is null or r.skill not between 1 and 10
       or r.confidence is null or r.confidence not between 0 and 1
       or (r.performance is not null and r.performance not between 1 and 10)
  ) then
    raise exception 'invalid_skill_history';
  end if;

  if (
    select count(distinct (r.player_id, r.match_id))
    from unnest(v_players, v_matches) as r(player_id, match_id)
  ) <> v_count then
    raise exception 'invalid_skill_history';
  end if;

  if exists (
    select 1 from unnest(v_players) x
    where not exists (select 1 from public.players p where p.id = x and p.group_id = p_group_id)
  ) then
    raise exception 'player_not_found';
  end if;

  if exists (
    select 1 from unnest(v_matches) x
    where not exists (select 1 from public.matches m where m.id = x and m.group_id = p_group_id)
  ) then
    raise exception 'match_not_found';
  end if;

  -- Serializa refrescos concurrentes del mismo grupo y versión.
  perform pg_advisory_xact_lock(hashtextextended('skill_history:' || p_group_id::text || ':' || p_engine_version, 0));

  delete from public.player_skill_history h
  where h.group_id = p_group_id and h.engine_version = p_engine_version;

  insert into public.player_skill_history
    (group_id, player_id, match_id, skill, confidence, performance, engine_version)
  select p_group_id, r.player_id, r.match_id, r.skill, r.confidence, r.performance, p_engine_version
  from unnest(v_players, v_matches, v_skills, v_confidences, v_performances)
    as r(player_id, match_id, skill, confidence, performance);

  return v_count;
end;
$$;

-- Cara a cara entre dos jugadores en partidos finalizados del grupo: como
-- compañeros (resultado del equipo) y como rivales (desde el punto de vista de A).
-- SECURITY INVOKER: player_match_lines respeta la RLS de quien consulta.
create or replace function public.get_head_to_head(
  p_group_id uuid,
  p_player_a uuid,
  p_player_b uuid
)
returns table (
  together_matches integer,
  together_wins integer,
  together_draws integer,
  together_losses integer,
  against_matches integer,
  a_wins integer,
  b_wins integer,
  draws integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with a as (
    select l.match_id, l.team_id, l.result
    from public.player_match_lines l
    where l.group_id = p_group_id and l.player_id = p_player_a
  ),
  b as (
    select l.match_id, l.team_id
    from public.player_match_lines l
    where l.group_id = p_group_id and l.player_id = p_player_b
  ),
  pairs as (
    select a.result, a.team_id = b.team_id as same_team
    from a
    join b on b.match_id = a.match_id
    where p_player_a <> p_player_b
  )
  select
    count(*) filter (where same_team)::integer,
    count(*) filter (where same_team and result = 'win')::integer,
    count(*) filter (where same_team and result = 'draw')::integer,
    count(*) filter (where same_team and result = 'loss')::integer,
    count(*) filter (where not same_team)::integer,
    count(*) filter (where not same_team and result = 'win')::integer,
    count(*) filter (where not same_team and result = 'loss')::integer,
    count(*) filter (where not same_team and result = 'draw')::integer
  from pairs;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución
-- -----------------------------------------------------------------------------

revoke execute on function
  public.replace_skill_history(uuid, text, jsonb),
  public.get_head_to_head(uuid, uuid, uuid)
from public, anon;

grant execute on function
  public.replace_skill_history(uuid, text, jsonb),
  public.get_head_to_head(uuid, uuid, uuid)
to authenticated;
