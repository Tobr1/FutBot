-- =============================================================================
-- FUTBOLEROS · 0003 · Votaciones y estadísticas
-- Votos anónimos 1-10, agregados publicados al cierre, MVP por votos y vistas
-- de estadísticas calculadas sobre los hechos (sin datos derivados guardados).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Votos
-- -----------------------------------------------------------------------------

create table public.match_ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  group_id uuid not null,
  rater_player_id uuid not null,
  -- Quién votó realmente: la lectura se restringe a esta cuenta aunque la
  -- ficha cambie de dueño más adelante.
  rater_profile_id uuid not null references public.profiles (id) on delete cascade,
  rated_player_id uuid not null,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_ratings_pair_key unique (match_id, rater_player_id, rated_player_id),
  constraint match_ratings_not_self check (rater_player_id <> rated_player_id),
  constraint match_ratings_rater_fkey foreign key (match_id, rater_player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_ratings_rated_fkey foreign key (match_id, rated_player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_ratings_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade
);
create index match_ratings_rated_idx on public.match_ratings (match_id, rated_player_id);
create index match_ratings_rater_profile_idx on public.match_ratings (rater_profile_id);
comment on table public.match_ratings is
  'Votos individuales. Solo los ve quien votó; sin auditoría por fila para preservar el anonimato.';

create trigger match_ratings_set_updated_at before update on public.match_ratings
  for each row execute function public.set_updated_at();

alter table public.match_ratings enable row level security;

create policy match_ratings_select_own on public.match_ratings for select to authenticated
  using (rater_profile_id = (select auth.uid()));

revoke all on table public.match_ratings from anon, authenticated;
grant select on table public.match_ratings to authenticated;

-- Emite o actualiza (hasta el cierre) los votos de la cuenta actual.
-- p_ratings: [{player_id, score}]
create or replace function public.submit_match_ratings(p_match_id uuid, p_ratings jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_rater uuid;
  v_item jsonb;
  v_rated uuid;
  v_score integer;
  v_count integer := 0;
begin
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

  select tm.player_id into v_rater
  from public.team_members tm
  join public.players p on p.id = tm.player_id
  where tm.match_id = p_match_id and p.profile_id = v_uid;
  if v_rater is null then
    raise exception 'not_a_participant';
  end if;

  if p_ratings is null or jsonb_typeof(p_ratings) <> 'array'
     or jsonb_array_length(p_ratings) = 0 or jsonb_array_length(p_ratings) > 40 then
    raise exception 'invalid_ratings';
  end if;

  for v_item in select value from jsonb_array_elements(p_ratings) loop
    v_rated := (v_item ->> 'player_id')::uuid;
    v_score := (v_item ->> 'score')::integer;

    if v_rated is null or v_rated = v_rater then
      raise exception 'cannot_rate_self';
    end if;
    if v_score is null or v_score < 1 or v_score > 10 then
      raise exception 'invalid_score';
    end if;
    if not exists (
      select 1 from public.team_members tm where tm.match_id = p_match_id and tm.player_id = v_rated
    ) then
      raise exception 'rated_not_in_match';
    end if;

    insert into public.match_ratings
      (match_id, group_id, rater_player_id, rater_profile_id, rated_player_id, score)
    values (p_match_id, v_match.group_id, v_rater, v_uid, v_rated, v_score)
    on conflict (match_id, rater_player_id, rated_player_id)
      do update set score = excluded.score;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Agregados por (partido, jugador) de votaciones CERRADAS. Nunca expone
-- votantes. adjusted_average corrige el sesgo de cada votante (si calificó a 3+
-- jugadores) y recorta máximo y mínimo cuando hay 5+ votos.
create or replace function public.get_rating_aggregates(p_group_id uuid, p_match_id uuid default null)
returns table (
  match_id uuid,
  player_id uuid,
  votes integer,
  raw_average numeric,
  adjusted_average numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with closed as (
    select m.id
    from public.matches m
    where m.group_id = p_group_id
      and public.is_group_member(p_group_id)
      and m.status = 'finished'
      and m.voting_closes_at is not null
      and m.voting_closes_at <= now()
      and (p_match_id is null or m.id = p_match_id)
  ),
  base as (
    select
      r.match_id,
      r.rated_player_id,
      r.score::numeric as score,
      avg(r.score) over (partition by r.match_id) as match_mean,
      avg(r.score) over (partition by r.match_id, r.rater_player_id) as rater_mean,
      count(*) over (partition by r.match_id, r.rater_player_id) as rater_votes
    from public.match_ratings r
    join closed c on c.id = r.match_id
  ),
  adjusted as (
    select
      b.match_id,
      b.rated_player_id,
      b.score,
      greatest(1, least(10,
        case when b.rater_votes >= 3 then b.score - b.rater_mean + b.match_mean else b.score end
      )) as adjusted
    from base b
  ),
  ranked as (
    select
      a.*,
      row_number() over (partition by a.match_id, a.rated_player_id order by a.adjusted) as rn,
      count(*) over (partition by a.match_id, a.rated_player_id) as n
    from adjusted a
  )
  select
    k.match_id,
    k.rated_player_id,
    max(k.n)::integer,
    round(avg(k.score), 2),
    round(avg(k.adjusted) filter (where k.n < 5 or (k.rn > 1 and k.rn < k.n)), 2)
  from ranked k
  group by k.match_id, k.rated_player_id;
$$;

-- Progreso de la votación (solo cantidades).
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
    (select count(distinct r.rater_player_id)::integer
       from public.match_ratings r where r.match_id = m.id),
    m.voting_closes_at,
    m.status = 'finished' and m.voting_closes_at is not null and now() < m.voting_closes_at
  from public.matches m
  where m.id = p_match_id and public.is_group_member(m.group_id);
$$;

-- Al cerrar la votación, fija el MVP por votos si el admin no eligió uno.
-- Idempotente: cualquier miembro puede invocarla al ver el partido.
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
  if v_match.mvp_source is not null then
    return v_match.mvp_player_id;
  end if;

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

  -- Empate perfecto: decide un admin.
  if v_second.player_id is not null
     and v_second.adjusted_average = v_first.adjusted_average
     and v_second.votes = v_first.votes
     and v_second.raw_average = v_first.raw_average then
    return null;
  end if;

  update public.matches set mvp_player_id = v_first.player_id, mvp_source = 'votes'
  where id = p_match_id;

  return v_first.player_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Estadísticas (calculadas, respetan RLS del usuario)
-- -----------------------------------------------------------------------------

-- Una fila por jugador y partido finalizado.
create view public.player_match_lines
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
  coalesce(m.mvp_player_id = tm.player_id, false) as is_mvp
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

revoke all on table public.player_match_lines from anon, authenticated;
grant select on table public.player_match_lines to authenticated;

-- Totales por jugador en un rango de fechas locales (temporada) opcional.
create or replace function public.get_player_stats(
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
  mvps integer
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
    count(*) filter (where l.is_mvp)::integer
  from public.player_match_lines l
  join public.groups g on g.id = l.group_id
  where l.group_id = p_group_id
    and (p_from is null or (l.scheduled_at at time zone g.timezone)::date >= p_from)
    and (p_to is null or (l.scheduled_at at time zone g.timezone)::date <= p_to)
  group by l.player_id;
$$;

revoke execute on function
  public.submit_match_ratings(uuid, jsonb),
  public.get_rating_aggregates(uuid, uuid),
  public.get_voting_progress(uuid),
  public.finalize_match_voting(uuid),
  public.get_player_stats(uuid, date, date)
from public, anon;

grant execute on function
  public.submit_match_ratings(uuid, jsonb),
  public.get_rating_aggregates(uuid, uuid),
  public.get_voting_progress(uuid),
  public.finalize_match_voting(uuid),
  public.get_player_stats(uuid, date, date)
to authenticated;
