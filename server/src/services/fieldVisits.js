import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, staff_id, village_id, visited_at, households_updated, members_added, notes, created_at, updated_at, villages(name, districts(name))';

export async function listFieldVisits({ villageId, staffId, limit = 50, offset = 0 }) {
  let q = supabaseAdmin
    .from('field_visits')
    .select(COLS, { count: 'exact' })
    .order('visited_at', { ascending: false });

  if (villageId) q = q.eq('village_id', villageId);
  if (staffId)   q = q.eq('staff_id', staffId);

  const { data, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function createFieldVisit(payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('field_visits')
    .insert({ ...payload, staff_id: actorId })
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'field_visits', recordId: data.id, newData: data });
  return data;
}

export async function getFieldVisit(id) {
  const { data, error } = await supabaseAdmin
    .from('field_visits')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Field visit not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function updateFieldVisit(id, payload, actorId) {
  const existing = await getFieldVisit(id);
  if (existing.staff_id !== actorId) throw new AppError('FORBIDDEN', 'Not your field visit', 403);
  const { data, error } = await supabaseAdmin
    .from('field_visits')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'field_visits', recordId: id, oldData: existing, newData: data });
  return data;
}

// Villages not visited in the past N days — for admin coverage report
export async function getUnvisitedVillages(days = 30) {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('villages')
    .select('id, name, district_id, districts(name)')
    .not('id', 'in',
      supabaseAdmin
        .from('field_visits')
        .select('village_id')
        .gte('visited_at', cutoff)
    );
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}
