'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase-browser';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error?.message ?? 'Signed in successfully.');
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(
      error?.message ?? 'Sign-up successful. Check your email if confirmation is enabled.',
    );
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('Signed out.');
  }

  async function signInWithGoogle() {
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setMessage(error.message);
    }
  }

  if (userEmail) {
    return (
      <section>
        <p>Signed in as {userEmail}</p>
        <button onClick={signOut}>Sign out</button>
      </section>
    );
  }

  return (
    <section>
      <h2>Sign in</h2>
      <form onSubmit={signIn}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Working…' : 'Sign in'}
        </button>
      </form>
      <button type="button" onClick={signUp} disabled={loading}>
        Create account
      </button>
      <button type="button" onClick={signInWithGoogle} disabled={loading}>
        Continue with Google
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
