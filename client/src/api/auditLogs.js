import { apiFetch } from './client.js';

const qs = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))).toString();

export const auditLogsApi = {
  list: (params) => apiFetch(`/audit-logs?${qs(params)}`),
};
