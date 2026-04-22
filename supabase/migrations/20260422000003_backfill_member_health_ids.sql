-- Back-fill health_id for members created before the trigger existed.
do $$
declare
  r record;
  v_state_code text;
begin
  for r in select m.id, m.household_id from members m where m.health_id is null loop
    select s.code into v_state_code
    from   households h
    join   states     s on s.id = h.state_id
    where  h.id = r.household_id;

    update members
    set    health_id = public.generate_health_id(coalesce(v_state_code, 'IN'))
    where  id = r.id;
  end loop;
end;
$$;
