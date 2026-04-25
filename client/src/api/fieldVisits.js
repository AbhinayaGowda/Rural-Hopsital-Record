import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const fieldVisitsApi = {
  list:            (params = {})    => apiFetch(`/field-visits?${qs(params)}`),
  create:          (body)           => apiFetch('/field-visits', { method: 'POST', body: JSON.stringify(body) }),
  update:          (id, body)       => apiFetch(`/field-visits/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  unvisited:       (days = 30)      => apiFetch(`/field-visits/unvisited?days=${days}`),
};
