'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase-browser';
import { apiRequest } from '../../lib/api';

interface AuthMeResponse { id: string; email?: string; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthMeResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) { router.replace('/'); return; }
      try { setUser(await apiRequest<AuthMeResponse>('/auth/me')); }
      catch {
        await supabase.auth.signOut();
        setError('Unable to verify your session. Please sign in again.');
      }
    });
    return () => { active = false; };
  }, [router]);

  if (error) return <main><p role="alert">{error}</p><button onClick={() => router.replace('/')}>Back to sign in</button></main>;
  if (!user) return <main><p>Loading your session…</p></main>;
  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  return <main><h1>Data Room</h1><p>Signed in as {user.email ?? user.id}</p><button onClick={signOut}>Sign out</button></main>;
}
