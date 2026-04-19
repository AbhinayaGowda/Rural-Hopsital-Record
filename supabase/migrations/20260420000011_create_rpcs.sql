-- ============================================================
-- rpc_change_household_head
-- ============================================================
create or replace function public.rpc_change_household_head(
  p_household_id  uuid,
  p_new_head_id   uuid,
  p_actor_id      uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_old_head_id uuid;
begin
  -- validate new head is an active member of this household
  if not exists (
    select 1 from public.members
    where id = p_new_head_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'New head is not an active member of this household';
  end if;

  select head_member_id into v_old_head_id
  from public.households
  where id = p_household_id;

  if v_old_head_id = p_new_head_id then
    raise exception 'Member is already the household head';
  end if;

  -- unset old head
  if v_old_head_id is not null then
    update public.members set is_head = false where id = v_old_head_id;
  end if;

  -- set new head
  update public.members
  set is_head = true, relation_to_head = 'self'
  where id = p_new_head_id;

  -- update household pointer
  update public.households
  set head_member_id = p_new_head_id
  where id = p_household_id;

  -- clear all relationships for members of this household
  delete from public.relationships
  where member_id         in (select id from public.members where household_id = p_household_id)
     or related_member_id in (select id from public.members where household_id = p_household_id);

  -- regenerate relationships from relation_to_head (head → member direction)
  insert into public.relationships (member_id, related_member_id, relationship_type)
  select
    p_new_head_id,
    m.id,
    case m.relation_to_head
      when 'spouse'   then 'spouse_of'
      when 'son'      then 'parent_of'
      when 'daughter' then 'parent_of'
      when 'parent'   then 'child_of'
      when 'sibling'  then 'sibling_of'
      else                 'related_to'
    end
  from public.members m
  where m.household_id = p_household_id
    and m.id != p_new_head_id
    and m.relation_to_head is not null
    and m.relation_to_head not in ('self', 'other')
  on conflict (member_id, related_member_id, relationship_type) do nothing;

  -- regenerate relationships (member → head direction)
  insert into public.relationships (member_id, related_member_id, relationship_type)
  select
    m.id,
    p_new_head_id,
    case m.relation_to_head
      when 'spouse'   then 'spouse_of'
      when 'son'      then 'child_of'
      when 'daughter' then 'child_of'
      when 'parent'   then 'parent_of'
      when 'sibling'  then 'sibling_of'
      else                 'related_to'
    end
  from public.members m
  where m.household_id = p_household_id
    and m.id != p_new_head_id
    and m.relation_to_head is not null
    and m.relation_to_head not in ('self', 'other')
  on conflict (member_id, related_member_id, relationship_type) do nothing;

  -- audit
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    p_actor_id, 'status_change', 'households', p_household_id,
    jsonb_build_object('head_member_id', v_old_head_id),
    jsonb_build_object('head_member_id', p_new_head_id)
  );
end;
$$;

-- ============================================================
-- rpc_register_delivery
-- ============================================================
create or replace function public.rpc_register_delivery(
  p_pregnancy_id  uuid,
  p_newborn_data  jsonb,
  p_actor_id      uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_household_id  uuid;
  v_birth_date    date;
  v_new_member_id uuid;
  v_status        text;
begin
  select m.household_id, p.status
  into v_household_id, v_status
  from public.pregnancies p
  join public.members m on m.id = p.member_id
  where p.id = p_pregnancy_id;

  if not found then
    raise exception 'Pregnancy not found';
  end if;

  if v_status != 'active' then
    raise exception 'Pregnancy is not active (current status: %)', v_status;
  end if;

  v_birth_date := coalesce(
    (p_newborn_data->>'date_of_birth')::date,
    current_date
  );

  -- create member record for the baby
  insert into public.members (
    household_id, full_name, gender, date_of_birth,
    relation_to_head, is_head, status, created_by
  )
  values (
    v_household_id,
    coalesce(nullif(trim(p_newborn_data->>'full_name'), ''), 'Newborn'),
    coalesce(p_newborn_data->>'gender', 'O'),
    v_birth_date,
    coalesce(p_newborn_data->>'relation_to_head', 'son'),
    false,
    'active',
    p_actor_id
  )
  returning id into v_new_member_id;

  -- create newborn record
  insert into public.newborns (
    pregnancy_id, member_id,
    birth_weight_kg, delivery_type, complications, recorded_by
  )
  values (
    p_pregnancy_id,
    v_new_member_id,
    (p_newborn_data->>'birth_weight_kg')::numeric,
    p_newborn_data->>'delivery_type',
    p_newborn_data->>'complications',
    p_actor_id
  );

  -- mark pregnancy delivered
  update public.pregnancies
  set status = 'delivered', actual_delivery_date = v_birth_date
  where id = p_pregnancy_id;

  -- seed birth vaccinations (recommended_age_days <= 0)
  insert into public.vaccinations (member_id, vaccine_code, scheduled_date, status)
  select v_new_member_id, vc.code, v_birth_date + vc.recommended_age_days, 'pending'
  from public.vaccine_catalog vc
  where vc.recommended_age_days <= 0
  on conflict (member_id, vaccine_code) do nothing;

  -- audit
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    p_actor_id, 'insert', 'newborns', v_new_member_id,
    null,
    jsonb_build_object('pregnancy_id', p_pregnancy_id, 'member_id', v_new_member_id, 'birth_date', v_birth_date)
  );

  return v_new_member_id;
end;
$$;

-- ============================================================
-- rpc_mark_deceased
-- ============================================================
create or replace function public.rpc_mark_deceased(
  p_member_id     uuid,
  p_deceased_date date,
  p_cause         text,
  p_actor_id      uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_member record;
begin
  select * into v_member from public.members where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;

  if v_member.status = 'deceased' then
    raise exception 'Member is already marked as deceased';
  end if;

  if v_member.is_head then
    raise exception 'Cannot mark the household head as deceased. Change the household head first.';
  end if;

  -- mark deceased
  update public.members
  set status = 'deceased', deceased_date = p_deceased_date
  where id = p_member_id;

  -- cancel pending vaccinations
  update public.vaccinations
  set status = 'skipped'
  where member_id = p_member_id and status = 'pending';

  -- cancel active pregnancies
  update public.pregnancies
  set status = 'terminated'
  where member_id = p_member_id and status = 'active';

  -- audit
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    p_actor_id, 'status_change', 'members', p_member_id,
    jsonb_build_object('status', v_member.status),
    jsonb_build_object('status', 'deceased', 'deceased_date', p_deceased_date, 'cause', p_cause)
  );
end;
$$;

-- ============================================================
-- rpc_mark_migrated
-- ============================================================
create or replace function public.rpc_mark_migrated(
  p_household_id  uuid,
  p_migrated_date date,
  p_actor_id      uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_household record;
  v_member    record;
begin
  select * into v_household from public.households where id = p_household_id;

  if not found then
    raise exception 'Household not found';
  end if;

  if v_household.status = 'migrated' then
    raise exception 'Household is already marked as migrated';
  end if;

  -- migrate household
  update public.households
  set status = 'migrated', migrated_at = p_migrated_date
  where id = p_household_id;

  insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    p_actor_id, 'status_change', 'households', p_household_id,
    jsonb_build_object('status', v_household.status),
    jsonb_build_object('status', 'migrated', 'migrated_at', p_migrated_date)
  );

  -- migrate all active members + audit each
  for v_member in
    select * from public.members
    where household_id = p_household_id and status = 'active'
  loop
    update public.members
    set status = 'migrated', migrated_date = p_migrated_date
    where id = v_member.id;

    insert into public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
    values (
      p_actor_id, 'status_change', 'members', v_member.id,
      jsonb_build_object('status', v_member.status),
      jsonb_build_object('status', 'migrated', 'migrated_date', p_migrated_date)
    );
  end loop;
end;
$$;
