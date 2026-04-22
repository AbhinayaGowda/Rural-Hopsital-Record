import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const PREG_COLS = 'id, member_id, lmp_date, expected_due_date, actual_delivery_date, risk_level, status, notes, registered_at, assigned_doctor_id, assigned_staff_id, complications, risk_factors, missed_checkup_count, created_at, updated_at';

function addTrimester(preg) {
  if (!preg || !preg.lmp_date) return preg;
  const daysPregnant = Math.floor((Date.now() - new Date(preg.lmp_date)) / 86_400_000);
  const trimester = daysPregnant < 84 ? 1 : daysPregnant < 189 ? 2 : 3;
  return { ...preg, trimester };
}
const CHECKUP_COLS = 'id, pregnancy_id, checkup_date, week_number, weight_kg, bp_systolic, bp_diastolic, hemoglobin, doctor_id, notes, next_checkup_date, created_at, updated_at';

export async function listPregnancies(memberId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('pregnancies')
    .select(PREG_COLS, { count: 'exact' })
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data.map(addTrimester), total: count, limit, offset };
}

export async function getPregnancy(id) {
  const { data, error } = await supabaseAdmin
    .from('pregnancies')
    .select(PREG_COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Pregnancy not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return addTrimester(data);
}

export async function createPregnancy(memberId, payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('pregnancies')
    .insert({ ...payload, member_id: memberId })
    .select(PREG_COLS)
    .single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Member already has an active pregnancy', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'pregnancies', recordId: data.id, newData: data });
  return addTrimester(data);
}

export async function updatePregnancy(id, payload, actorId) {
  const existing = await getPregnancy(id);

  // Delivered pregnancies are sealed — the delivery RPC is the only correct path.
  if (existing.status === 'delivered') {
    throw new AppError('CONFLICT', 'This pregnancy has been delivered and cannot be modified.', 409);
  }
  // Closed pregnancies (terminated/miscarried) cannot be reopened.
  if (existing.status !== 'active' && payload.status && payload.status !== existing.status) {
    throw new AppError('CONFLICT', `Cannot change status of a ${existing.status} pregnancy.`, 409);
  }

  const { data, error } = await supabaseAdmin
    .from('pregnancies')
    .update(payload)
    .eq('id', id)
    .select(PREG_COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'pregnancies', recordId: id, oldData: existing, newData: data });
  return addTrimester(data);
}

export async function listCheckups(pregnancyId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('pregnancy_checkups')
    .select(CHECKUP_COLS, { count: 'exact' })
    .eq('pregnancy_id', pregnancyId)
    .order('checkup_date', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function createCheckup(pregnancyId, payload, actorId) {
  const pregnancy = await getPregnancy(pregnancyId);
  if (pregnancy.status !== 'active') {
    throw new AppError('CONFLICT', 'Cannot add a checkup to a non-active pregnancy', 409);
  }
  const { data, error } = await supabaseAdmin
    .from('pregnancy_checkups')
    .insert({ ...payload, pregnancy_id: pregnancyId, doctor_id: actorId })
    .select(CHECKUP_COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'pregnancy_checkups', recordId: data.id, newData: data });
  return data;
}

export async function registerDelivery(pregnancyId, newbornData, actorId) {
  const { data, error } = await supabaseAdmin.rpc('rpc_register_delivery', {
    p_pregnancy_id: pregnancyId,
    p_newborn_data: newbornData,
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
  return { new_member_id: data };
}
