import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

const COLS = `id, recipient_user_id, type, related_entity_type, related_entity_id,
  message, scheduled_for, sent_at, read_at, created_at,
  channel, delivery_status, external_id, phone_number`;

export async function listNotifications(userId, { limit, offset }) {
  const { data, count, error } = await supabaseAdmin
    .from('notifications')
    .select(COLS, { count: 'exact' })
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function markRead(id, userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_user_id', userId)
    .select(COLS)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Notification not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

/**
 * Schedule a notification for delivery.
 * Called from other services when business events occur.
 */
export async function scheduleNotification({
  recipientUserId,
  type,
  message,
  scheduledFor,
  relatedEntityType = null,
  relatedEntityId   = null,
  channel           = 'in_app',
  phoneNumber       = null,
}) {
  const { error } = await supabaseAdmin.from('notifications').insert({
    recipient_user_id:  recipientUserId,
    type,
    message,
    scheduled_for:      scheduledFor,
    related_entity_type: relatedEntityType,
    related_entity_id:   relatedEntityId,
    channel,
    phone_number:        phoneNumber,
    delivery_status:     'pending',
  });
  if (error) throw new AppError('INTERNAL', error.message, 500);
}
