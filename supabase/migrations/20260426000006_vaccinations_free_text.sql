-- Add vaccine_name for free-text vaccines
alter table public.vaccinations add column if not exists vaccine_name text;

-- Add next_dose_date for doctor-set follow-up dose
alter table public.vaccinations add column if not exists next_dose_date date;

-- Make vaccine_code nullable (predefined catalog is optional going forward)
alter table public.vaccinations alter column vaccine_code drop not null;

-- Drop FK constraint so vaccine_code can be any string or null
alter table public.vaccinations drop constraint if exists vaccinations_vaccine_code_fkey;

-- Drop unique constraint (member_id, vaccine_code) — no longer meaningful with free-text
alter table public.vaccinations drop constraint if exists vaccinations_member_vaccine_unique;

-- Add index on next_dose_date for notification queries
create index if not exists vaccinations_next_dose_date_idx on public.vaccinations (next_dose_date);

drop policy if exists "vaccinations_insert_staff" on public.vaccinations;
create policy "vaccinations_insert_staff"
  on public.vaccinations for insert to authenticated
  with check (public.current_role() in ('doctor', 'ground_staff', 'admin'));
