create or replace function public.rpc_find_duplicate_households(
  p_village   text,
  p_head_name text,
  p_limit     int default 5
)
returns table (
  household_id   uuid,
  malaria_number text,
  village        text,
  head_name      text,
  similarity     float4
)
language sql stable security definer set search_path = public, extensions as $$
  select distinct
    h.id                            as household_id,
    h.malaria_number,
    h.village,
    m.full_name                     as head_name,
    greatest(
      case when p_village   is not null then similarity(h.village, p_village)       else 0::float4 end,
      case when p_head_name is not null then similarity(m.full_name, p_head_name)   else 0::float4 end
    )                               as similarity
  from households h
  left join members m on m.id = h.head_member_id
  where h.status = 'active'
    and (
      (p_village   is not null and similarity(h.village, p_village) > 0.3)
      or (p_head_name is not null and m.id is not null and similarity(m.full_name, p_head_name) > 0.3)
    )
  order by similarity desc
  limit p_limit;
$$;

grant execute on function public.rpc_find_duplicate_households(text, text, int) to authenticated;
