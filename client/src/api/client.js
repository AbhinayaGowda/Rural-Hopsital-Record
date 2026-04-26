import { supabase } from '../lib/supabaseClient.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Central fetch wrapper that automatically attaches the Supabase
 * session access_token as a Bearer token on every request.
 *
 * - Fetches the *current* session at call-time so the token is always fresh.
 * - Throws a clear error if the user is not logged in.
 * - All API modules should call this instead of raw fetch().
 */
export async function apiFetch(path, options = {}) {
  const { headers: customHeaders, rawBody, ...fetchOptions } = options;

  // Always grab the freshest token from Supabase at call-time
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Don't set Content-Type for FormData — browser sets it with boundary
  const isFormData = rawBody instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    body: rawBody ?? fetchOptions.body,
    headers,
  });
  const body = await res.json();

  if (!res.ok) {
    const err = new Error(body?.error?.message ?? 'Request failed');
    err.code = body?.error?.code;
    err.status = res.status;
    throw err;
  }

  return body.data;
}

/**
 * Like apiFetch but returns a Blob — used for PDF/binary endpoints (health cards).
 * Triggers a browser download automatically.
 */
export async function apiFetchDownload(path, filename) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message ?? 'Download failed');
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
