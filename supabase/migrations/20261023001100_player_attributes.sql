-- =============================================================================
-- Atributos de carta: autoevaluación y validación de compañeros
--
-- Cada jugador con ficha vinculada se autoevalúa en seis atributos (1-99) y
-- sus compañeros del grupo los validan (uno activo por compañero, editable).
-- Jugadores de campo: RIT, TIR, PAS, REG, DEF, FIS. Arqueros: estirada, manos,
-- saque, reflejos, velocidad y posicionamiento. El tipo (campo / arquero)
-- sale de la posición principal al guardar.
--
-- Valor publicado = 20 % autoevaluación + 80 % promedio de validaciones (con
-- 5 o más, sin el más alto ni el más bajo de cada atributo). Provisional
-- hasta tener 3 validaciones. Los valores individuales no se publican: solo
-- quien los cargó los ve; la carta usa el agregado (get_group_attributes).
-- =============================================================================

create type public.attribute_kind as enum ('field', 'goalkeeper');

create table public.player_self_assessments (
  player_id uuid not null,
  group_id uuid not null,
  kind public.attribute_kind not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  v1 smallint not null check (v1 between 1 and 99),
  v2 smallint not null check (v2 between 1 and 99),
  v3 smallint not null check (v3 between 1 and 99),
  v4 smallint not null check (v4 between 1 and 99),
  v5 smallint not null check (v5 between 1 and 99),
  v6 smallint not null check (v6 between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, kind),
  constraint player_self_assessments_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete cascade
);

create table public.player_attribute_validations (
  player_id uuid not null,
  group_id uuid not null,
  kind public.attribute_kind not null,
  validator_player_id uuid not null,
  validator_profile_id uuid not null references public.profiles (id) on delete cascade,
  v1 smallint not null check (v1 between 1 and 99),
  v2 smallint not null check (v2 between 1 and 99),
  v3 smallint not null check (v3 between 1 and 99),
  v4 smallint not null check (v4 between 1 and 99),
  v5 smallint not null check (v5 between 1 and 99),
  v6 smallint not null check (v6 between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, kind, validator_player_id),
  constraint player_attribute_validations_not_self check (player_id <> validator_player_id),
  constraint player_attribute_validations_player_fkey foreign key (player_id, group_id)
    references public.players (id, group_id) on delete cascade,
  constraint player_attribute_validations_validator_fkey foreign key (validator_player_id, group_id)
    references public.players (id, group_id) on delete cascade
);
create index player_attribute_validations_group_idx on public.player_attribute_validations (group_id);
create index player_attribute_validations_validator_idx on public.player_attribute_validations (validator_profile_id);

-- Historial de cada guardado (autoevaluación o validación), solo para auditoría interna.
create table public.player_attribute_revisions (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  group_id uuid not null,
  kind public.attribute_kind not null,
  source text not null check (source in ('self', 'peer')),
  validator_player_id uuid,
  scores smallint[] not null,
  created_at timestamptz not null default now()
);
create index player_attribute_revisions_player_idx on public.player_attribute_revisions (player_id, created_at desc);

comment on table public.player_self_assessments is 'Autoevaluación de atributos (1-99). Solo la ve su autor; los compañeros la reciben como valores iniciales al validar.';
comment on table public.player_attribute_validations is 'Validación de atributos por un compañero. Solo la ve quien la cargó; se publica el agregado.';
comment on table public.player_attribute_revisions is 'Historial de guardados de atributos. Sin acceso desde la app.';

create trigger player_self_assessments_set_updated_at before update on public.player_self_assessments
  for each row execute function public.set_updated_at();
create trigger player_attribute_validations_set_updated_at before update on public.player_attribute_validations
  for each row execute function public.set_updated_at();

alter table public.player_self_assessments enable row level security;
alter table public.player_attribute_validations enable row level security;
alter table public.player_attribute_revisions enable row level security;

create policy player_self_assessments_select_own on public.player_self_assessments for select to authenticated
  using (profile_id = (select auth.uid()));
create policy player_attribute_validations_select_own on public.player_attribute_validations for select to authenticated
  using (validator_profile_id = (select auth.uid()));

revoke all on public.player_self_assessments, public.player_attribute_validations, public.player_attribute_revisions
  from anon, authenticated;
grant select on public.player_self_assessments, public.player_attribute_validations to authenticated;

-- -----------------------------------------------------------------------------
-- Auxiliares
-- -----------------------------------------------------------------------------

-- Tipo de atributos de una ficha según su posición principal.
create or replace function public.player_attribute_kind(p_player_id uuid)
returns public.attribute_kind
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.player_positions pp
      where pp.player_id = p_player_id and pp.priority = 1 and pp.position = 'goalkeeper'
    ) then 'goalkeeper'::public.attribute_kind
    else 'field'::public.attribute_kind
  end;
