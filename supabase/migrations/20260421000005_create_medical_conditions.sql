-- ============================================================
-- Medical conditions reference table (ICD-10 based)
-- Used as FK target from disease_history.condition_id
-- ============================================================

create table if not exists medical_conditions (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,           -- ICD-10 code, e.g. 'A00.0'
  name           text not null,
  name_short     text,
  category       text not null check (category in (
                   'infectious','maternal','chronic',
                   'child_health','injury','mental_health','other'
                 )),
  risk_pregnancy boolean not null default false,
  is_chronic     boolean not null default false,
  verified       boolean not null default true,
  created_at     timestamptz default now()
);

-- Trigram index for name search in forms
create index if not exists idx_medical_conditions_name_trgm
  on medical_conditions using gin (name gin_trgm_ops);

-- ============================================================
-- RLS
-- ============================================================

alter table medical_conditions enable row level security;

-- All active staff can read (needed for disease-history forms)
drop policy if exists "conditions_select_staff" on medical_conditions;
create policy "conditions_select_staff" on medical_conditions
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('doctor','ground_staff','admin')
        and profiles.is_active = true
    )
  );

-- Only admins can add / update conditions
drop policy if exists "conditions_write_admin" on medical_conditions;
create policy "conditions_write_admin" on medical_conditions
  for all to authenticated
  using   (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
-- Link disease_history → medical_conditions
-- ============================================================

alter table disease_history
  add column if not exists condition_id uuid references medical_conditions(id);
