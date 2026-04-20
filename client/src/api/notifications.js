import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const notificationsApi = {
  list:   (params) => apiFetch(`/notifications?${qs(params)}`),
  markRead: (id)   => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
};
