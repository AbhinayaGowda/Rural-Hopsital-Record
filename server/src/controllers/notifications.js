import { validate } from '../lib/validate.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/notifications.js';

export async function list(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listNotifications(req.profile.id, { limit, offset });
  res.json({ data: result, error: null });
}

export async function markRead(req, res) {
  const notification = await svc.markRead(req.params.id, req.profile.id);
  res.json({ data: notification, error: null });
}
