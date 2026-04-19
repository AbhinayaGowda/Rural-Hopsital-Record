import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, malaria_number, address_line, village, district, state, pincode, status, migrated_at, notes, created_by, head_member_id, created_at, updated_at';

export async function listHouseholds({ malaria_number, village, status, limit, offset }) {
  let q = supabaseAdmin
    .from('households')
    .select(COLS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (malaria_number) q = q.ilike('malaria_number', `%${malaria_number}%`);
  if (village) q = q.ilike('village', `%${village}%`);
  if (status) q = q.eq('status', status);

  const { data, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getHousehold(id) {
  const { data, error } = await supabaseAdmin
    .from('households')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Household not found', 404);
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  return data;
}

export async function createHousehold(payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('households')
    .insert({ ...payload, created_by: actorId })
    .select(COLS)
    .single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Malaria number already exists', 409);
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'households', recordId: data.id, newData: data });
  return data;
}

export async function updateHousehold(id, payload, actorId) {
  const existing = await getHousehold(id);
  const { data, error } = await supabaseAdmin
    .from('households')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'households', recordId: id, oldData: existing, newData: data });
  return data;
}

export async function changeHouseholdHead(householdId, newHeadMemberId, actorId) {
  const { error } = await supabaseAdmin.rpc('rpc_change_household_head', {
    p_household_id: householdId,
    p_new_head_id: newHeadMemberId,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
}

export async function migrateHousehold(householdId, migratedDate, actorId) {
  const { error } = await supabaseAdmin.rpc('rpc_mark_migrated', {
    p_household_id: householdId,
    p_migrated_date: migratedDate,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
}
