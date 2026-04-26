import { apiFetch } from './client.js';

export const attachmentsApi = {
  list: (memberId) =>
    apiFetch(`/members/${memberId}/attachments`),

  upload: (memberId, file) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch(`/members/${memberId}/attachments`, { method: 'POST', rawBody: form });
  },

  delete: (memberId, attachmentId) =>
    apiFetch(`/members/${memberId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
