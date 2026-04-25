import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, household_id, full_name, gender, date_of_birth, aadhaar, abha_id, relation_to_head, is_head, contact_number, status, deceased_date, migrated_date, health_id, name_phonetic, created_by, created_at, updated_at';

export async function listMembers(householdId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('members')
    .select(COLS, { count: 'exact' })
    .eq('household_id', householdId)
    .order('is_head', { ascending: false })
    .order('full_name', { ascending: true })
    .range(offset, offset + limit - 1);
  // TODO: count: 'exact' becomes expensive past ~10k rows; switch to estimated count or cursor pagination if this table grows large
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getMember(id) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Member not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function createMember(householdId, payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .insert({ ...payload, household_id: householdId, created_by: actorId })
    .select(COLS)
    .single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Aadhaar number already registered', 409);
  if (error?.code === '23P01') throw new AppError('CONFLICT', 'A head member already exists for this household', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'members', recordId: data.id, newData: data });
  return data;
}

export async function updateMember(id, payload, actorId) {
  const existing = await getMember(id);
  if (existing.status === 'deceased' || existing.status === 'migrated') {
    throw new AppError('FORBIDDEN', `Cannot update a ${existing.status} member`, 403);
  }
  const { data, error } = await supabaseAdmin
    .from('members')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Aadhaar number already registered', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'members', recordId: id, oldData: existing, newData: data });
  return data;
}

export async function markDeceased(memberId, deceasedDate, cause, actorId) {
  const { error } = await supabaseAdmin.rpc('rpc_mark_deceased', {
    p_member_id: memberId,
    p_deceased_date: deceasedDate,
    p_cause: cause ?? null,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
}
