import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const pregnanciesApi = {
  list:      (memberId, params, token)   => apiFetch(`/members/${memberId}/pregnancies?${qs(params)}`, { token }),
  create:    (memberId, data, token)     => apiFetch(`/members/${memberId}/pregnancies`, { method: 'POST', body: JSON.stringify(data), token }),
  get:       (id, token)                 => apiFetch(`/pregnancies/${id}`, { token }),
  update:    (id, data, token)           => apiFetch(`/pregnancies/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  listCheckups: (pregId, params, token)  => apiFetch(`/pregnancies/${pregId}/checkups?${qs(params)}`, { token }),
  addCheckup:   (pregId, data, token)    => apiFetch(`/pregnancies/${pregId}/checkups`, { method: 'POST', body: JSON.stringify(data), token }),
  deliver:      (pregId, data, token)    => apiFetch(`/pregnancies/${pregId}/deliver`, { method: 'POST', body: JSON.stringify(data), token }),
};
