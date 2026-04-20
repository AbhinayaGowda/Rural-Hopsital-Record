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
  const { headers: customHeaders, ...fetchOptions } = options;

  // Always grab the freshest token from Supabase at call-time
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });
  const body = await res.json();

  if (!res.ok) {
    const err = new Error(body?.error?.message ?? 'Request failed');
    err.code = body?.error?.code;
    err.status = res.status;
    throw err;
  }

  return body.data;
}
