'use client';

import { useEffect, useState } from 'react';
import styles from './landing.module.css';

export function AuthErrorNotice() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorCode = hashParams.get('error_code') ?? queryParams.get('error_code');

    if (errorCode === 'otp_expired') {
      setMessage('This confirmation link has expired. Please request a new email.');
    } else if (
      hashParams.get('error') === 'access_denied' ||
      queryParams.get('error') === 'access_denied'
    ) {
      setMessage('We could not confirm your email. Please request a new confirmation email.');
    }

    if (errorCode || hashParams.has('error') || queryParams.has('error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!message) {
    return null;
  }

  return (
    <p className={styles.authError} role="alert">
      <span aria-hidden="true">!</span>
      {message}
    </p>
  );
}
