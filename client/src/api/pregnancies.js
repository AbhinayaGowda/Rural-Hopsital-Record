import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const pregnanciesApi = {
  list:      (memberId, params)   => apiFetch(`/members/${memberId}/pregnancies?${qs(params)}`),
  create:    (memberId, data)     => apiFetch(`/members/${memberId}/pregnancies`, { method: 'POST', body: JSON.stringify(data) }),
  get:       (id)                 => apiFetch(`/pregnancies/${id}`),
  update:    (id, data)           => apiFetch(`/pregnancies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listCheckups: (pregId, params)  => apiFetch(`/pregnancies/${pregId}/checkups?${qs(params)}`),
  addCheckup:   (pregId, data)    => apiFetch(`/pregnancies/${pregId}/checkups`, { method: 'POST', body: JSON.stringify(data) }),
  deliver:      (pregId, data)    => apiFetch(`/pregnancies/${pregId}/deliver`, { method: 'POST', body: JSON.stringify(data) }),
};
