import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, member_id, disease_name, diagnosed_on, recovered_on, status, notes, recorded_by, created_at, updated_at';

export async function listDiseaseHistory(memberId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('disease_history')
    .select(COLS, { count: 'exact' })
    .eq('member_id', memberId)
    .order('diagnosed_on', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getDiseaseHistoryEntry(id) {
  const { data, error } = await supabaseAdmin
    .from('disease_history')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Disease history entry not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function createDiseaseHistory(memberId, payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('disease_history')
    .insert({ ...payload, member_id: memberId, recorded_by: actorId })
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'disease_history', recordId: data.id, newData: data });
  return data;
}

export async function updateDiseaseHistory(id, payload, actorId) {
  const existing = await getDiseaseHistoryEntry(id);
  const { data, error } = await supabaseAdmin
    .from('disease_history')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'disease_history', recordId: id, oldData: existing, newData: data });
  return data;
}
