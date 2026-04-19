create table if not exists public.relationships (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members(id) on delete restrict,
  related_member_id uuid not null references public.members(id) on delete restrict,
  relationship_type text not null,
  created_at        timestamptz not null default now(),
  constraint relationships_unique unique (member_id, related_member_id, relationship_type)
);

create index if not exists relationships_member_id_idx         on public.relationships (member_id);
create index if not exists relationships_related_member_id_idx on public.relationships (related_member_id);

alter table public.relationships enable row level security;

create policy "relationships_select_staff"
  on public.relationships for select to authenticated
  using (public.current_role() in ('doctor', 'ground_staff', 'admin'));

create policy "relationships_insert_staff"
  on public.relationships for insert to authenticated
  with check (public.current_role() in ('ground_staff', 'admin'));

create policy "relationships_update_staff"
  on public.relationships for update to authenticated
  using (public.current_role() in ('ground_staff', 'admin'))
  with check (public.current_role() in ('ground_staff', 'admin'));

create policy "relationships_delete_staff"
  on public.relationships for delete to authenticated
  using (public.current_role() in ('ground_staff', 'admin'));
