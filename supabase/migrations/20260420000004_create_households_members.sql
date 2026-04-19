-- households (head_member_id added after members exists)
create table if not exists public.households (
  id             uuid primary key default gen_random_uuid(),
  malaria_number text unique not null,
  address_line   text,
  village        text,
  district       text,
  state          text,
  pincode        text,
  status         text not null default 'active'
                   check (status in ('active', 'migrated', 'dissolved')),
  migrated_at    timestamptz,
  notes          text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists households_malaria_number_idx on public.households (malaria_number);
create index if not exists households_village_idx        on public.households (village);
create index if not exists households_status_idx         on public.households (status);

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- members
create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households(id) on delete restrict,
  full_name        text not null,
  gender           text check (gender in ('M', 'F', 'O')),
  date_of_birth    date,
  aadhaar          text,
  relation_to_head text check (relation_to_head in ('self','spouse','son','daughter','parent','sibling','other')),
  is_head          boolean not null default false,
  contact_number   text,
  status           text not null default 'active'
                     check (status in ('active','deceased','migrated','pregnant','follow_up')),
  deceased_date    date,
  migrated_date    date,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint members_aadhaar_unique unique nulls not distinct (aadhaar)
);

-- only one head per household
create unique index if not exists members_one_head_per_household
  on public.members (household_id)
  where is_head = true;

create index if not exists members_household_id_idx on public.members (household_id);
create index if not exists members_status_idx        on public.members (status);
create index if not exists members_full_name_idx     on public.members using gin (full_name extensions.gin_trgm_ops);

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- now add the circular FK: households.head_member_id → members
alter table public.households
  add column if not exists head_member_id uuid references public.members(id);

-- RLS: households
alter table public.households enable row level security;

create policy "households_select_authenticated"
  on public.households
  for select
  to authenticated
  using (
    public.current_role() in ('doctor', 'ground_staff', 'admin')
  );

create policy "households_insert_staff"
  on public.households
  for insert
  to authenticated
  with check (
    public.current_role() in ('ground_staff', 'admin')
  );

create policy "households_update_staff"
  on public.households
  for update
  to authenticated
  using (public.current_role() in ('ground_staff', 'admin'))
  with check (public.current_role() in ('ground_staff', 'admin'));

-- RLS: members
alter table public.members enable row level security;

create policy "members_select_authenticated"
  on public.members
  for select
  to authenticated
  using (
    public.current_role() in ('doctor', 'ground_staff', 'admin')
  );

create policy "members_insert_staff"
  on public.members
  for insert
  to authenticated
  with check (
    public.current_role() in ('ground_staff', 'admin')
  );

create policy "members_update_staff"
  on public.members
  for update
  to authenticated
  using (public.current_role() in ('ground_staff', 'admin', 'doctor'))
  with check (public.current_role() in ('ground_staff', 'admin', 'doctor'));
