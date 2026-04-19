const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path, options = {}) {
  const { token, ...fetchOptions } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
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