$$;

create or replace function public._validate_attribute_values(p_values integer[])
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_values is null or cardinality(p_values) <> 6 then
    raise exception 'invalid_attributes';
  end if;
  if exists (select 1 from unnest(p_values) v where v is null or v < 1 or v > 99) then
    raise exception 'invalid_attributes';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Escritura (solo por RPC)
-- -----------------------------------------------------------------------------

-- Autoevaluación de la ficha vinculada a la cuenta actual en el grupo.
create or replace function public.save_self_assessment(p_group_id uuid, p_values integer[])
returns public.attribute_kind
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_player uuid;
  v_kind public.attribute_kind;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  perform public._validate_attribute_values(p_values);

  select p.id into v_player
  from public.players p
  where p.group_id = p_group_id and p.profile_id = v_uid;
  if v_player is null then
    raise exception 'player_not_linked';
  end if;
  v_kind := public.player_attribute_kind(v_player);

  insert into public.player_self_assessments (player_id, group_id, kind, profile_id, v1, v2, v3, v4, v5, v6)
  values (v_player, p_group_id, v_kind, v_uid, p_values[1], p_values[2], p_values[3], p_values[4], p_values[5], p_values[6])
  on conflict (player_id, kind) do update
    set v1 = excluded.v1, v2 = excluded.v2, v3 = excluded.v3,
        v4 = excluded.v4, v5 = excluded.v5, v6 = excluded.v6, profile_id = excluded.profile_id;

  insert into public.player_attribute_revisions (player_id, group_id, kind, source, scores)
  values (v_player, p_group_id, v_kind, 'self', p_values::smallint[]);

  return v_kind;
end;
$$;

-- Validación de un compañero (nunca de uno mismo). Una activa por par; se edita.
create or replace function public.save_attribute_validation(p_player_id uuid, p_values integer[])
returns public.attribute_kind
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
  v_validator uuid;
  v_kind public.attribute_kind;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  perform public._validate_attribute_values(p_values);

  select p.group_id into v_group from public.players p where p.id = p_player_id;
  if v_group is null or not public.is_group_member(v_group) then
    raise exception 'player_not_found';
  end if;

  select p.id into v_validator
  from public.players p
  where p.group_id = v_group and p.profile_id = v_uid;
  if v_validator is null then
    raise exception 'player_not_linked';
  end if;
  if v_validator = p_player_id then
    raise exception 'cannot_rate_self';
  end if;
  v_kind := public.player_attribute_kind(p_player_id);

  insert into public.player_attribute_validations
    (player_id, group_id, kind, validator_player_id, validator_profile_id, v1, v2, v3, v4, v5, v6)
  values (p_player_id, v_group, v_kind, v_validator, v_uid,
          p_values[1], p_values[2], p_values[3], p_values[4], p_values[5], p_values[6])
  on conflict (player_id, kind, validator_player_id) do update
    set v1 = excluded.v1, v2 = excluded.v2, v3 = excluded.v3,
        v4 = excluded.v4, v5 = excluded.v5, v6 = excluded.v6,
        validator_profile_id = excluded.validator_profile_id;

  insert into public.player_attribute_revisions (player_id, group_id, kind, source, validator_player_id, scores)
  values (p_player_id, v_group, v_kind, 'peer', v_validator, p_values::smallint[]);

  return v_kind;
end;
$$;

-- -----------------------------------------------------------------------------
-- Lectura
-- -----------------------------------------------------------------------------

