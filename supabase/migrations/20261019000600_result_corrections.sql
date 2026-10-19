-- =============================================================================
-- FUTBOLEROS · 0006 · Correcciones de equipos y resultado
-- * set_match_teams: si una corrección de equipos saca del partido al MVP, se
--   borra (sea del admin o de los votos). Antes quedaba un MVP que no jugó y
--   "Corregir resultado" fallaba con player_not_in_match. Con el MVP por votos
--   en null, finalize_match_voting lo vuelve a elegir con los votos que quedan
--   (los del jugador sacado se borran en cascada con team_members).
-- * record_match_result: p_notes = '' borra las notas (null las deja como están).
-- Mismas firmas: create or replace conserva los permisos de ejecución.
-- =============================================================================

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

  -- El MVP tiene que haber jugado: si quedó afuera de los dos equipos, se borra.
  if v_match.mvp_player_id is not null and v_match.mvp_player_id <> all (v_a || v_b) then
    update public.matches m set mvp_player_id = null, mvp_source = null where m.id = p_match_id;
  end if;

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

-- Notas del resultado: null = no tocar; '' (o solo espacios) = borrarlas. Antes
-- un texto vacío dejaba las notas viejas y no había forma de borrarlas desde
-- "Corregir resultado".
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
    notes = case when p_notes is null then m.notes else nullif(btrim(p_notes), '') end,
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
