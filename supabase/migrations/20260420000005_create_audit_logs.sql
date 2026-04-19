create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id),
  action      text not null check (action in ('insert', 'update', 'delete', 'status_change')),
  table_name  text not null,
  record_id   uuid not null,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx   on public.audit_logs (actor_id);
create index if not exists audit_logs_table_name_idx on public.audit_logs (table_name);
create index if not exists audit_logs_record_id_idx  on public.audit_logs (record_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- admins can read all audit logs
create policy "audit_logs_select_admin"
  on public.audit_logs
  for select
  to authenticated
  using (public.current_role() = 'admin');

-- no insert policy for authenticated/anon: only service_role (bypasses RLS) may insert
-- no update policy
-- no delete policy
