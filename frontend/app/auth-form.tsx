'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase-browser';
import styles from './auth.module.css';

const passwordChecks = [
  { label: 'At least 12 characters', test: (value: string) => value.length >= 12 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error' | ''>('');
  const [loading, setLoading] = useState(false);
  const passwordIsValid = passwordChecks.every(({ test }) => test(password));
  const emailIsInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsDoNotMatch =
    isSignUp && confirmPassword.length > 0 && password !== confirmPassword;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageKind('');
    if (isSignUp && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageKind('error');
      return;
    }
    setLoading(true);
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      setMessageKind('error');
      return;
    }
    if (isSignUp) {
      setMessage('Account created! Check your inbox to confirm your email address.');
      setMessageKind('success');
    }
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
      setMessageKind('error');
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
              aria-invalid={emailIsInvalid}
              className={emailIsInvalid ? styles.invalidInput : ''}
              required
            />
            {emailIsInvalid && (
              <span className={styles.fieldError}>Enter a valid email address.</span>
            )}
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isSignUp ? 12 : undefined}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {isSignUp && (
            <div className={styles.passwordRequirements} aria-live="polite">
              <p>Password requirements</p>
              <ul>
                {passwordChecks.map(({ label, test }) => {
                  const passed = test(password);
                  return (
                    <li key={label} className={passed ? styles.requirementPassed : ''}>
                      <span aria-hidden="true">{passed ? '✓' : '○'}</span>
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {isSignUp && (
            <label className={styles.label}>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={12}
                autoComplete="new-password"
                aria-invalid={passwordsDoNotMatch}
                className={passwordsDoNotMatch ? styles.invalidInput : ''}
                required
              />
              {passwordsDoNotMatch && (
                <span className={styles.fieldError}>Passwords do not match.</span>
              )}
            </label>
          )}
          <button
            className={`${styles.button} ${styles.primary} ${styles.large}`}
            type="submit"
            disabled={loading || (isSignUp && (!passwordIsValid || password !== confirmPassword))}
          >
            {loading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
          {message && (
            <p
              className={`${styles.message} ${
                messageKind === 'success' ? styles.successMessage : styles.errorMessage
              }`}
              role={messageKind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              <span aria-hidden="true">{messageKind === 'success' ? '✓' : '!'}</span>
              {message}
            </p>
          )}
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
