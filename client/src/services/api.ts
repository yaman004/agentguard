const API_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string, public details?: unknown) {
    super(message);
  }
}

interface RequestOpts { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> }

function buildUrl(path: string, query?: RequestOpts['query']) {
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, String(v)); });
  return url.toString();
}

/** Thin fetch wrapper: cookie auth, JSON in/out, CSRF header on mutations, typed errors. */
async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    credentials: 'include',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'X-AgentGuard-Client': 'web' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) throw new ApiError(data?.error?.message ?? res.statusText, res.status, data?.error?.code ?? 'UNKNOWN', data?.error?.details);
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOpts['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
