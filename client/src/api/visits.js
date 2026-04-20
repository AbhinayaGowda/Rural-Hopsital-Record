import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const visitsApi = {
  list:   (memberId, params) => apiFetch(`/members/${memberId}/visits?${qs(params)}`),
  create: (memberId, data)   => apiFetch(`/members/${memberId}/visits`, { method: 'POST', body: JSON.stringify(data) }),
  get:    (id)               => apiFetch(`/visits/${id}`),
};
