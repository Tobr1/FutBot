-- =============================================================================
-- Voto al mejor gol
--
-- Además de calificar y elegir al MVP, cada jugador del partido puede elegir
-- quién hizo el mejor gol: solo entre los que hicieron al menos un gol (los
-- goles en contra no cuentan) y nunca a sí mismo. Es anónimo como los demás
-- votos y se puede cambiar hasta el cierre. Al cerrar gana el más votado;
-- si empatan, desempata quien hizo más goles en el partido y después el
-- mejor promedio corregido. Con empate total no hay mejor gol.
--
-- El ganador queda en matches.best_goal_player_id y suma a su valoración
-- (lo aplica el motor, en la app) y a sus estadísticas.
-- =============================================================================

alter table public.matches
  add column best_goal_player_id uuid,
  -- Se fija al decidir el mejor gol al cierre, haya ganador o no: así no se
  -- vuelve a calcular en cada visita.
  add column best_goal_decided_at timestamptz,
  add constraint matches_best_goal_fkey foreign key (best_goal_player_id, group_id)
    references public.players (id, group_id),
  add constraint matches_best_goal_decided_check check (best_goal_player_id is null or best_goal_decided_at is not null);

comment on column public.matches.best_goal_player_id is 'Ganador del voto al mejor gol (lo fija finalize_match_voting).';

-- Las votaciones que ya cerraron no tuvieron voto al mejor gol: quedan decididas sin ganador.
update public.matches
set best_goal_decided_at = voting_closes_at
where status = 'finished' and voting_closes_at is not null and voting_closes_at <= now();

