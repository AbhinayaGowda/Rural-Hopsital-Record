import { apiFetch } from './client.js';

export const referralsApi = {
  list:          (memberId, params = {})     => apiFetch(`/members/${memberId}/referrals`, { params }),
  create:        (memberId, body)            => apiFetch(`/members/${memberId}/referrals`, { method: 'POST', body }),
  recordOutcome: (memberId, referralId, body) =>
    apiFetch(`/members/${memberId}/referrals/${referralId}/outcome`, { method: 'PATCH', body }),
};
