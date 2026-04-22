import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const COLS = 'id, member_id, referred_by, referred_to, reason, urgency, referred_at, outcome, outcome_recorded_at, created_at, updated_at';

export async function listReferrals(memberId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('referrals')
    .select(COLS, { count: 'exact' })
    .eq('member_id', memberId)
    .order('referred_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getReferral(id) {
  const { data, error } = await supabaseAdmin
    .from('referrals')
    .select(COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Referral not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function createReferral(memberId, payload, actorId) {
  const { data, error } = await supabaseAdmin
    .from('referrals')
    .insert({ ...payload, member_id: memberId, referred_by: actorId })
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'insert', tableName: 'referrals', recordId: data.id, newData: data });
  return data;
}

export async function recordOutcome(id, outcome, actorId) {
  const existing = await getReferral(id);
  const { data, error } = await supabaseAdmin
    .from('referrals')
    .update({ outcome, outcome_recorded_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'referrals', recordId: id, oldData: existing, newData: data });
  return data;
}
