-- ============================================================
-- Wave 2: Health ID + phonetic search columns on members
-- ============================================================

create extension if not exists fuzzystrmatch schema extensions;
create extension if not exists unaccent        schema extensions;

-- New columns (additive, both nullable initially)
alter table members
  add column if not exists health_id     text unique,
  add column if not exists name_phonetic text;

-- Indexes
create index if not exists idx_members_health_id      on members (health_id)      where health_id      is not null;
create index if not exists idx_members_name_phonetic  on members (name_phonetic)  where name_phonetic  is not null;
create index if not exists idx_members_full_name_trgm on members using gin (full_name gin_trgm_ops);
create index if not exists idx_members_contact        on members (contact_number) where contact_number is not null;

-- ============================================================
-- Health ID generator
-- Format: HID-{STATE_CODE}-{4-char Crockford base32}-{check digit}
-- Example: HID-MH-A3K7-4
-- ============================================================

create sequence if not exists health_id_global_seq start 1;

create or replace function public.generate_health_id(p_state_code text)
returns text
language plpgsql
as $$
declare
  v_seq    bigint;
  v_b32    text    := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_chars  text    := '';
  v_n      bigint;
  v_sum    int     := 0;
  i        int;
  v_src    text;
begin
  v_seq := nextval('health_id_global_seq');
  v_n   := v_seq;

  for i in 1..4 loop
    v_chars := substr(v_b32, (v_n % 32)::int + 1, 1) || v_chars;
    v_n     := v_n / 32;
  end loop;

  v_src := upper(p_state_code) || v_chars;
  for i in 1..length(v_src) loop
    v_sum := v_sum + ascii(substr(v_src, i, 1));
  end loop;

  return 'HID-' || upper(p_state_code) || '-' || v_chars || '-' || ((v_sum % 9) + 1)::text;
end;
$$;

-- ============================================================
-- Trigger: auto-assign health_id on INSERT
-- ============================================================

create or replace function public.trigger_assign_health_id()
returns trigger
language plpgsql
as $$
declare
  v_state_code text;
begin
  if new.health_id is not null then
    return new;
  end if;

  select s.code into v_state_code
  from   households h
  join   states     s on s.id = h.state_id
  where  h.id = new.household_id;

  new.health_id := public.generate_health_id(coalesce(v_state_code, 'IN'));
  return new;
end;
$$;

drop trigger if exists trg_assign_health_id on members;
create trigger trg_assign_health_id
  before insert on members
  for each row execute function public.trigger_assign_health_id();

-- ============================================================
-- Trigger: compute phonetic code on INSERT / UPDATE of full_name
-- ============================================================

create or replace function public.trigger_set_name_phonetic()
returns trigger
language plpgsql
as $$
begin
  new.name_phonetic := extensions.dmetaphone(new.full_name);
  return new;
end;
$$;

drop trigger if exists trg_set_name_phonetic on members;
create trigger trg_set_name_phonetic
  before insert or update of full_name on members
  for each row execute function public.trigger_set_name_phonetic();

-- Back-fill phonetic for existing rows
update members
set    name_phonetic = extensions.dmetaphone(full_name)
where  name_phonetic is null;
