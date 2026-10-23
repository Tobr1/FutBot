-- =============================================================================
-- Cerrar la votación a mano
--
-- La votación se sigue abriendo sola al cargar el resultado (con la ventana
-- del grupo). El admin puede cerrarla antes: el cierre pasa a ser ahora y se
-- elige el MVP en el momento (misma regla que al vencer).
-- =============================================================================

create or replace function public.close_match_voting(p_match_id uuid)
returns uuid
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
  if v_match.status <> 'finished' or v_match.voting_closes_at is null then
    raise exception 'voting_not_open';
  end if;
  if now() >= v_match.voting_closes_at then
    raise exception 'voting_closed';
  end if;

  update public.matches set voting_closes_at = now() where id = p_match_id;

  -- now() es el inicio de la transacción: para finalize_match_voting la
  -- votación ya terminó.
  return public.finalize_match_voting(p_match_id);
end;
$$;

revoke execute on function public.close_match_voting(uuid) from public, anon;
grant execute on function public.close_match_voting(uuid) to authenticated;
