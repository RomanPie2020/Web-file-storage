import { supabase } from './supabase-browser';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    let message = `API request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (payload.message) message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
    } catch { /* Keep the status fallback for non-JSON responses. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
