-- =============================================================================
-- Pronósticos de los miembros
--
-- Con los dos equipos armados y antes de que empiece el partido, cada miembro
-- del grupo pronostica el resultado (uno por cuenta, editable hasta el
-- inicio). Antes del inicio cada uno ve solo el suyo; desde el inicio todos
-- ven los de todos. Los puntos (3 exacto, 1 ganador o empate) se calculan al
-- leer, con el resultado cargado: no se guardan.
-- =============================================================================

create table public.match_predictions (
  match_id uuid not null,
  group_id uuid not null,
  profile_id uuid not null,
  score_a smallint not null check (score_a between 0 and 30),
  score_b smallint not null check (score_b between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, profile_id),
  constraint match_predictions_match_fkey foreign key (match_id, group_id)
    references public.matches (id, group_id) on delete cascade,
  constraint match_predictions_member_fkey foreign key (group_id, profile_id)
    references public.group_members (group_id, profile_id) on delete cascade
);
create index match_predictions_group_idx on public.match_predictions (group_id);

comment on table public.match_predictions is
  'Pronóstico de resultado de un miembro. Privado hasta que empieza el partido.';

create trigger match_predictions_set_updated_at before update on public.match_predictions
  for each row execute function public.set_updated_at();

-- ¿Ya empezó (o se jugó / canceló) el partido? Desde ahí los pronósticos son públicos.
create or replace function public.match_predictions_locked(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select m.status <> 'scheduled' or m.scheduled_at <= now()
    from public.matches m where m.id = p_match_id
  ), true);
$$;

alter table public.match_predictions enable row level security;

create policy match_predictions_select on public.match_predictions for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (public.is_group_member(group_id) and public.match_predictions_locked(match_id))
  );

revoke all on public.match_predictions from anon, authenticated;
grant select on public.match_predictions to authenticated;

-- Guarda (o cambia) mi pronóstico mientras el partido no empezó y con los dos equipos armados.
create or replace function public.save_match_prediction(p_match_id uuid, p_score_a integer, p_score_b integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_score_a is null or p_score_b is null or p_score_a not between 0 and 30 or p_score_b not between 0 and 30 then
    raise exception 'invalid_prediction';
  end if;

  select * into v_match from public.matches m where m.id = p_match_id;
  if not found or not public.is_group_member(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if public.match_predictions_locked(p_match_id) then
    raise exception 'predictions_closed';
  end if;
  if (select count(distinct t.side) from public.team_members tm join public.teams t on t.id = tm.team_id
      where tm.match_id = p_match_id) < 2 then
    raise exception 'teams_not_ready';
  end if;

  insert into public.match_predictions (match_id, group_id, profile_id, score_a, score_b)
  values (p_match_id, v_match.group_id, v_uid, p_score_a, p_score_b)
  on conflict (match_id, profile_id) do update
    set score_a = excluded.score_a, score_b = excluded.score_b;
end;
$$;

-- Cuántos pronosticaron (antes del inicio, sin revelar quiénes ni qué).
create or replace function public.get_prediction_count(p_match_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.match_predictions p
  join public.matches m on m.id = p.match_id
  where p.match_id = p_match_id and public.is_group_member(m.group_id);
$$;

revoke execute on function public.match_predictions_locked(uuid) from public, anon;
grant execute on function public.match_predictions_locked(uuid) to authenticated;

revoke execute on function
  public.save_match_prediction(uuid, integer, integer),
  public.get_prediction_count(uuid)
from public, anon;
grant execute on function
  public.save_match_prediction(uuid, integer, integer),
  public.get_prediction_count(uuid)
to authenticated;
