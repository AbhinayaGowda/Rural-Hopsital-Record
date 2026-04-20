import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const visitsApi = {
  list:   (memberId, params, token) => apiFetch(`/members/${memberId}/visits?${qs(params)}`, { token }),
  create: (memberId, data, token)   => apiFetch(`/members/${memberId}/visits`, { method: 'POST', body: JSON.stringify(data), token }),
  get:    (id, token)               => apiFetch(`/visits/${id}`, { token }),
};
