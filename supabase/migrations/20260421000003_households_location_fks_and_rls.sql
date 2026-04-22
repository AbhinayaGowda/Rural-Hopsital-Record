-- ============================================================
-- Add location FK columns to households (additive — keeps
-- existing free-text village/district/state columns intact)
-- ============================================================

alter table households
  add column if not exists state_id    uuid references states(id),
  add column if not exists district_id uuid references districts(id),
  add column if not exists village_id  uuid references villages(id);

-- ============================================================
-- Core access-control helper
-- Returns true if the calling user may access a given household.
-- Admins: always true.
-- Others: must have a matching district or village assignment.
-- Households with no district_id/village_id: admin-only until
--   an admin resolves them via the "Unclassified Households" view.
-- ============================================================

create or replace function public.user_can_access_household(hh_id uuid)
returns boolean
language sql stable security definer as $$
  select case
    when (select role from profiles where id = auth.uid()) = 'admin'
      then true
    else exists (
      select 1
      from   households h
      left join user_village_assignments  uva
             on uva.profile_id = auth.uid()
            and uva.village_id = h.village_id
      left join user_district_assignments uda
             on uda.profile_id = auth.uid()
            and uda.district_id = h.district_id
      where  h.id = hh_id
        and  (uva.profile_id is not null or uda.profile_id is not null)
    )
  end
$$;

-- ============================================================
-- Update RLS on households — scoped select
-- Replaces the Phase 1 permissive policy with location-aware one.
-- Insert/update policies are unchanged (no location restriction
-- on mutations — staff can always register a new household).
-- ============================================================

drop policy if exists "households_select_staff" on households;
create policy "households_select_staff" on households
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where  profiles.id = auth.uid()
        and  profiles.role in ('doctor','ground_staff','admin')
        and  profiles.is_active = true
    )
    and public.user_can_access_household(id)
  );

-- ============================================================
-- Update RLS on members — scoped via household
-- ============================================================

drop policy if exists "members_select_staff" on members;
create policy "members_select_staff" on members
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where  profiles.id = auth.uid()
        and  profiles.role in ('doctor','ground_staff','admin')
        and  profiles.is_active = true
    )
    and public.user_can_access_household(household_id)
  );

-- ============================================================
-- Update RLS on pregnancies — scoped via member → household
-- ============================================================

drop policy if exists "pregnancies_select_staff" on pregnancies;
create policy "pregnancies_select_staff" on pregnancies
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where  profiles.id = auth.uid()
        and  profiles.role in ('doctor','ground_staff','admin')
        and  profiles.is_active = true
    )
    and exists (
      select 1 from members m
      where  m.id = pregnancies.member_id
        and  public.user_can_access_household(m.household_id)
    )
  );

-- ============================================================
-- Update RLS on doctor_visits — scoped via member → household
-- ============================================================

drop policy if exists "doctor_visits_select_staff" on doctor_visits;
create policy "doctor_visits_select_staff" on doctor_visits
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where  profiles.id = auth.uid()
        and  profiles.role in ('doctor','ground_staff','admin')
        and  profiles.is_active = true
    )
    and exists (
      select 1 from members m
      where  m.id = doctor_visits.member_id
        and  public.user_can_access_household(m.household_id)
    )
  );

-- ============================================================
-- Update RLS on disease_history — scoped via member → household
-- ============================================================

drop policy if exists "disease_history_select_staff" on disease_history;
create policy "disease_history_select_staff" on disease_history
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where  profiles.id = auth.uid()
        and  profiles.role in ('doctor','ground_staff','admin')
        and  profiles.is_active = true
    )
    and exists (
      select 1 from members m
      where  m.id = disease_history.member_id
        and  public.user_can_access_household(m.household_id)
    )
  );

-- ============================================================
-- Performance indexes (PHASE_2.md §12)
-- ============================================================

create index if not exists idx_households_state_id    on households (state_id)    where state_id    is not null;
create index if not exists idx_households_district_id on households (district_id) where district_id is not null;
create index if not exists idx_households_village_id  on households (village_id)  where village_id  is not null;
