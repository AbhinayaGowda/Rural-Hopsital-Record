-- pregnancies
create table if not exists public.pregnancies (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references public.members(id) on delete restrict,
  lmp_date             date,
  expected_due_date    date,
  actual_delivery_date date,
  risk_level           text not null default 'low'
                         check (risk_level in ('low', 'medium', 'high')),
  status               text not null
                         check (status in ('active', 'delivered', 'miscarried', 'terminated')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- one active pregnancy per member at a time
create unique index if not exists pregnancies_one_active_per_member
  on public.pregnancies (member_id)
  where status = 'active';

create index if not exists pregnancies_member_id_idx on public.pregnancies (member_id);
create index if not exists pregnancies_status_idx    on public.pregnancies (status);

create trigger pregnancies_set_updated_at
  before update on public.pregnancies
  for each row execute function public.set_updated_at();

alter table public.pregnancies enable row level security;

create policy "pregnancies_select_staff"
  on public.pregnancies for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "pregnancies_insert_staff"
  on public.pregnancies for insert to authenticated
  with check (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "pregnancies_update_doctor"
  on public.pregnancies for update to authenticated
  using (public.current_role() in ('doctor', 'admin'))
  with check (public.current_role() in ('doctor', 'admin'));

-- pregnancy_checkups
create table if not exists public.pregnancy_checkups (
  id                uuid primary key default gen_random_uuid(),
  pregnancy_id      uuid not null references public.pregnancies(id) on delete restrict,
  checkup_date      date not null,
  week_number       int,
  weight_kg         numeric(5, 2),
  bp_systolic       int,
  bp_diastolic      int,
  hemoglobin        numeric(4, 2),
  doctor_id         uuid references public.profiles(id),
  notes             text,
  next_checkup_date date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists pregnancy_checkups_pregnancy_id_idx on public.pregnancy_checkups (pregnancy_id);
create index if not exists pregnancy_checkups_checkup_date_idx on public.pregnancy_checkups (checkup_date desc);

create trigger pregnancy_checkups_set_updated_at
  before update on public.pregnancy_checkups
  for each row execute function public.set_updated_at();

alter table public.pregnancy_checkups enable row level security;

create policy "pregnancy_checkups_select_staff"
  on public.pregnancy_checkups for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "pregnancy_checkups_insert_doctor"
  on public.pregnancy_checkups for insert to authenticated
  with check (public.current_role() in ('doctor', 'admin'));

create policy "pregnancy_checkups_update_doctor"
  on public.pregnancy_checkups for update to authenticated
  using (public.current_role() in ('doctor', 'admin'))
  with check (public.current_role() in ('doctor', 'admin'));

-- newborns
create table if not exists public.newborns (
  id              uuid primary key default gen_random_uuid(),
  pregnancy_id    uuid not null unique references public.pregnancies(id) on delete restrict,
  member_id       uuid not null unique references public.members(id) on delete restrict,
  birth_weight_kg numeric(4, 2),
  delivery_type   text check (delivery_type in ('normal', 'c-section', 'assisted')),
  complications   text,
  recorded_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists newborns_pregnancy_id_idx on public.newborns (pregnancy_id);

alter table public.newborns enable row level security;

create policy "newborns_select_staff"
  on public.newborns for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

-- inserts go through rpc_register_delivery (service_role); no direct insert for authenticated
create policy "newborns_update_doctor"
  on public.newborns for update to authenticated
  using (public.current_role() in ('doctor', 'admin'))
  with check (public.current_role() in ('doctor', 'admin'));
