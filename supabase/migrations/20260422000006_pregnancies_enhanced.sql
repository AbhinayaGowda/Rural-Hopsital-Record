-- ============================================================
-- Wave 4: Pregnancy enhancements + risk engine
-- ============================================================

-- 1. New columns on pregnancies
alter table pregnancies
  add column if not exists registered_at        timestamptz default now(),
  add column if not exists assigned_doctor_id   uuid references profiles(id),
  add column if not exists assigned_staff_id    uuid references profiles(id),
  add column if not exists complications        text[] default '{}',
  add column if not exists risk_factors         jsonb default '[]',
  add column if not exists missed_checkup_count int   default 0;

-- 2. Performance indexes
create index if not exists idx_pregnancies_status_risk
  on pregnancies(status, risk_level);

create index if not exists idx_pregnancies_assigned_doctor
  on pregnancies(assigned_doctor_id)
  where assigned_doctor_id is not null;

create index if not exists idx_pregnancy_checkups_next_date
  on pregnancy_checkups(next_checkup_date)
  where next_checkup_date is not null;

-- 3. compute_pregnancy_risk(p_pregnancy_id uuid)
create or replace function public.compute_pregnancy_risk(p_pregnancy_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_risk       text := 'low';
  v_age        int;
  v_dob        date;
  v_lmp        date;
  v_missed     int;
  v_last_bp_s  int;
  v_last_hgb   numeric;
  v_risk_factors jsonb;
  v_complications text[];
begin
  -- Fetch pregnancy + member info
  select
    m.date_of_birth,
    p.lmp_date,
    p.missed_checkup_count,
    p.risk_factors,
    p.complications
  into v_dob, v_lmp, v_missed, v_risk_factors, v_complications
  from pregnancies p
  join members m on m.id = p.member_id
  where p.id = p_pregnancy_id;

  if not found then return; end if;

  -- Latest checkup vitals
  select bp_systolic, hemoglobin
  into v_last_bp_s, v_last_hgb
  from pregnancy_checkups
  where pregnancy_id = p_pregnancy_id
  order by checkup_date desc
  limit 1;

  -- Age at conception
  if v_dob is not null and v_lmp is not null then
    v_age := extract(year from age(v_lmp, v_dob));
  end if;

  -- Risk escalation rules (low → medium → high)
  if v_age is not null and (v_age < 18 or v_age > 35) then
    v_risk := 'medium';
  end if;

  if v_missed >= 2 then
    v_risk := 'medium';
  end if;
  if v_missed >= 4 then
    v_risk := 'high';
  end if;

  if v_last_bp_s is not null and v_last_bp_s >= 140 then
    v_risk := 'high';
  end if;

  if v_last_hgb is not null and v_last_hgb < 8.0 then
    v_risk := 'high';
  elsif v_last_hgb is not null and v_last_hgb < 11.0 and v_risk = 'low' then
    v_risk := 'medium';
  end if;

  if jsonb_array_length(coalesce(v_risk_factors, '[]'::jsonb)) > 0 then
    if v_risk = 'low' then v_risk := 'medium'; end if;
  end if;

  if array_length(v_complications, 1) > 0 then
    v_risk := 'high';
  end if;

  update pregnancies set risk_level = v_risk where id = p_pregnancy_id;
end;
$$;

-- 4. BEFORE trigger on pregnancies (recursion guard)
create or replace function public.trg_pregnancy_risk_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  perform public.compute_pregnancy_risk(new.id);
  select risk_level into new.risk_level from pregnancies where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_pregnancy_risk_before on pregnancies;
create trigger trg_pregnancy_risk_before
  before update on pregnancies
  for each row
  when (old.missed_checkup_count is distinct from new.missed_checkup_count
     or old.complications        is distinct from new.complications
     or old.risk_factors         is distinct from new.risk_factors)
  execute function public.trg_pregnancy_risk_before();

-- 5. AFTER trigger on pregnancy_checkups → re-compute risk
create or replace function public.trg_checkup_recompute_risk()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.compute_pregnancy_risk(new.pregnancy_id);
  return null;
end;
$$;

drop trigger if exists trg_checkup_recompute_risk on pregnancy_checkups;
create trigger trg_checkup_recompute_risk
  after insert or update on pregnancy_checkups
  for each row
  execute function public.trg_checkup_recompute_risk();
