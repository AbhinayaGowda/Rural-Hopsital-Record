import { apiFetch } from './client.js';

export const locationsApi = {
  states: () =>
    apiFetch('/locations/states'),

  districts: (stateId) =>
    apiFetch(`/locations/districts${stateId ? `?state_id=${stateId}` : ''}`),

  cities: (districtId) =>
    apiFetch(`/locations/cities${districtId ? `?district_id=${districtId}` : ''}`),

  villages: ({ districtId, q, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (districtId) params.set('district_id', districtId);
    if (q)          params.set('q', q);
    if (limit)      params.set('limit', limit);
    return apiFetch(`/locations/villages?${params}`);
  },

  medicalConditions: ({ q, category, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (q)        params.set('q', q);
    if (category) params.set('category', category);
    if (limit)    params.set('limit', limit);
    return apiFetch(`/locations/medical-conditions?${params}`);
  },
};
