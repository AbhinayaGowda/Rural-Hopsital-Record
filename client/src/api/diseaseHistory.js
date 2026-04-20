import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const diseaseHistoryApi = {
  list:   (memberId, params) => apiFetch(`/members/${memberId}/disease-history?${qs(params)}`),
  create: (memberId, data)   => apiFetch(`/members/${memberId}/disease-history`, { method: 'POST', body: JSON.stringify(data) }),
  get:    (id)               => apiFetch(`/disease-history/${id}`),
  update: (id, data)         => apiFetch(`/disease-history/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
