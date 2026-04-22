-- ============================================================
-- Location hierarchy: states → districts → (cities) → villages
-- ============================================================

create table if not exists states (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,   -- 'MH', 'UP', 'KA' — matches Health ID prefix
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists districts (
  id          uuid primary key default gen_random_uuid(),
  state_id    uuid not null references states(id),
  name        text not null,
  code        text,                   -- optional census code
  created_at  timestamptz default now(),
  unique (state_id, name)
);

create table if not exists cities (
  id          uuid primary key default gen_random_uuid(),
  district_id uuid not null references districts(id),
  name        text not null,
  created_at  timestamptz default now(),
  unique (district_id, name)
);

create table if not exists villages (
  id              uuid primary key default gen_random_uuid(),
  district_id     uuid not null references districts(id),
  city_id         uuid references cities(id),   -- nullable
  name            text not null,
  pincode         text,
  centroid_lat    numeric(9,6),
  centroid_lng    numeric(9,6),
  verified        boolean default true,         -- false = admin-added, pending review
  created_at      timestamptz default now(),
  unique (district_id, name)
);

-- Indexes for dropdown performance
create index if not exists idx_districts_state_id   on districts (state_id);
create index if not exists idx_cities_district_id   on cities (district_id);
create index if not exists idx_villages_district_id on villages (district_id);
create index if not exists idx_villages_city_id     on villages (city_id) where city_id is not null;

-- ============================================================
-- RLS
-- ============================================================

alter table states    enable row level security;
alter table districts enable row level security;
alter table cities    enable row level security;
alter table villages  enable row level security;

-- All authenticated active users can read location data (needed for dropdowns)
drop policy if exists "states_select_authenticated"    on states;
create policy "states_select_authenticated" on states
  for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_active = true)
  );

drop policy if exists "districts_select_authenticated" on districts;
create policy "districts_select_authenticated" on districts
  for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_active = true)
  );

drop policy if exists "cities_select_authenticated" on cities;
create policy "cities_select_authenticated" on cities
  for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_active = true)
  );

drop policy if exists "villages_select_authenticated" on villages;
create policy "villages_select_authenticated" on villages
  for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_active = true)
  );

-- Only admins can insert/update location reference data
drop policy if exists "states_write_admin"    on states;
create policy "states_write_admin" on states
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists "districts_write_admin" on districts;
create policy "districts_write_admin" on districts
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists "cities_write_admin" on cities;
create policy "cities_write_admin" on cities
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists "villages_write_admin" on villages;
create policy "villages_write_admin" on villages
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
