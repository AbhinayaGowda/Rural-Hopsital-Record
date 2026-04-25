import { apiFetch } from './client.js';

export const adminApi = {
  // Users
  listUsers: ({ role, status, q, limit = 50, offset = 0 } = {}) => {
    const p = new URLSearchParams();
    if (role)   p.set('role',   role);
    if (status) p.set('status', status);
    if (q)      p.set('q',      q);
    p.set('limit',  limit);
    p.set('offset', offset);
    return apiFetch(`/admin/users?${p}`);
  },

  getUser: (id) => apiFetch(`/admin/users/${id}`),

  createUser: (payload) =>
    apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),

  updateUser: (id, payload) =>
    apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  resetPassword: (id, password) =>
    apiFetch(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),

  // Assignments
  getAssignments: (id) => apiFetch(`/admin/users/${id}/assignments`),

  addDistrict: (id, district_id) =>
    apiFetch(`/admin/users/${id}/assignments/districts`, { method: 'POST', body: JSON.stringify({ district_id }) }),

  removeDistrict: (id, districtId) =>
    apiFetch(`/admin/users/${id}/assignments/districts/${districtId}`, { method: 'DELETE' }),

  addVillage: (id, village_id) =>
    apiFetch(`/admin/users/${id}/assignments/villages`, { method: 'POST', body: JSON.stringify({ village_id }) }),

  removeVillage: (id, villageId) =>
    apiFetch(`/admin/users/${id}/assignments/villages/${villageId}`, { method: 'DELETE' }),

  // Outbreak detection
  detectOutbreaks: (days = 7) => apiFetch(`/admin/outbreaks?days=${days}`),

  // CSV import
  importHouseholds: (formData) =>
    apiFetch('/admin/import/households', { method: 'POST', rawBody: formData }),
};