-- Valores iniciales para validar a un compañero: mi validación anterior o, si
-- no hay, su autoevaluación. Nunca las validaciones de otros.
create or replace function public.get_attribute_validation_form(p_player_id uuid)
returns table (kind public.attribute_kind, source text, scores smallint[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
  v_validator uuid;
  v_kind public.attribute_kind;
begin
  select p.group_id into v_group from public.players p where p.id = p_player_id;
  if v_group is null or not public.is_group_member(v_group) then
    return;
  end if;
  v_kind := public.player_attribute_kind(p_player_id);
  select p.id into v_validator from public.players p where p.group_id = v_group and p.profile_id = v_uid;

  return query
  select v_kind, 'mine'::text, array[v.v1, v.v2, v.v3, v.v4, v.v5, v.v6]
  from public.player_attribute_validations v
  where v.player_id = p_player_id and v.kind = v_kind and v.validator_player_id = v_validator;
  if found then
    return;
  end if;

  return query
  select v_kind, 'self'::text, array[s.v1, s.v2, s.v3, s.v4, s.v5, s.v6]
  from public.player_self_assessments s
  where s.player_id = p_player_id and s.kind = v_kind;
  if found then
    return;
  end if;

  return query select v_kind, 'none'::text, null::smallint[];
end;
$$;

-- Promedio; con 5 o más valores descarta el máximo y el mínimo.
create or replace function public._robust_mean(p_values smallint[], p_n bigint)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_n >= 5 then (
      select avg(x)::numeric from (
        select x, row_number() over (order by x) as r
        from unnest(p_values) x
      ) t
      where t.r > 1 and t.r < p_n
    )
    else (select avg(x)::numeric from unnest(p_values) x)
  end;
$$;

-- Atributos publicados de las fichas del grupo (solo miembros).
create or replace function public.get_group_attributes(p_group_id uuid)
returns table (
  player_id uuid,
  kind public.attribute_kind,
  a1 numeric, a2 numeric, a3 numeric, a4 numeric, a5 numeric, a6 numeric,
  has_self boolean,
  validators integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_kind as (
    select p.id as player_id, public.player_attribute_kind(p.id) as kind
    from public.players p
    where p.group_id = p_group_id and public.is_group_member(p_group_id)
  ),
  peers as (
    select v.player_id, v.kind, v.v1, v.v2, v.v3, v.v4, v.v5, v.v6, v.updated_at,
           count(*) over (partition by v.player_id, v.kind) as n
    from public.player_attribute_validations v
    join current_kind c on c.player_id = v.player_id and c.kind = v.kind
  ),
  -- Con 5 o más validaciones, cada atributo descarta su valor más alto y el más bajo.
  peer_avg as (
    select player_id, kind, max(n)::integer as n, max(updated_at) as updated_at,
           public._robust_mean(array_agg(v1), max(n)) as m1,
           public._robust_mean(array_agg(v2), max(n)) as m2,
           public._robust_mean(array_agg(v3), max(n)) as m3,
           public._robust_mean(array_agg(v4), max(n)) as m4,
           public._robust_mean(array_agg(v5), max(n)) as m5,
           public._robust_mean(array_agg(v6), max(n)) as m6
    from peers
    group by player_id, kind
  )
  select c.player_id, c.kind,
    round(case when pa.n is null then s.v1 when s.v1 is null then pa.m1 else 0.2 * s.v1 + 0.8 * pa.m1 end, 1),
    round(case when pa.n is null then s.v2 when s.v2 is null then pa.m2 else 0.2 * s.v2 + 0.8 * pa.m2 end, 1),
    round(case when pa.n is null then s.v3 when s.v3 is null then pa.m3 else 0.2 * s.v3 + 0.8 * pa.m3 end, 1),
    round(case when pa.n is null then s.v4 when s.v4 is null then pa.m4 else 0.2 * s.v4 + 0.8 * pa.m4 end, 1),
    round(case when pa.n is null then s.v5 when s.v5 is null then pa.m5 else 0.2 * s.v5 + 0.8 * pa.m5 end, 1),
    round(case when pa.n is null then s.v6 when s.v6 is null then pa.m6 else 0.2 * s.v6 + 0.8 * pa.m6 end, 1),
    s.player_id is not null,
    coalesce(pa.n, 0),
    greatest(s.updated_at, pa.updated_at)
  from current_kind c
  left join public.player_self_assessments s on s.player_id = c.player_id and s.kind = c.kind
  left join peer_avg pa on pa.player_id = c.player_id and pa.kind = c.kind
  where s.player_id is not null or pa.n is not null;
$$;

-- Mis validaciones hechas en el grupo (ids de fichas), para "te faltan validar".
create or replace function public.get_my_attribute_validations(p_group_id uuid)
returns table (player_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select v.player_id
  from public.player_attribute_validations v
  where v.group_id = p_group_id
    and v.validator_profile_id = (select auth.uid())
    and v.kind = public.player_attribute_kind(v.player_id);
$$;

revoke execute on function
  public.player_attribute_kind(uuid),
  public._validate_attribute_values(integer[]),
  public._robust_mean(smallint[], bigint)
from public, anon, authenticated;

revoke execute on function
  public.save_self_assessment(uuid, integer[]),
  public.save_attribute_validation(uuid, integer[]),
  public.get_attribute_validation_form(uuid),
  public.get_group_attributes(uuid),
  public.get_my_attribute_validations(uuid)
from public, anon;

grant execute on function
  public.save_self_assessment(uuid, integer[]),
  public.save_attribute_validation(uuid, integer[]),
  public.get_attribute_validation_form(uuid),
  public.get_group_attributes(uuid),
  public.get_my_attribute_validations(uuid)
to authenticated;
