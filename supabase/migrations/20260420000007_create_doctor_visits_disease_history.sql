-- doctor_visits
create table if not exists public.doctor_visits (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.members(id) on delete restrict,
  doctor_id      uuid not null references public.profiles(id),
  visit_date     date not null default current_date,
  symptoms       text,
  diagnosis      text,
  prescription   text,
  notes          text,
  follow_up_date date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists doctor_visits_member_id_idx  on public.doctor_visits (member_id);
create index if not exists doctor_visits_visit_date_idx on public.doctor_visits (visit_date desc);
create index if not exists doctor_visits_doctor_id_idx  on public.doctor_visits (doctor_id);

create trigger doctor_visits_set_updated_at
  before update on public.doctor_visits
  for each row execute function public.set_updated_at();

alter table public.doctor_visits enable row level security;

create policy "doctor_visits_select_staff"
  on public.doctor_visits for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "doctor_visits_insert_doctor"
  on public.doctor_visits for insert to authenticated
  with check (public.current_role() in ('doctor', 'admin'));

create policy "doctor_visits_update_doctor"
  on public.doctor_visits for update to authenticated
  using (public.current_role() in ('doctor', 'admin'))
  with check (public.current_role() in ('doctor', 'admin'));

-- disease_history
create table if not exists public.disease_history (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete restrict,
  disease_name  text not null,
  diagnosed_on  date,
  recovered_on  date,
  status        text check (status in ('active', 'recovered', 'chronic')),
  notes         text,
  recorded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists disease_history_member_id_idx on public.disease_history (member_id);
create index if not exists disease_history_status_idx    on public.disease_history (status);

create trigger disease_history_set_updated_at
  before update on public.disease_history
  for each row execute function public.set_updated_at();

alter table public.disease_history enable row level security;

create policy "disease_history_select_staff"
  on public.disease_history for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "disease_history_insert_staff"
  on public.disease_history for insert to authenticated
  with check (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "disease_history_update_doctor"
  on public.disease_history for update to authenticated
  using (public.current_role() in ('doctor', 'admin'))
  with check (public.current_role() in ('doctor', 'admin'));
