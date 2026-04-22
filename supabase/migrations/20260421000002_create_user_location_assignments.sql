-- ============================================================
-- User ↔ location assignment join tables
-- A user can be scoped at district level (all villages in it)
-- OR at village level (specific subset), OR both.
-- Admin has implicit full access — no rows needed.
-- ============================================================

create table if not exists user_district_assignments (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  district_id uuid not null references districts(id) on delete cascade,
  assigned_at timestamptz default now(),
  assigned_by uuid references profiles(id),
  unique (profile_id, district_id)
);

create table if not exists user_village_assignments (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  village_id  uuid not null references villages(id) on delete cascade,
  assigned_at timestamptz default now(),
  assigned_by uuid references profiles(id),
  unique (profile_id, village_id)
);

-- Indexes — queried on every scoped list request
create index if not exists idx_uda_profile_id  on user_district_assignments (profile_id);
create index if not exists idx_uda_district_id on user_district_assignments (district_id);
create index if not exists idx_uva_profile_id  on user_village_assignments (profile_id);
create index if not exists idx_uva_village_id  on user_village_assignments (village_id);

-- ============================================================
-- RLS
-- ============================================================

alter table user_district_assignments enable row level security;
alter table user_village_assignments  enable row level security;

-- Admins see everything; users see only their own assignments
drop policy if exists "uda_select" on user_district_assignments;
create policy "uda_select" on user_district_assignments
  for select to authenticated
  using (
    public.current_role() = 'admin'
    or profile_id = auth.uid()
  );

drop policy if exists "uva_select" on user_village_assignments;
create policy "uva_select" on user_village_assignments
  for select to authenticated
  using (
    public.current_role() = 'admin'
    or profile_id = auth.uid()
  );

-- Only admins can create / remove assignments
drop policy if exists "uda_write_admin" on user_district_assignments;
create policy "uda_write_admin" on user_district_assignments
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists "uva_write_admin" on user_village_assignments;
create policy "uva_write_admin" on user_village_assignments
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