create table public.match_best_goal_votes (
  match_id uuid not null,
  group_id uuid not null,
  voter_player_id uuid not null,
  -- Quién votó realmente (la lectura se restringe a esta cuenta).
  voter_profile_id uuid not null references public.profiles (id) on delete cascade,
  candidate_player_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, voter_player_id),
  constraint match_best_goal_votes_not_self check (voter_player_id <> candidate_player_id),
  constraint match_best_goal_votes_voter_fkey foreign key (match_id, voter_player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_best_goal_votes_candidate_fkey foreign key (match_id, candidate_player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_best_goal_votes_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade
);
create index match_best_goal_votes_candidate_idx on public.match_best_goal_votes (match_id, candidate_player_id);
create index match_best_goal_votes_voter_profile_idx on public.match_best_goal_votes (voter_profile_id);

comment on table public.match_best_goal_votes is
  'Voto anónimo al mejor gol: uno por jugador y partido. Solo lo lee quien votó; sin auditoría para no registrar identidades.';

create trigger match_best_goal_votes_set_updated_at before update on public.match_best_goal_votes
  for each row execute function public.set_updated_at();

alter table public.match_best_goal_votes enable row level security;

create policy match_best_goal_votes_select_own on public.match_best_goal_votes for select to authenticated
  using (voter_profile_id = (select auth.uid()));

revoke all on table public.match_best_goal_votes from anon, authenticated;
grant select on table public.match_best_goal_votes to authenticated;

-- -----------------------------------------------------------------------------
-- Si una corrección del resultado le saca todos los goles al ganador, deja
-- de ser el mejor gol. Corre al final de la transacción porque
-- record_match_result borra los eventos y los vuelve a cargar.
-- -----------------------------------------------------------------------------

create or replace function public.match_events_keep_best_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.event_type = 'goal' and old.player_id is not null and not exists (
    select 1 from public.match_events e
    where e.match_id = old.match_id and e.player_id = old.player_id and e.event_type = 'goal'
  ) then
    update public.matches m set best_goal_player_id = null
    where m.id = old.match_id and m.best_goal_player_id = old.player_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.match_events_keep_best_goal() from public, anon, authenticated;

create constraint trigger match_events_keep_best_goal
  after delete or update on public.match_events
  deferrable initially deferred
  for each row execute function public.match_events_keep_best_goal();

-- -----------------------------------------------------------------------------
-- Envío conjunto: calificaciones, MVP y mejor gol (todos opcionales, al
-- menos uno), en una sola transacción.
-- -----------------------------------------------------------------------------

drop function public.submit_match_votes(uuid, jsonb, uuid);

create function public.submit_match_votes(
  p_match_id uuid,
  p_ratings jsonb default '[]'::jsonb,
  p_mvp_player_id uuid default null,
  p_best_goal_player_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_voter uuid;
  v_has_ratings boolean := p_ratings is not null and jsonb_typeof(p_ratings) = 'array' and jsonb_array_length(p_ratings) > 0;
begin
  if not v_has_ratings and p_mvp_player_id is null and p_best_goal_player_id is null then
    raise exception 'invalid_ratings';
  end if;

  -- Valida sesión, partido, ventana, participación y autovoto.
  if v_has_ratings then
    perform public.submit_match_ratings(p_match_id, p_ratings);
  end if;

  if p_mvp_player_id is null and p_best_goal_player_id is null then
    return;
  end if;

  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_match from public.matches m where m.id = p_match_id;
  if not found or not public.is_group_member(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'finished' or v_match.voting_closes_at is null then
    raise exception 'voting_not_open';
  end if;
  if now() >= v_match.voting_closes_at then
    raise exception 'voting_closed';
  end if;

  select tm.player_id into v_voter
  from public.team_members tm
  join public.players p on p.id = tm.player_id
  where tm.match_id = p_match_id and p.profile_id = v_uid;
  if v_voter is null then
    raise exception 'not_a_participant';
  end if;

  if p_mvp_player_id is not null then
    if p_mvp_player_id = v_voter then
      raise exception 'cannot_rate_self';
    end if;
    if not exists (
      select 1 from public.team_members tm where tm.match_id = p_match_id and tm.player_id = p_mvp_player_id
    ) then
      raise exception 'rated_not_in_match';
    end if;

    insert into public.match_mvp_votes (match_id, group_id, voter_player_id, voter_profile_id, candidate_player_id)
    values (p_match_id, v_match.group_id, v_voter, v_uid, p_mvp_player_id)
    on conflict (match_id, voter_player_id)
      do update set candidate_player_id = excluded.candidate_player_id, voter_profile_id = excluded.voter_profile_id;
  end if;

  if p_best_goal_player_id is not null then
    if p_best_goal_player_id = v_voter then
      raise exception 'cannot_rate_self';
    end if;
    -- Un gol a favor cargado con su autor (el evento ya garantiza que jugó).
    if not exists (
      select 1 from public.match_events e
      where e.match_id = p_match_id and e.player_id = p_best_goal_player_id and e.event_type = 'goal'
    ) then
      raise exception 'best_goal_not_scorer';
    end if;

    insert into public.match_best_goal_votes (match_id, group_id, voter_player_id, voter_profile_id, candidate_player_id)
    values (p_match_id, v_match.group_id, v_voter, v_uid, p_best_goal_player_id)
    on conflict (match_id, voter_player_id)
      do update set candidate_player_id = excluded.candidate_player_id, voter_profile_id = excluded.voter_profile_id;
  end if;
end;
$$;

revoke execute on function public.submit_match_votes(uuid, jsonb, uuid, uuid) from public, anon;
grant execute on function public.submit_match_votes(uuid, jsonb, uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Progreso: cuenta como votante quien calificó, eligió MVP o mejor gol.
-- -----------------------------------------------------------------------------

create or replace function public.get_voting_progress(p_match_id uuid)
returns table (eligible_voters integer, voters integer, closes_at timestamptz, is_open boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer
       from public.team_members tm
       join public.players p on p.id = tm.player_id
      where tm.match_id = m.id and p.profile_id is not null),
    (select count(*)::integer from (
       select r.rater_player_id from public.match_ratings r where r.match_id = m.id
       union
       select v.voter_player_id from public.match_mvp_votes v where v.match_id = m.id
       union
       select v.voter_player_id from public.match_best_goal_votes v where v.match_id = m.id
     ) voters),
    m.voting_closes_at,
    m.status = 'finished' and m.voting_closes_at is not null and now() < m.voting_closes_at
  from public.matches m
  where m.id = p_match_id and public.is_group_member(m.group_id);
$$;

-- -----------------------------------------------------------------------------
-- Mejor gol al cierre (lo llama finalize_match_voting con el partido
-- bloqueado). Solo cuentan los votos a quienes siguen teniendo goles.
-- -----------------------------------------------------------------------------

create or replace function public._finalize_best_goal(p_match_id uuid, p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_rank integer := 0;
  v_winner uuid;
  v_votes integer;
  v_goals integer;
  v_average numeric;
begin
  -- Más votos; empate: más goles en el partido, mejor promedio corregido.
  for r in
    with c as (
      select v.candidate_player_id as player_id, count(*)::integer as best_goal_votes
      from public.match_best_goal_votes v
      where v.match_id = p_match_id
      group by v.candidate_player_id
    ), g as (
      select e.player_id, count(*)::integer as goals
      from public.match_events e
      where e.match_id = p_match_id and e.event_type = 'goal' and e.player_id is not null
      group by e.player_id
    )
    select c.player_id, c.best_goal_votes, g.goals, a.adjusted_average
    from c
    join g on g.player_id = c.player_id
    left join public.get_rating_aggregates(p_group_id, p_match_id) a on a.player_id = c.player_id
    order by c.best_goal_votes desc, g.goals desc, a.adjusted_average desc nulls last
    limit 2
  loop
    v_rank := v_rank + 1;
    if v_rank = 1 then
      v_winner := r.player_id;
      v_votes := r.best_goal_votes;
      v_goals := r.goals;
      v_average := r.adjusted_average;
    elsif r.best_goal_votes = v_votes and r.goals = v_goals and r.adjusted_average is not distinct from v_average then
      -- Empate total con el segundo: no hay mejor gol.
      v_winner := null;
    end if;
  end loop;

  update public.matches
  set best_goal_player_id = v_winner, best_goal_decided_at = now()
  where id = p_match_id;
end;
$$;

revoke execute on function public._finalize_best_goal(uuid, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Cierre: decide el mejor gol (una vez) y el MVP como antes.
-- -----------------------------------------------------------------------------

create or replace function public.finalize_match_voting(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_first record;
  v_second record;
begin
  select * into v_match from public.matches m where m.id = p_match_id for update;
  if not found or not public.is_group_member(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'finished' or v_match.voting_closes_at is null or now() < v_match.voting_closes_at then
    return v_match.mvp_player_id;
  end if;

  if v_match.best_goal_decided_at is null then
    perform public._finalize_best_goal(p_match_id, v_match.group_id);
  end if;

  if v_match.mvp_source is not null then
    return v_match.mvp_player_id;
  end if;

  if exists (select 1 from public.match_mvp_votes v where v.match_id = p_match_id) then
    -- Más votos de MVP; empate: mejor promedio corregido, más calificaciones, mejor promedio crudo.
    select r.* into v_first from (
    with c as (
      select v.candidate_player_id as player_id, count(*)::integer as mvp_votes
      from public.match_mvp_votes v
      where v.match_id = p_match_id
      group by v.candidate_player_id
    )
    select c.player_id, c.mvp_votes, a.adjusted_average, a.votes, a.raw_average
    from c
    left join public.get_rating_aggregates(v_match.group_id, p_match_id) a on a.player_id = c.player_id
    ) r
    order by r.mvp_votes desc, r.adjusted_average desc nulls last, r.votes desc nulls last, r.raw_average desc nulls last
    limit 1;

    select r.* into v_second from (
    with c as (
      select v.candidate_player_id as player_id, count(*)::integer as mvp_votes
      from public.match_mvp_votes v
      where v.match_id = p_match_id
      group by v.candidate_player_id
    )
    select c.player_id, c.mvp_votes, a.adjusted_average, a.votes, a.raw_average
    from c
    left join public.get_rating_aggregates(v_match.group_id, p_match_id) a on a.player_id = c.player_id
    ) r
    where r.player_id <> v_first.player_id
    order by r.mvp_votes desc, r.adjusted_average desc nulls last, r.votes desc nulls last, r.raw_average desc nulls last
    limit 1;

    -- Empate total: decide un admin.
    if v_second.player_id is not null
       and v_second.mvp_votes = v_first.mvp_votes
       and v_second.adjusted_average is not distinct from v_first.adjusted_average
       and v_second.votes is not distinct from v_first.votes
       and v_second.raw_average is not distinct from v_first.raw_average then
      return null;
    end if;
  else
    select a.player_id, a.adjusted_average, a.votes, a.raw_average
    into v_first
    from public.get_rating_aggregates(v_match.group_id, p_match_id) a
    where a.votes >= 3
    order by a.adjusted_average desc, a.votes desc, a.raw_average desc
    limit 1;

    if v_first.player_id is null then
      return null;
    end if;

    select a.player_id, a.adjusted_average, a.votes, a.raw_average
    into v_second
    from public.get_rating_aggregates(v_match.group_id, p_match_id) a
    where a.votes >= 3 and a.player_id <> v_first.player_id
    order by a.adjusted_average desc, a.votes desc, a.raw_average desc
    limit 1;

    if v_second.player_id is not null
       and v_second.adjusted_average = v_first.adjusted_average
       and v_second.votes = v_first.votes
       and v_second.raw_average = v_first.raw_average then
      return null;
    end if;
  end if;

  update public.matches set mvp_player_id = v_first.player_id, mvp_source = 'votes'
  where id = p_match_id;

  return v_first.player_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Estadísticas: el mejor gol en cada línea y en los totales.
-- -----------------------------------------------------------------------------

create or replace view public.player_match_lines
with (security_invoker = true)
as
select
  tm.match_id,
  tm.group_id,
  tm.player_id,
  tm.team_id,
  t.side,
  m.scheduled_at,
  t.score as goals_for,
  o.score as goals_against,
  case
    when t.score > o.score then 'win'
    when t.score = o.score then 'draw'
    else 'loss'
  end as result,
  coalesce(ev.goals, 0)::integer as goals,
  coalesce(ev.assists, 0)::integer as assists,
  coalesce(ev.own_goals, 0)::integer as own_goals,
  coalesce(m.mvp_player_id = tm.player_id, false) as is_mvp,
  coalesce(m.best_goal_player_id = tm.player_id, false) as is_best_goal
from public.team_members tm
join public.matches m on m.id = tm.match_id and m.status = 'finished'
join public.teams t on t.id = tm.team_id
join public.teams o on o.match_id = tm.match_id and o.side <> t.side
left join lateral (
  select
    count(*) filter (where e.event_type = 'goal') as goals,
    count(*) filter (where e.event_type = 'assist') as assists,
    count(*) filter (where e.event_type = 'own_goal') as own_goals
  from public.match_events e
  where e.match_id = tm.match_id and e.player_id = tm.player_id
) ev on true
where t.score is not null and o.score is not null;

drop function public.get_player_stats(uuid, date, date);

create function public.get_player_stats(
  p_group_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  player_id uuid,
  matches integer,
  wins integer,
  draws integer,
  losses integer,
  goals integer,
  assists integer,
  own_goals integer,
  mvps integer,
  best_goals integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    l.player_id,
    count(*)::integer,
    count(*) filter (where l.result = 'win')::integer,
    count(*) filter (where l.result = 'draw')::integer,
    count(*) filter (where l.result = 'loss')::integer,
    sum(l.goals)::integer,
    sum(l.assists)::integer,
    sum(l.own_goals)::integer,
    count(*) filter (where l.is_mvp)::integer,
    count(*) filter (where l.is_best_goal)::integer
  from public.player_match_lines l
  join public.groups g on g.id = l.group_id
  where l.group_id = p_group_id
    and (p_from is null or (l.scheduled_at at time zone g.timezone)::date >= p_from)
    and (p_to is null or (l.scheduled_at at time zone g.timezone)::date <= p_to)
  group by l.player_id;
$$;

revoke execute on function public.get_player_stats(uuid, date, date) from public, anon;
grant execute on function public.get_player_stats(uuid, date, date) to authenticated;
