-- =============================================================================
-- Invitados del partido
--
-- El admin suma a alguien que viene a completar escribiendo solo su nombre:
-- entra directo a la convocatoria (sin confirmar asistencia) y no aparece en
-- el plantel ni en los rankings. Es una ficha marcada como invitada, así
-- puede jugar en un equipo, hacer goles y ser votado como cualquiera. Si el
-- mismo nombre vuelve a venir, se reusa su ficha de invitado.
-- =============================================================================

alter table public.players
  add column is_guest boolean not null default false,
  add constraint players_guest_unlinked check (not is_guest or profile_id is null);

comment on column public.players.is_guest is
  'Invitado: juega partidos sueltos pero no forma parte del plantel ni de los rankings.';

-- Quien vincula su cuenta a una ficha de invitado pasa a ser del plantel.
create or replace function public.players_unguest_on_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.profile_id is not null then
    new.is_guest := false;
  end if;
  return new;
end;
$$;

create trigger players_unguest_on_link before insert or update of profile_id on public.players
  for each row execute function public.players_unguest_on_link();

-- "Sumar al plantel" (solo admins: la política de update ya lo restringe).
grant update (is_guest) on public.players to authenticated;

-- Reemplaza las entradas {guest: "Nombre", status?} de una convocatoria por
-- {player_id, status?}: reusa la ficha de invitado con ese nombre o la crea.
-- Un nombre que ya es de alguien del plantel se rechaza (hay que elegirlo).
create or replace function public._resolve_match_guests(p_group_id uuid, p_participants jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_out jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_name text;
  v_player public.players;
begin
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' then
    raise exception 'invalid_participants';
  end if;
  if jsonb_array_length(p_participants) > 60 then
    raise exception 'too_many_participants';
  end if;

  for v_entry in
    select e.value from jsonb_array_elements(p_participants) with ordinality e order by e.ordinality
  loop
    if jsonb_typeof(v_entry) = 'object' and v_entry ? 'guest' then
      v_name := btrim(v_entry ->> 'guest');
      if v_name is null or char_length(v_name) not between 1 and 30 or public.normalize_name(v_name) is null then
        raise exception 'invalid_guest';
      end if;

      select * into v_player
      from public.players p
      where p.group_id = p_group_id and p.nickname_normalized = public.normalize_name(v_name)
      for update;

      if found then
        if not v_player.is_guest then
          raise exception 'guest_name_taken';
        end if;
        if not v_player.is_active then
          update public.players set is_active = true where id = v_player.id;
        end if;
      else
        insert into public.players (group_id, nickname, is_guest)
        values (p_group_id, v_name, true)
        returning * into v_player;
      end if;

      v_entry := jsonb_build_object('player_id', v_player.id)
        || case when v_entry ? 'status' then jsonb_build_object('status', v_entry -> 'status') else '{}'::jsonb end;
    end if;
    v_out := v_out || jsonb_build_array(v_entry);
  end loop;

  return v_out;
end;
$$;

-- Igual que en 20261020000800_attendance, más los invitados.
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
  v_participants jsonb;
  v_ids uuid[];
begin
  v_participants := public._resolve_match_guests(p_group_id, p_participants);

  select coalesce(array_agg((e.value ->> 'player_id')::uuid), '{}')
  into v_ids
  from jsonb_array_elements(v_participants) e;

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
  from jsonb_array_elements(v_participants) with ordinality e
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

revoke execute on function
  public._resolve_match_guests(uuid, jsonb),
  public._apply_match_participants(uuid, uuid, jsonb),
  public.players_unguest_on_link()
from public, anon, authenticated;
