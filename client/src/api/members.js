import { apiFetch } from './client.js';

export const membersApi = {
  get:          (id)       => apiFetch(`/members/${id}`),
  update:       (id, data) => apiFetch(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  markDeceased: (id, data) => apiFetch(`/members/${id}/deceased`, { method: 'POST', body: JSON.stringify(data) }),
  healthCard:   (id)       => `${import.meta.env.VITE_API_BASE_URL}/members/${id}/health-card`,
};
