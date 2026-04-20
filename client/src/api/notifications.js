import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const notificationsApi = {
  list:   (params, token) => apiFetch(`/notifications?${qs(params)}`, { token }),
  markRead: (id, token)   => apiFetch(`/notifications/${id}/read`, { method: 'PATCH', token }),
};
