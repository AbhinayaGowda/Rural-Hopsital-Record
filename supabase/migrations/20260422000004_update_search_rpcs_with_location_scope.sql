-- ============================================================
-- Wave 3: Update search RPCs to accept optional location scope
-- NULL p_district_ids/p_village_ids = admin (no filter)
-- Empty arrays = no assignments (zero results)
-- ============================================================

-- rpc_search_households
create or replace function public.rpc_search_households(
  p_q              text,
  p_malaria_number text     default null,
  p_village        text     default null,
  p_status         text     default null,
  p_limit          int      default 20,
  p_offset         int      default 0,
  p_district_ids   uuid[]   default null,
  p_village_ids    uuid[]   default null
)
returns table (
  id             uuid,  malaria_number text, address_line text,
  village        text,  district       text, state        text,
  pincode        text,  status         text, migrated_at  timestamptz,
  notes          text,  created_by     uuid, head_member_id uuid,
  state_id       uuid,  district_id    uuid, village_id   uuid,
  created_at     timestamptz, updated_at timestamptz, total_count bigint
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
begin
  if p_district_ids is not null
     and array_length(p_district_ids, 1) is null
     and p_village_ids is not null
     and array_length(p_village_ids, 1) is null
  then return; end if;

  return query
  with matched as (
    select distinct h.id
    from households h
    join members m on m.household_id = h.id
    where m.full_name % p_q
      and (p_malaria_number is null or h.malaria_number ilike '%' || p_malaria_number || '%')
      and (p_village        is null or h.village        ilike '%' || p_village        || '%')
      and (p_status         is null or h.status         = p_status)
      and (p_district_ids   is null or h.district_id = any(p_district_ids) or h.village_id = any(p_village_ids))
  ),
  total as (select count(*) as cnt from matched)
  select h.id, h.malaria_number, h.address_line, h.village, h.district, h.state,
    h.pincode, h.status, h.migrated_at, h.notes, h.created_by, h.head_member_id,
    h.state_id, h.district_id, h.village_id, h.created_at, h.updated_at, total.cnt
  from households h join matched using (id) cross join total
  order by h.created_at desc
  limit p_limit offset p_offset;
end;
$$;

-- rpc_search_person
create or replace function public.rpc_search_person(
  p_q            text,
  p_limit        int    default 20,
  p_offset       int    default 0,
  p_district_ids uuid[] default null,
  p_village_ids  uuid[] default null
)
returns table (
  id uuid, household_id uuid, full_name text, gender text,
  date_of_birth date, health_id text, status text, contact_number text,
  malaria_number text, village text, district text, total_count bigint
)
language sql stable security definer
set search_path = public, extensions
as $$
  with matches as (
    select m.id, m.household_id, m.full_name, m.gender, m.date_of_birth,
      m.health_id, m.status, m.contact_number, h.malaria_number, h.village, h.district,
      case when upper(m.health_id) = upper(p_q) then 1.0
        else greatest(similarity(m.full_name, p_q),
          case when m.name_phonetic = dmetaphone(p_q) then 0.6 else 0.0 end)
      end as score
    from members m join households h on h.id = m.household_id
    where (upper(m.health_id) = upper(p_q) or m.full_name % p_q
      or m.name_phonetic = dmetaphone(p_q) or m.full_name ilike '%' || p_q || '%')
    and (p_district_ids is null or h.district_id = any(p_district_ids) or h.village_id = any(p_village_ids))
  ),
  counted as (
    select *, count(*) over () as total_count from matches
    order by score desc, full_name limit p_limit offset p_offset
  )
  select id, household_id, full_name, gender, date_of_birth,
    health_id, status, contact_number, malaria_number, village, district, total_count
  from counted;
$$;
