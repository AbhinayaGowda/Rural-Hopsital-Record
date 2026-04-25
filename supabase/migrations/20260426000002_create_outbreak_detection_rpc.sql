-- Outbreak detection: flags clusters of 3+ same disease in same village within p_days
create or replace function public.rpc_detect_outbreaks(p_days int default 7)
returns table (
  condition_id      uuid,
  condition_name    text,
  village_id        uuid,
  village_name      text,
  district_name     text,
  case_count        int,
  earliest_case     date,
  latest_case       date,
  member_ids        uuid[]
)
language sql stable security definer set search_path = public as $$
  select
    dh.condition_id,
    mc.name                                  as condition_name,
    h.village_id,
    v.name                                   as village_name,
    d.name                                   as district_name,
    count(dh.id)::int                        as case_count,
    min(dh.diagnosed_on)                     as earliest_case,
    max(dh.diagnosed_on)                     as latest_case,
    array_agg(distinct dh.member_id)         as member_ids
  from disease_history dh
  join members         m  on m.id  = dh.member_id
  join households      h  on h.id  = m.household_id
  join medical_conditions mc on mc.id = dh.condition_id
  left join villages   v  on v.id  = h.village_id
  left join districts  d  on d.id  = v.district_id
  where
    dh.condition_id is not null
    and dh.diagnosed_on >= current_date - p_days
    and h.village_id is not null
  group by dh.condition_id, mc.name, h.village_id, v.name, d.name
  having count(dh.id) >= 3
  order by case_count desc, latest_case desc;
$$;

-- Grant access to all authenticated roles
grant execute on function public.rpc_detect_outbreaks(int) to authenticated;
