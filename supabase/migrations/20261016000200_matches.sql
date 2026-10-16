-- =============================================================================
-- FUTBOLEROS · 0002 · Partidos
-- Partidos, convocatoria, equipos, integrantes y eventos (goles/asistencias).
-- Las escrituras de varios pasos se hacen solo por RPC transaccionales.
-- =============================================================================

create type public.match_status as enum ('scheduled', 'in_progress', 'finished', 'cancelled');
create type public.participant_status as enum ('confirmed', 'reserve', 'dropped');
create type public.team_side as enum ('a', 'b');
create type public.match_event_type as enum ('goal', 'own_goal', 'assist');

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  scheduled_at timestamptz not null,
  venue text check (venue is null or char_length(venue) <= 80),
  players_per_team smallint not null check (players_per_team between 3 and 11),
  status public.match_status not null default 'scheduled',
  notes text check (notes is null or char_length(notes) <= 500),
  finished_at timestamptz,
  voting_closes_at timestamptz,
  mvp_player_id uuid,
  mvp_source text check (mvp_source in ('votes', 'admin')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_id_group_key unique (id, group_id),
  constraint matches_mvp_fkey foreign key (mvp_player_id, group_id)
    references public.players (id, group_id),
  constraint matches_finished_check check (status <> 'finished' or finished_at is not null),
  constraint matches_mvp_consistency_check check ((mvp_player_id is null) = (mvp_source is null))
);
create index matches_group_scheduled_idx on public.matches (group_id, scheduled_at desc);
comment on column public.matches.voting_closes_at is 'Se fija al finalizar: finished_at + groups.voting_window_hours.';

create table public.match_participants (
  match_id uuid not null,
  group_id uuid not null,
  player_id uuid not null,
  status public.participant_status not null default 'confirmed',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (match_id, player_id),
  constraint match_participants_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade,
  -- Un jugador con partidos no se puede borrar: se desactiva.
  constraint match_participants_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete restrict
);
create index match_participants_player_idx on public.match_participants (group_id, player_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  group_id uuid not null,
  side public.team_side not null,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  score smallint check (score between 0 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_match_side_key unique (match_id, side),
  constraint teams_id_match_key unique (id, match_id),
  constraint teams_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade
);
comment on column public.teams.score is 'Resultado oficial. Los goles con autor pueden ser menos, nunca más.';

create table public.team_members (
  match_id uuid not null,
  team_id uuid not null,
  group_id uuid not null,
  player_id uuid not null,
  primary key (match_id, player_id),
  constraint team_members_team_fkey foreign key (team_id, match_id)
    references public.teams (id, match_id) on delete cascade,
  constraint team_members_participant_fkey foreign key (match_id, player_id)
    references public.match_participants (match_id, player_id) on delete cascade,
  constraint team_members_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade
);
create index team_members_team_idx on public.team_members (team_id);
create index team_members_player_idx on public.team_members (group_id, player_id);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  group_id uuid not null,
  team_id uuid not null,
  player_id uuid,
  event_type public.match_event_type not null,
  minute smallint check (minute between 0 and 200),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint match_events_team_fkey foreign key (team_id, match_id)
    references public.teams (id, match_id) on delete cascade,
  constraint match_events_member_fkey foreign key (match_id, player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_events_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade,
  constraint match_events_player_check check (event_type = 'own_goal' or player_id is not null)
);
create index match_events_match_idx on public.match_events (match_id);
create index match_events_player_idx on public.match_events (group_id, player_id) where player_id is not null;
comment on column public.match_events.team_id is 'Equipo acreditado: el del autor en goles/asistencias, el rival en goles en contra.';

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

-- Las ediciones directas de un admin no pueden finalizar ni "des-finalizar"
-- un partido: eso pasa solo por record_match_result (con auditoría).
create or replace function public.matches_guard_direct_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.status = 'finished' and old.status <> 'finished' then
    raise exception 'use_record_result';
  end if;
  if old.status = 'finished' and new.status <> 'finished' then
    raise exception 'match_locked';
  end if;
  return new;
end;
$$;

create trigger matches_guard_direct_update before update on public.matches
  for each row execute function public.matches_guard_direct_update();

-- Coherencia entre autor y equipo acreditado.
create or replace function public.match_events_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_player_team uuid;
begin
  if new.player_id is null then
    return new;
  end if;

  select tm.team_id into v_player_team
  from public.team_members tm
  where tm.match_id = new.match_id and tm.player_id = new.player_id;

  if new.event_type in ('goal', 'assist') and v_player_team is distinct from new.team_id then
    raise exception 'event_team_mismatch';
  end if;
  if new.event_type = 'own_goal' and v_player_team = new.team_id then
    raise exception 'event_team_mismatch';
  end if;

  return new;
end;
$$;

create trigger match_events_validate before insert or update on public.match_events
  for each row execute function public.match_events_validate();

create trigger matches_audit after insert or update or delete on public.matches
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.match_events enable row level security;

create policy matches_select on public.matches for select to authenticated
  using (public.is_group_member(group_id));
create policy matches_update_admin on public.matches for update to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));
create policy matches_delete_admin on public.matches for delete to authenticated
  using (public.is_group_admin(group_id) and status <> 'finished');

