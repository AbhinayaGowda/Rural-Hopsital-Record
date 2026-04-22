-- ============================================================
-- Wave 4: Referral tracking
-- ============================================================

create table if not exists referrals (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references members(id) on delete restrict,
  referred_by          uuid not null references profiles(id),
  referred_to          text not null,
  reason               text not null,
  urgency              text not null default 'routine'
                         check (urgency in ('routine','urgent','emergency')),
  referred_at          timestamptz not null default now(),
  outcome              text,
  outcome_recorded_at  timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_referrals_member on referrals(member_id);
create index if not exists idx_referrals_referred_by on referrals(referred_by);
create index if not exists idx_referrals_urgency on referrals(urgency) where outcome is null;

drop trigger if exists trg_referrals_updated_at on referrals;
create trigger trg_referrals_updated_at
  before update on referrals
  for each row execute function public.set_updated_at();

alter table referrals enable row level security;

drop policy if exists "referrals_select_auth" on referrals;
create policy "referrals_select_auth" on referrals
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_active = true
        and profiles.role in ('doctor','ground_staff','admin')
    )
  );

drop policy if exists "referrals_insert_doctor_admin" on referrals;
create policy "referrals_insert_doctor_admin" on referrals
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_active = true
        and profiles.role in ('doctor','admin')
    )
  );

drop policy if exists "referrals_update_doctor_admin" on referrals;
create policy "referrals_update_doctor_admin" on referrals
  for update to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_active = true
        and profiles.role in ('doctor','admin')
    )
  );
