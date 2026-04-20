import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const diseaseHistoryApi = {
  list:   (memberId, params, token) => apiFetch(`/members/${memberId}/disease-history?${qs(params)}`, { token }),
  create: (memberId, data, token)   => apiFetch(`/members/${memberId}/disease-history`, { method: 'POST', body: JSON.stringify(data), token }),
  get:    (id, token)               => apiFetch(`/disease-history/${id}`, { token }),
  update: (id, data, token)         => apiFetch(`/disease-history/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
};
