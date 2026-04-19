create table if not exists public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  recipient_user_id   uuid not null references public.profiles(id) on delete cascade,
  type                text not null
                        check (type in ('checkup_reminder', 'vaccination_due', 'follow_up')),
  related_entity_type text,
  related_entity_id   uuid,
  message             text not null,
  scheduled_for       timestamptz,
  sent_at             timestamptz,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists notifications_recipient_idx     on public.notifications (recipient_user_id);
create index if not exists notifications_scheduled_for_idx on public.notifications (scheduled_for);
create index if not exists notifications_read_at_idx       on public.notifications (read_at) where read_at is null;

alter table public.notifications enable row level security;

-- users can only read their own notifications
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());

-- users can mark their own notifications as read (update read_at only)
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- inserts: service_role only (no authenticated insert policy)
