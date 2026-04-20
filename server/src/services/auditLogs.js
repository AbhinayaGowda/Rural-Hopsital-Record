import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

const COLS = 'id, actor_id, action, table_name, record_id, old_data, new_data, created_at';

export async function listAuditLogs({ tableName, recordId, actorId, limit, offset }) {
  let q = supabaseAdmin
    .from('audit_logs')
    .select(COLS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (tableName) q = q.eq('table_name', tableName);
  if (recordId) q = q.eq('record_id', recordId);
  if (actorId) q = q.eq('actor_id', actorId);

  const { data, count, error } = await q.range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}
