import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const householdsApi = {
  list:       (params, token)       => apiFetch(`/households?${qs(params)}`, { token }),
  get:        (id, token)           => apiFetch(`/households/${id}`, { token }),
  create:     (data, token)         => apiFetch('/households', { method: 'POST', body: JSON.stringify(data), token }),
  update:     (id, data, token)     => apiFetch(`/households/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  changeHead: (id, data, token)     => apiFetch(`/households/${id}/change-head`, { method: 'POST', body: JSON.stringify(data), token }),
  migrate:    (id, data, token)     => apiFetch(`/households/${id}/migrate`, { method: 'POST', body: JSON.stringify(data), token }),
  listMembers:(id, params, token)   => apiFetch(`/households/${id}/members?${qs(params)}`, { token }),
  addMember:  (id, data, token)     => apiFetch(`/households/${id}/members`, { method: 'POST', body: JSON.stringify(data), token }),
};
