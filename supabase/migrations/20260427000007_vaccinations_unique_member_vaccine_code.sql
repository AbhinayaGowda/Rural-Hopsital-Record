-- Add partial unique index so ON CONFLICT (member_id, vaccine_code) works
-- in rpc_register_delivery when seeding birth vaccines.
-- Partial (WHERE vaccine_code IS NOT NULL) because free-text entries have no code.
CREATE UNIQUE INDEX IF NOT EXISTS vaccinations_member_vaccine_code_uniq
  ON public.vaccinations (member_id, vaccine_code)
  WHERE vaccine_code IS NOT NULL;
