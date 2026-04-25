-- Add channel, delivery_status, external_id, phone_number to notifications
alter table notifications
  add column if not exists channel text default 'in_app'
    check (channel in ('in_app','sms','whatsapp')),
  add column if not exists delivery_status text default 'pending'
    check (delivery_status in ('pending','sent','failed','delivered','skipped')),
  add column if not exists external_id text,
  add column if not exists phone_number text;

-- Index for the cron worker queue
create index if not exists idx_notifications_queue
  on notifications (scheduled_for, delivery_status)
  where delivery_status = 'pending';
