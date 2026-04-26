import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, member_id, vaccine_code, vaccine_name, scheduled_date, administered_date, next_dose_date, status, administered_by, notes, created_at, updated_at';

export async function listVaccinations(memberId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('vaccinations')
    .select(COLS, { count: 'exact' })
    .eq('member_id', memberId)
    .order('administered_date', { ascending: false, nullsFirst: false })
    .order('scheduled_date',   { ascending: true,  nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getVaccination(id) {
  const { data, error } = await supabaseAdmin
    .from('vaccinations')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Vaccination record not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function administerVaccination(id, { administered_date, notes }, actorId) {
  const existing = await getVaccination(id);
  if (existing.status === 'completed') {
    throw new AppError('CONFLICT', 'Vaccination already administered', 409);
  }
  if (existing.status === 'skipped') {
    throw new AppError('CONFLICT', 'Cannot administer a skipped vaccination', 409);
  }
  const { data, error } = await supabaseAdmin
    .from('vaccinations')
    .update({ status: 'completed', administered_date, administered_by: actorId, notes: notes ?? existing.notes })
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({
    actorId,
    action: 'update',
    tableName: 'vaccinations',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: 'completed', administered_date, administered_by: actorId },
  });
  return data;
}

export async function createVaccination(memberId, { vaccine_name, administered_date, next_dose_date, notes }, actorId) {
  const { data, error } = await supabaseAdmin
    .from('vaccinations')
    .insert({
      member_id:         memberId,
      vaccine_name,
      administered_date,
      next_dose_date:    next_dose_date ?? null,
      notes:             notes ?? null,
      status:            'completed',
      administered_by:   actorId,
    })
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'vaccinations', recordId: data.id, newData: data });
  return data;
}

export async function batchAdministerVaccinations(doses, actorId) {
  const { data, error } = await supabaseAdmin.rpc('rpc_batch_administer_vaccinations', {
    p_doses:    JSON.stringify(doses),
    p_actor_id: actorId,
  });
  if (error) throw new AppError('RPC_ERROR', error.message, 400);
  return data;
}
