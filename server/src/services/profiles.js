import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, full_name, role, phone, is_active, created_at, updated_at';

export async function getProfile(id) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Profile not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function updateProfile(id, payload, actorId) {
  const existing = await getProfile(id);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'profiles', recordId: id, oldData: existing, newData: data });
  return data;
}

export async function listProfiles({ limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('profiles')
    .select(COLS, { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}
