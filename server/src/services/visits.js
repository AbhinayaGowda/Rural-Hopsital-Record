import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, member_id, doctor_id, visit_date, symptoms, diagnosis, prescription, notes, follow_up_date, created_at, updated_at';

export async function listVisits(memberId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('doctor_visits')
    .select(COLS, { count: 'exact' })
    .eq('member_id', memberId)
    .order('visit_date', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getVisit(id) {
  const { data, error } = await supabaseAdmin
    .from('doctor_visits')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Visit not found', 404);
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  return data;
}

export async function createVisit(memberId, payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('doctor_visits')
    .insert({ ...payload, member_id: memberId, doctor_id: actorId })
    .select(COLS)
    .single();
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'doctor_visits', recordId: data.id, newData: data });
  return data;
}

export async function updateVisit(id, payload, actorId) {
  const existing = await getVisit(id);
  const { data, error } = await supabaseAdmin
    .from('doctor_visits')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('DB_ERROR', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'doctor_visits', recordId: id, oldData: existing, newData: data });
  return data;
}