create policy match_participants_select on public.match_participants for select to authenticated
  using (public.is_group_member(group_id));
create policy teams_select on public.teams for select to authenticated
  using (public.is_group_member(group_id));
create policy team_members_select on public.team_members for select to authenticated
  using (public.is_group_member(group_id));
create policy match_events_select on public.match_events for select to authenticated
  using (public.is_group_member(group_id));

revoke all on table
  public.matches, public.match_participants, public.teams, public.team_members, public.match_events
from anon, authenticated;

grant select on table
  public.matches, public.match_participants, public.teams, public.team_members, public.match_events
to authenticated;
grant update (scheduled_at, venue, players_per_team, notes, status), delete
  on public.matches to authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Valida y normaliza una convocatoria: [{player_id, status?}] en orden.
create or replace function public._apply_match_participants(
  p_match_id uuid,
  p_group_id uuid,
  p_participants jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' then
    raise exception 'invalid_participants';
  end if;
  if jsonb_array_length(p_participants) > 60 then
    raise exception 'too_many_participants';
  end if;

  select coalesce(array_agg((e.value ->> 'player_id')::uuid), '{}')
  into v_ids
  from jsonb_array_elements(p_participants) e;

  if cardinality(v_ids) <> (select count(distinct x) from unnest(v_ids) x) then
    raise exception 'duplicate_participant';
  end if;

  if exists (
    select 1 from unnest(v_ids) x
    where not exists (
      select 1 from public.players p where p.id = x and p.group_id = p_group_id
    )
  ) then
    raise exception 'player_not_found';
  end if;

  delete from public.match_participants mp
  where mp.match_id = p_match_id and mp.player_id <> all (v_ids);

  insert into public.match_participants (match_id, group_id, player_id, status, sort_order)
  select
    p_match_id,
    p_group_id,
    (e.value ->> 'player_id')::uuid,
    coalesce((e.value ->> 'status')::public.participant_status, 'confirmed'),
    (e.ordinality - 1)::smallint
  from jsonb_array_elements(p_participants) with ordinality e
  on conflict (match_id, player_id) do update
    set status = excluded.status, sort_order = excluded.sort_order;

  -- Quien deja de estar confirmado sale de los equipos.
  delete from public.team_members tm
  using public.match_participants mp
  where tm.match_id = p_match_id
    and mp.match_id = tm.match_id
    and mp.player_id = tm.player_id
    and mp.status <> 'confirmed';
end;
$$;

-- Crea un partido con su convocatoria y los dos equipos vacíos.
create or replace function public.create_match(
  p_group_id uuid,
  p_scheduled_at timestamptz,
  p_players_per_team smallint,
  p_venue text default null,
  p_notes text default null,
  p_participants jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_id uuid;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'forbidden';
  end if;

  insert into public.matches (group_id, scheduled_at, players_per_team, venue, notes, created_by)
  values (
    p_group_id,
    p_scheduled_at,
    p_players_per_team,
    nullif(btrim(p_venue), ''),
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning id into v_match_id;

  insert into public.teams (match_id, group_id, side, name)
  values (v_match_id, p_group_id, 'a', 'Azul'), (v_match_id, p_group_id, 'b', 'Rojo');

  perform public._apply_match_participants(v_match_id, p_group_id, p_participants);

  return v_match_id;
end;
$$;

-- Reemplaza la convocatoria de un partido no finalizado.
create or replace function public.set_match_participants(p_match_id uuid, p_participants jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  select * into v_match from public.matches m where m.id = p_match_id for update;
  if not found or not public.is_group_admin(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if v_match.status in ('finished', 'cancelled') then
    raise exception 'match_locked';
  end if;

  perform public._apply_match_participants(p_match_id, v_match.group_id, p_participants);
end;
$$;

-- Guarda la composición de ambos equipos. En un partido finalizado funciona
-- como corrección: se descartan eventos que dejan de ser coherentes y se audita.
create or replace function public.set_match_teams(
  p_match_id uuid,
  p_team_a uuid[],
  p_team_b uuid[],
  p_name_a text default null,
  p_name_b text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_team_a uuid;
  v_team_b uuid;
  v_a uuid[] := coalesce(p_team_a, '{}');
  v_b uuid[] := coalesce(p_team_b, '{}');
  v_old jsonb;
begin
  select * into v_match from public.matches m where m.id = p_match_id for update;
  if not found or not public.is_group_admin(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if v_match.status = 'cancelled' then
    raise exception 'match_locked';
  end if;

  if exists (select 1 from unnest(v_a) x where x = any (v_b)) then
    raise exception 'player_in_both_teams';
  end if;
  if cardinality(v_a) <> (select count(distinct x) from unnest(v_a) x)
     or cardinality(v_b) <> (select count(distinct x) from unnest(v_b) x) then
    raise exception 'duplicate_participant';
  end if;
  if exists (
    select 1 from unnest(v_a || v_b) x
    where not exists (
      select 1 from public.match_participants mp
      where mp.match_id = p_match_id and mp.player_id = x and mp.status = 'confirmed'
    )
  ) then
    raise exception 'player_not_in_match';
  end if;

  if v_match.status = 'finished' and (cardinality(v_a) = 0 or cardinality(v_b) = 0) then
    raise exception 'teams_not_set';
  end if;

  select jsonb_object_agg(t.side, coalesce(
    (select jsonb_agg(tm.player_id order by tm.player_id) from public.team_members tm where tm.team_id = t.id),
    '[]'::jsonb))
  into v_old
  from public.teams t where t.match_id = p_match_id;

  insert into public.teams as t (match_id, group_id, side, name)
  values
    (p_match_id, v_match.group_id, 'a', coalesce(nullif(btrim(p_name_a), ''), 'Azul')),
    (p_match_id, v_match.group_id, 'b', coalesce(nullif(btrim(p_name_b), ''), 'Rojo'))
  on conflict (match_id, side) do update
    set name = coalesce(nullif(btrim(case when excluded.side = 'a' then p_name_a else p_name_b end), ''), t.name);

  select t.id into v_team_a from public.teams t where t.match_id = p_match_id and t.side = 'a';
  select t.id into v_team_b from public.teams t where t.match_id = p_match_id and t.side = 'b';

  delete from public.team_members tm
  where tm.match_id = p_match_id and tm.player_id <> all (v_a || v_b);

  insert into public.team_members (match_id, team_id, group_id, player_id)
  select p_match_id, v_team_a, v_match.group_id, x from unnest(v_a) x
  on conflict (match_id, player_id) do update set team_id = excluded.team_id;

  insert into public.team_members (match_id, team_id, group_id, player_id)
  select p_match_id, v_team_b, v_match.group_id, x from unnest(v_b) x
  on conflict (match_id, player_id) do update set team_id = excluded.team_id;

  if v_match.status = 'finished' then
    -- Eventos que quedaron con el equipo equivocado tras mover jugadores.
    delete from public.match_events e
    using public.team_members tm
    where e.match_id = p_match_id
      and tm.match_id = e.match_id
      and tm.player_id = e.player_id
      and (
        (e.event_type in ('goal', 'assist') and e.team_id <> tm.team_id)
        or (e.event_type = 'own_goal' and e.team_id = tm.team_id)
      );

    insert into public.audit_logs (group_id, actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
      v_match.group_id, auth.uid(), 'teams_corrected', 'matches', p_match_id::text,
      v_old, jsonb_build_object('a', to_jsonb(v_a), 'b', to_jsonb(v_b))
    );
  end if;
end;
$$;

-- Registra o corrige el resultado completo de un partido en una transacción.
-- p_events: [{event_type: goal|own_goal|assist, player_id?, team_side?, minute?}]
--   * goal/assist: player_id obligatorio; el equipo sale del jugador.
--   * own_goal: player_id (del equipo que lo comete) o team_side acreditado.
create or replace function public.record_match_result(
  p_match_id uuid,
  p_score_a smallint,
  p_score_b smallint,
  p_events jsonb default '[]'::jsonb,
  p_mvp_player_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_team_a uuid;
  v_team_b uuid;
  v_window smallint;
  v_event jsonb;
  v_type public.match_event_type;
  v_player uuid;
  v_player_team uuid;
  v_credited uuid;
  v_old jsonb;
  v_new jsonb;
begin
  select * into v_match from public.matches m where m.id = p_match_id for update;
  if not found or not public.is_group_admin(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if v_match.status = 'cancelled' then
    raise exception 'match_locked';
  end if;
  if p_score_a is null or p_score_b is null or p_score_a < 0 or p_score_b < 0 then
    raise exception 'invalid_score';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 300 then
    raise exception 'invalid_events';
  end if;

  select t.id into v_team_a from public.teams t where t.match_id = p_match_id and t.side = 'a';
  select t.id into v_team_b from public.teams t where t.match_id = p_match_id and t.side = 'b';
  if v_team_a is null or v_team_b is null
     or not exists (select 1 from public.team_members tm where tm.team_id = v_team_a)
     or not exists (select 1 from public.team_members tm where tm.team_id = v_team_b) then
    raise exception 'teams_not_set';
  end if;

  if p_mvp_player_id is not null and not exists (
    select 1 from public.team_members tm where tm.match_id = p_match_id and tm.player_id = p_mvp_player_id
  ) then
    raise exception 'player_not_in_match';
  end if;

  v_old := jsonb_build_object(
    'status', v_match.status,
    'score_a', (select t.score from public.teams t where t.id = v_team_a),
    'score_b', (select t.score from public.teams t where t.id = v_team_b),
    'mvp_player_id', v_match.mvp_player_id,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('type', e.event_type, 'player_id', e.player_id, 'team_id', e.team_id)
                       order by e.created_at, e.id)
      from public.match_events e where e.match_id = p_match_id
    ), '[]'::jsonb)
  );

  update public.teams set score = p_score_a where id = v_team_a;
  update public.teams set score = p_score_b where id = v_team_b;
  delete from public.match_events e where e.match_id = p_match_id;

  for v_event in select value from jsonb_array_elements(p_events) loop
    v_type := (v_event ->> 'event_type')::public.match_event_type;
    v_player := nullif(v_event ->> 'player_id', '')::uuid;
    v_player_team := null;

    if v_player is not null then
      select tm.team_id into v_player_team
      from public.team_members tm
      where tm.match_id = p_match_id and tm.player_id = v_player;
      if v_player_team is null then
        raise exception 'player_not_in_match';
      end if;
    end if;

    if v_type in ('goal', 'assist') then
      if v_player is null then
        raise exception 'invalid_events';
      end if;
      v_credited := v_player_team;
    elsif v_player is not null then
      v_credited := case when v_player_team = v_team_a then v_team_b else v_team_a end;
    else
      v_credited := case v_event ->> 'team_side' when 'a' then v_team_a when 'b' then v_team_b end;
      if v_credited is null then
        raise exception 'invalid_events';
      end if;
    end if;

    insert into public.match_events (match_id, group_id, team_id, player_id, event_type, minute)
    values (
      p_match_id, v_match.group_id, v_credited, v_player, v_type,
      nullif(v_event ->> 'minute', '')::smallint
    );
  end loop;

  if (select count(*) from public.match_events e
      where e.match_id = p_match_id and e.team_id = v_team_a and e.event_type in ('goal', 'own_goal')) > p_score_a
     or (select count(*) from public.match_events e
      where e.match_id = p_match_id and e.team_id = v_team_b and e.event_type in ('goal', 'own_goal')) > p_score_b then
    raise exception 'goals_exceed_score';
  end if;

  if (select count(*) from public.match_events e
      where e.match_id = p_match_id and e.team_id = v_team_a and e.event_type = 'assist')
     > (select count(*) from public.match_events e
      where e.match_id = p_match_id and e.team_id = v_team_a and e.event_type = 'goal')
     or (select count(*) from public.match_events e
      where e.match_id = p_match_id and e.team_id = v_team_b and e.event_type = 'assist')
     > (select count(*) from public.match_events e
      where e.match_id = p_match_id and e.team_id = v_team_b and e.event_type = 'goal') then
    raise exception 'assists_exceed_goals';
  end if;

  select g.voting_window_hours into v_window from public.groups g where g.id = v_match.group_id;

  update public.matches m set
    status = 'finished',
    finished_at = coalesce(m.finished_at, now()),
    voting_closes_at = coalesce(m.voting_closes_at, now() + make_interval(hours => v_window)),
    notes = coalesce(nullif(btrim(p_notes), ''), m.notes),
    mvp_player_id = case
      when p_mvp_player_id is not null then p_mvp_player_id
      when m.mvp_source = 'admin' then null
      else m.mvp_player_id
    end,
    mvp_source = case
      when p_mvp_player_id is not null then 'admin'
      when m.mvp_source = 'admin' then null
      else m.mvp_source
    end
  where m.id = p_match_id;

  v_new := jsonb_build_object(
    'status', 'finished',
    'score_a', p_score_a,
    'score_b', p_score_b,
    'mvp_player_id', p_mvp_player_id,
    'events', p_events
  );

  insert into public.audit_logs (group_id, actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_match.group_id,
    auth.uid(),
    case when v_match.status = 'finished' then 'result_corrected' else 'result_recorded' end,
    'matches',
    p_match_id::text,
    v_old,
    v_new
  );
end;
$$;

revoke execute on function
  public._apply_match_participants(uuid, uuid, jsonb),
  public.matches_guard_direct_update(),
  public.match_events_validate()
from public, anon, authenticated;

revoke execute on function
  public.create_match(uuid, timestamptz, smallint, text, text, jsonb),
  public.set_match_participants(uuid, jsonb),
  public.set_match_teams(uuid, uuid[], uuid[], text, text),
  public.record_match_result(uuid, smallint, smallint, jsonb, uuid, text)
from public, anon;

grant execute on function
  public.create_match(uuid, timestamptz, smallint, text, text, jsonb),
  public.set_match_participants(uuid, jsonb),
  public.set_match_teams(uuid, uuid[], uuid[], text, text),
  public.record_match_result(uuid, smallint, smallint, jsonb, uuid, text)
to authenticated;
