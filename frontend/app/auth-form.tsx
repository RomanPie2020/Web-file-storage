'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase-browser';
import styles from './auth.module.css';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (isSignUp && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (isSignUp) setMessage('Account created. Check your email if confirmation is enabled.');
    else router.push('/dashboard');
  }
  async function google() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link className={styles.brand} href="/">
          Acme<span>Data Room</span>
        </Link>
        <p className={styles.eyebrow}>{isSignUp ? 'WELCOME IN' : 'WELCOME BACK'}</p>
        <h1>{isSignUp ? 'Create your account' : 'Sign in to your room'}</h1>
        <p className={styles.subtitle}>
          {isSignUp ? 'Set up your secure workspace in a minute.' : 'Pick up where you left off.'}
        </p>
        <form onSubmit={submit} className={styles.form}>
          <label className={styles.label}>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {isSignUp && (
            <label className={styles.label}>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </label>
          )}
          <button
            className={`${styles.button} ${styles.primary} ${styles.large}`}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <div className={styles.divider}>
          <span>or</span>
        </div>
        <button
          className={`${styles.button} ${styles.google}`}
          type="button"
          onClick={google}
          disabled={loading}
        >
          Continue with Google
        </button>
        {message && (
          <p className={styles.message} role="status">
            {message}
          </p>
        )}
        <p className={styles.switch}>
          {isSignUp ? 'Already have an account?' : 'New to Acme Data Room?'}{' '}
          <Link href={isSignUp ? '/signin' : '/signup'}>
            {isSignUp ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  );
}
