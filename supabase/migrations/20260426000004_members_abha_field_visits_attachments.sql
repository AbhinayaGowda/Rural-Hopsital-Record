-- ABHA ID on members
alter table members
  add column if not exists abha_id text unique;

-- Field visits table (ground staff logs)
create table if not exists field_visits (
  id                 uuid primary key default gen_random_uuid(),
  staff_id           uuid references profiles(id) not null,
  village_id         uuid references villages(id) not null,
  visited_at         timestamptz default now(),
  households_updated int default 0,
  members_added      int default 0,
  notes              text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create trigger trg_field_visits_updated_at
  before update on field_visits
  for each row execute procedure public.set_updated_at();

alter table field_visits enable row level security;

create policy "field_visits_select" on field_visits
  for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_active = true));

create policy "field_visits_insert" on field_visits
  for insert to authenticated
  with check (
    staff_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_active = true)
  );

create policy "field_visits_update_own" on field_visits
  for update to authenticated
  using (staff_id = auth.uid());

-- Attachments table
create table if not exists attachments (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null check (entity_type in ('member','visit','pregnancy_checkup')),
  entity_id     uuid not null,
  storage_path  text not null,
  mime_type     text not null,
  size_bytes    int not null,
  uploaded_by   uuid references profiles(id) not null,
  uploaded_at   timestamptz default now()
);

create index if not exists idx_attachments_entity on attachments (entity_type, entity_id);

alter table attachments enable row level security;

create policy "attachments_select" on attachments
  for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_active = true));

create policy "attachments_insert" on attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_active = true)
  );
