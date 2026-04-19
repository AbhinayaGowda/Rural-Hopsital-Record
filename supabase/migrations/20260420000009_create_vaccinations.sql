-- vaccine_catalog (static seed data — no user writes)
create table if not exists public.vaccine_catalog (
  code                  text primary key,
  name                  text not null,
  recommended_age_days  int  not null,
  sequence_order        int  not null,
  created_at            timestamptz not null default now()
);

alter table public.vaccine_catalog enable row level security;

create policy "vaccine_catalog_select_staff"
  on public.vaccine_catalog for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

-- seed: Indian National Immunization Schedule
insert into public.vaccine_catalog (code, name, recommended_age_days, sequence_order) values
  ('BCG',            'BCG',                                  0,   1),
  ('OPV_0',          'OPV Birth Dose',                       0,   2),
  ('HEP_B_BIRTH',    'Hepatitis B Birth Dose',               0,   3),
  ('DPT_1',          'DPT 1st Dose',                        42,   4),
  ('OPV_1',          'OPV 1st Dose',                        42,   5),
  ('HEP_B_1',        'Hepatitis B 1st Dose',                42,   6),
  ('HIB_1',          'Hib 1st Dose',                        42,   7),
  ('ROTA_1',         'Rotavirus 1st Dose',                  42,   8),
  ('PCV_1',          'PCV 1st Dose',                        42,   9),
  ('DPT_2',          'DPT 2nd Dose',                        70,  10),
  ('OPV_2',          'OPV 2nd Dose',                        70,  11),
  ('HEP_B_2',        'Hepatitis B 2nd Dose',                70,  12),
  ('HIB_2',          'Hib 2nd Dose',                        70,  13),
  ('ROTA_2',         'Rotavirus 2nd Dose',                  70,  14),
  ('PCV_2',          'PCV 2nd Dose',                        70,  15),
  ('DPT_3',          'DPT 3rd Dose',                        98,  16),
  ('OPV_3',          'OPV 3rd Dose',                        98,  17),
  ('HEP_B_3',        'Hepatitis B 3rd Dose',                98,  18),
  ('HIB_3',          'Hib 3rd Dose',                        98,  19),
  ('ROTA_3',         'Rotavirus 3rd Dose',                  98,  20),
  ('PCV_3',          'PCV 3rd Dose',                        98,  21),
  ('IPV_1',          'IPV 1st Dose',                        98,  22),
  ('MEASLES_1',      'Measles 1st Dose',                   274,  23),
  ('VIT_A_1',        'Vitamin A 1st Dose',                 274,  24),
  ('DPT_BOOSTER_1',  'DPT Booster 1st Dose',               548,  25),
  ('OPV_BOOSTER',    'OPV Booster',                        548,  26),
  ('MEASLES_2',      'Measles 2nd Dose (MR)',              548,  27)
on conflict (code) do nothing;

-- vaccinations
create table if not exists public.vaccinations (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members(id) on delete restrict,
  vaccine_code      text not null references public.vaccine_catalog(code),
  scheduled_date    date,
  administered_date date,
  status            text not null default 'pending'
                      check (status in ('pending', 'completed', 'missed', 'skipped')),
  administered_by   uuid references public.profiles(id),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint vaccinations_member_vaccine_unique unique (member_id, vaccine_code)
);

create index if not exists vaccinations_member_id_idx      on public.vaccinations (member_id);
create index if not exists vaccinations_status_idx         on public.vaccinations (status);
create index if not exists vaccinations_scheduled_date_idx on public.vaccinations (scheduled_date);

create trigger vaccinations_set_updated_at
  before update on public.vaccinations
  for each row execute function public.set_updated_at();

alter table public.vaccinations enable row level security;

create policy "vaccinations_select_staff"
  on public.vaccinations for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "vaccinations_insert_staff"
  on public.vaccinations for insert to authenticated
  with check (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "vaccinations_update_staff"
  on public.vaccinations for update to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'))
  with check (public.current_role() in ('doctor', 'ground_staff', 'admin'));
