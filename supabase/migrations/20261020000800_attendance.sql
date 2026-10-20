-- =============================================================================
-- "Voy / No voy": cada jugador confirma su asistencia
--
-- El jugador con ficha vinculada confirma o se baja de un partido programado
-- que todavía no empezó. Si hay lugar queda titular; si no, suplente por
-- orden de llegada. Si un titular se baja, sube el primer suplente.
-- "No voy" queda registrado (status 'dropped') para que el admin sepa quién
-- avisó. El admin sigue armando la convocatoria como siempre.
-- =============================================================================

-- La convocatoria del admin conserva a quienes avisaron que no van (si el
-- admin no los vuelve a sumar), en vez de borrarlos.
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
  where mp.match_id = p_match_id
    and mp.player_id <> all (v_ids)
    and mp.status <> 'dropped';

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

-- Confirma (p_going = true) o baja (false) al jugador de la cuenta actual.
-- Devuelve el estado resultante: 'confirmed', 'reserve' o 'dropped'.
create or replace function public.set_my_attendance(p_match_id uuid, p_going boolean)
returns public.participant_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_player_id uuid;
  v_current public.participant_status;
  v_confirmed int;
  v_capacity int;
  v_next_order smallint;
  v_status public.participant_status;
  v_promoted uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_going is null then
    raise exception 'invalid_attendance';
  end if;

  -- Bloquea el partido: dos confirmaciones simultáneas no se pasan del cupo.
  select * into v_match from public.matches m where m.id = p_match_id for update;
  if not found or not public.is_group_member(v_match.group_id) then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'scheduled' or v_match.scheduled_at <= now() then
    raise exception 'attendance_closed';
  end if;

  select p.id into v_player_id
  from public.players p
  where p.group_id = v_match.group_id and p.profile_id = v_uid;
  if v_player_id is null then
    raise exception 'player_not_linked';
  end if;

  select mp.status into v_current
  from public.match_participants mp
  where mp.match_id = p_match_id and mp.player_id = v_player_id;

  v_capacity := v_match.players_per_team * 2;
  select count(*) into v_confirmed
  from public.match_participants mp
  where mp.match_id = p_match_id and mp.status = 'confirmed';
  select coalesce(max(mp.sort_order), -1) + 1 into v_next_order
  from public.match_participants mp
  where mp.match_id = p_match_id;

  if p_going then
    if v_current in ('confirmed', 'reserve') then
      return v_current;
    end if;
    v_status := case when v_confirmed < v_capacity then 'confirmed' else 'reserve' end;
    insert into public.match_participants (match_id, group_id, player_id, status, sort_order)
    values (p_match_id, v_match.group_id, v_player_id, v_status, v_next_order)
    on conflict (match_id, player_id) do update
      set status = excluded.status, sort_order = excluded.sort_order;
    return v_status;
  end if;

  if v_current = 'dropped' then
    return 'dropped';
  end if;

  insert into public.match_participants (match_id, group_id, player_id, status, sort_order)
  values (p_match_id, v_match.group_id, v_player_id, 'dropped', v_next_order)
  on conflict (match_id, player_id) do update set status = 'dropped';

  delete from public.team_members tm
  where tm.match_id = p_match_id and tm.player_id = v_player_id;

  -- Un titular que se baja libera su lugar para el primer suplente.
  if v_current = 'confirmed' and v_confirmed - 1 < v_capacity then
    select mp.player_id into v_promoted
    from public.match_participants mp
    where mp.match_id = p_match_id and mp.status = 'reserve'
    order by mp.sort_order, mp.created_at
    limit 1;
    if v_promoted is not null then
      update public.match_participants
      set status = 'confirmed'
      where match_id = p_match_id and player_id = v_promoted;
    end if;
  end if;

  return 'dropped';
end;
$$;

revoke execute on function public.set_my_attendance(uuid, boolean) from public, anon;
grant execute on function public.set_my_attendance(uuid, boolean) to authenticated;
