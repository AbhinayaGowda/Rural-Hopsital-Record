-- ============================================================
-- Wave 2: Person search RPC
-- Combines: exact health_id, trgm fuzzy name, phonetic match
-- ============================================================

create or replace function public.rpc_search_person(
  p_q        text,
  p_limit    int  default 20,
  p_offset   int  default 0
)
returns table (
  id             uuid,
  household_id   uuid,
  full_name      text,
  gender         text,
  date_of_birth  date,
  health_id      text,
  status         text,
  contact_number text,
  malaria_number text,
  village        text,
  district       text,
  total_count    bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with matches as (
    select
      m.id,
      m.household_id,
      m.full_name,
      m.gender,
      m.date_of_birth,
      m.health_id,
      m.status,
      m.contact_number,
      h.malaria_number,
      h.village,
      h.district,
      case
        when upper(m.health_id) = upper(p_q) then 1.0
        else greatest(
          similarity(m.full_name, p_q),
          case when m.name_phonetic = dmetaphone(p_q) then 0.6 else 0.0 end
        )
      end as score
    from   members    m
    join   households h on h.id = m.household_id
    where  (
      upper(m.health_id) = upper(p_q)
      or m.full_name      % p_q
      or m.name_phonetic  = dmetaphone(p_q)
      or m.full_name     ilike '%' || p_q || '%'
    )
  ),
  counted as (
    select *, count(*) over () as total_count
    from   matches
    order  by score desc, full_name
    limit  p_limit
    offset p_offset
  )
  select
    id, household_id, full_name, gender, date_of_birth,
    health_id, status, contact_number,
    malaria_number, village, district, total_count
  from counted;
$$;
