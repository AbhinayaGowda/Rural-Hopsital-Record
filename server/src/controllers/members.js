import { validate } from '../lib/validate.js';
import { createMemberSchema, updateMemberSchema, markDeceasedSchema } from '../../../shared/schemas/members.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/members.js';
import { getHousehold, assertHouseholdInScope } from '../services/households.js';

export async function listMembers(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  // Scope check: household must be in caller's area
  const household = await getHousehold(req.params.householdId);
  assertHouseholdInScope(household, req.locationScope);
  const result = await svc.listMembers(req.params.householdId, { limit, offset });
  res.json({ data: result, error: null });
}

export async function getOne(req, res) {
  const member = await svc.getMember(req.params.id);
  const household = await getHousehold(member.household_id);
  assertHouseholdInScope(household, req.locationScope);
  res.json({ data: member, error: null });
}

export async function createMember(req, res) {
  const payload = validate(createMemberSchema, req.body);
  const household = await getHousehold(req.params.householdId);
  assertHouseholdInScope(household, req.locationScope);
  const member = await svc.createMember(req.params.householdId, payload, req.profile.id);
  res.status(201).json({ data: member, error: null });
}

export async function update(req, res) {
  const payload = validate(updateMemberSchema, req.body);
  const member = await svc.getMember(req.params.id);
  const household = await getHousehold(member.household_id);
  assertHouseholdInScope(household, req.locationScope);
  const updated = await svc.updateMember(req.params.id, payload, req.profile.id);
  res.json({ data: updated, error: null });
}

export async function markDeceased(req, res) {
  const { deceased_date, cause } = validate(markDeceasedSchema, req.body);
  const member = await svc.getMember(req.params.id);
  const household = await getHousehold(member.household_id);
  assertHouseholdInScope(household, req.locationScope);
  await svc.markDeceased(req.params.id, deceased_date, cause, req.profile.id);
  res.json({ data: { success: true }, error: null });
}
