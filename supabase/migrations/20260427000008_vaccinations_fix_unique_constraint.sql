-- Replace partial unique index with a proper unique constraint so that
-- ON CONFLICT (member_id, vaccine_code) in rpc_register_delivery resolves correctly.
-- NULL != NULL in Postgres, so rows with vaccine_code = NULL (free-text entries) are unaffected.
DROP INDEX IF EXISTS vaccinations_member_vaccine_code_uniq;

ALTER TABLE public.vaccinations
  ADD CONSTRAINT vaccinations_member_vaccine_code_uniq
  UNIQUE (member_id, vaccine_code);
