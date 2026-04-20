import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const vaccinationsApi = {
  list:            (memberId, params, token) => apiFetch(`/members/${memberId}/vaccinations?${qs(params)}`, { token }),
  administer:      (vacId, data, token)      => apiFetch(`/vaccinations/${vacId}/administer`, { method: 'PATCH', body: JSON.stringify(data), token }),
  batchAdminister: (memberId, data, token)   => apiFetch(`/members/${memberId}/vaccinations/batch-administer`, { method: 'POST', body: JSON.stringify(data), token }),
};
