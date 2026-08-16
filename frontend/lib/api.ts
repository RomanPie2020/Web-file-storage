import { supabase } from './supabase-browser';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
