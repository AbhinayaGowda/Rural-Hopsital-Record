import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const vaccinationsApi = {
  list:            (memberId, params) => apiFetch(`/members/${memberId}/vaccinations?${qs(params)}`),
  create:          (memberId, data)   => apiFetch(`/members/${memberId}/vaccinations`, { method: 'POST', body: JSON.stringify(data) }),
  administer:      (vacId, data)      => apiFetch(`/vaccinations/${vacId}/administer`, { method: 'PATCH', body: JSON.stringify(data) }),
  batchAdminister: (memberId, data)   => apiFetch(`/members/${memberId}/vaccinations/batch-administer`, { method: 'POST', body: JSON.stringify(data) }),
};
