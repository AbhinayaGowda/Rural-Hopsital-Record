-- Replace UNIQUE NULLS NOT DISTINCT with a partial unique index
-- so multiple members can have aadhaar = null (common for unregistered patients)
alter table members drop constraint if exists members_aadhaar_unique;
create unique index if not exists members_aadhaar_unique
  on members (aadhaar)
  where aadhaar is not null;
