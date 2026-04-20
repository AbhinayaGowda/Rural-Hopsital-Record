-- rpc_search_households: fuzzy member name search via pg_trgm
create or replace function public.rpc_search_households(
  p_q            text,
  p_malaria_number text default null,
  p_village      text   default null,
  p_status       text   default null,
  p_limit        int    default 20,
  p_offset       int    default 0
)
returns table (
  id             uuid,
  malaria_number text,
  address_line   text,
  village        text,
  district       text,
  state          text,
  pincode        text,
  status         text,
  migrated_at    timestamptz,
  notes          text,
  created_by     uuid,
  head_member_id uuid,
  created_at     timestamptz,
  updated_at     timestamptz,
  total_count    bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  return query
  with matched as (
    select distinct h.id
    from households h
    join members m on m.household_id = h.id
    where m.full_name % p_q
      and (p_malaria_number is null or h.malaria_number ilike '%' || p_malaria_number || '%')
      and (p_village        is null or h.village        ilike '%' || p_village        || '%')
      and (p_status         is null or h.status         = p_status)
  ),
  total as (select count(*) as cnt from matched)
  select
    h.id, h.malaria_number, h.address_line, h.village, h.district, h.state,
    h.pincode, h.status, h.migrated_at, h.notes, h.created_by, h.head_member_id,
    h.created_at, h.updated_at,
    total.cnt
  from households h
  join matched using (id)
  cross join total
  order by h.created_at desc
  limit p_limit offset p_offset;
end;
$$;

-- rpc_batch_administer_vaccinations: atomic multi-dose administer
create or replace function public.rpc_batch_administer_vaccinations(
  p_doses    jsonb,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dose       jsonb;
  v_vac_id     uuid;
  v_adm_date   date;
  v_notes      text;
  v_existing   vaccinations%rowtype;
  v_results    jsonb := '[]'::jsonb;
  v_row        vaccinations%rowtype;
begin
  for v_dose in select * from jsonb_array_elements(p_doses)
  loop
    v_vac_id   := (v_dose->>'vaccination_id')::uuid;
    v_adm_date := (v_dose->>'administered_date')::date;
    v_notes    := v_dose->>'notes';

    -- lock the row for update
    select * into v_existing
    from vaccinations
    where id = v_vac_id
    for update;

    if not found then
      raise exception 'Vaccination % not found', v_vac_id
        using errcode = 'P0002';
    end if;

    if v_existing.status = 'completed' then
      raise exception 'Vaccination % already administered', v_vac_id
        using errcode = 'P0001';
    end if;

    if v_existing.status = 'skipped' then
      raise exception 'Vaccination % is skipped and cannot be administered', v_vac_id
        using errcode = 'P0001';
    end if;

    update vaccinations
    set status           = 'completed',
        administered_date = v_adm_date,
        administered_by  = p_actor_id,
        notes            = coalesce(v_notes, notes),
        updated_at       = now()
    where id = v_vac_id
    returning * into v_row;

    -- audit entry per dose
    insert into audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
    values (
      p_actor_id,
      'update',
      'vaccinations',
      v_vac_id,
      jsonb_build_object('status', v_existing.status),
      jsonb_build_object('status', 'completed', 'administered_date', v_adm_date, 'administered_by', p_actor_id)
    );

    v_results := v_results || to_jsonb(v_row);
  end loop;

  return v_results;
end;
$$;
