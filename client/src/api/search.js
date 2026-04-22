import { apiFetch } from './client.js';

export const searchApi = {
  person: (q, { limit = 20, offset = 0 } = {}) =>
    apiFetch(`/search/person?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
};
