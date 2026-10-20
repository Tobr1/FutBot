-- =============================================================================
-- Voto al jugador del partido (MVP)
--
-- Además de calificar de 1 a 10, cada jugador del partido elige un único MVP
-- (no a sí mismo). Es anónimo como las calificaciones y se puede cambiar
-- hasta el cierre. Al cerrar gana el más votado; si empatan, desempata el
-- mejor promedio corregido de calificaciones; si sigue el empate, decide el
-- admin. Sin votos de MVP se mantiene el criterio anterior (mejor promedio).
-- =============================================================================

create table public.match_mvp_votes (
  match_id uuid not null,
  group_id uuid not null,
  voter_player_id uuid not null,
  -- Quién votó realmente (la lectura se restringe a esta cuenta).
  voter_profile_id uuid not null references public.profiles (id) on delete cascade,
  candidate_player_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, voter_player_id),
  constraint match_mvp_votes_not_self check (voter_player_id <> candidate_player_id),
  constraint match_mvp_votes_voter_fkey foreign key (match_id, voter_player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_mvp_votes_candidate_fkey foreign key (match_id, candidate_player_id)
    references public.team_members (match_id, player_id) on delete cascade,
  constraint match_mvp_votes_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade
);
create index match_mvp_votes_candidate_idx on public.match_mvp_votes (match_id, candidate_player_id);
create index match_mvp_votes_voter_profile_idx on public.match_mvp_votes (voter_profile_id);

comment on table public.match_mvp_votes is
  'Voto anónimo al MVP: uno por jugador y partido. Solo lo lee quien votó; sin auditoría para no registrar identidades.';

create trigger match_mvp_votes_set_updated_at before update on public.match_mvp_votes
  for each row execute function public.set_updated_at();

alter table public.match_mvp_votes enable row level security;

create policy match_mvp_votes_select_own on public.match_mvp_votes for select to authenticated
  using (voter_profile_id = (select auth.uid()));

revoke all on table public.match_mvp_votes from anon, authenticated;
grant select on table public.match_mvp_votes to authenticated;

-- -----------------------------------------------------------------------------
-- Envío conjunto: calificaciones (opcionales) + MVP (opcional), en una
-- sola transacción. Al menos uno de los dos.
-- -----------------------------------------------------------------------------

create or replace function public.submit_match_votes(
  p_match_id uuid,
  p_ratings jsonb default '[]'::jsonb,
  p_mvp_player_id uuid default null
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
  if not v_has_ratings and p_mvp_player_id is null then
    raise exception 'invalid_ratings';
  end if;

  -- Valida sesión, partido, ventana, participación y autovoto.
  if v_has_ratings then
    perform public.submit_match_ratings(p_match_id, p_ratings);
  end if;

  if p_mvp_player_id is null then
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
end;
$$;

-- -----------------------------------------------------------------------------
-- Progreso: cuenta como votante quien calificó o eligió MVP.
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
     ) voters),
    m.voting_closes_at,
    m.status = 'finished' and m.voting_closes_at is not null and now() < m.voting_closes_at
  from public.matches m
  where m.id = p_match_id and public.is_group_member(m.group_id);
$$;

-- -----------------------------------------------------------------------------
-- MVP al cierre: primero los votos de MVP; sin ellos, el mejor promedio.
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

revoke execute on function public.submit_match_votes(uuid, jsonb, uuid) from public, anon;
grant execute on function public.submit_match_votes(uuid, jsonb, uuid) to authenticated;
