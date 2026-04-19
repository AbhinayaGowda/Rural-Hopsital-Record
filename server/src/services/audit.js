import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { logger } from '../lib/logger.js';

function maskPII(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  if ('aadhaar' in out) out.aadhaar = out.aadhaar ? '****' : null;
  if ('contact_number' in out) out.contact_number = out.contact_number ? '****' : null;
  if ('phone' in out) out.phone = out.phone ? '****' : null;
  return out;
}

export async function logAudit({ actorId, action, tableName, recordId, oldData = null, newData = null }) {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    actor_id: actorId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: maskPII(oldData),
    new_data: maskPII(newData),
  });
  if (error) logger.error('audit log write failed:', error.message);
}
