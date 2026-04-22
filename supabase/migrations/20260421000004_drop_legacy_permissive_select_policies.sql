-- The Phase 1 *_select_authenticated policies were permissive (role check only).
-- The Phase 2 *_select_staff policies add location scoping, but Postgres ORs all
-- matching policies — so the old ones must be dropped or the location gate is bypassed.

drop policy if exists "households_select_authenticated" on households;
drop policy if exists "members_select_authenticated"    on members;
