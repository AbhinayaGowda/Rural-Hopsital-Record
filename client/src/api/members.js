import { apiFetch } from './client.js';

export const membersApi = {
  get:       (id, token)           => apiFetch(`/members/${id}`, { token }),
  update:    (id, data, token)     => apiFetch(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(data), token }),
  markDeceased: (id, data, token)  => apiFetch(`/members/${id}/deceased`, { method: 'POST', body: JSON.stringify(data), token }),
};
