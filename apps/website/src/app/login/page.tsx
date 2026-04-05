'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) router.replace('/dashboard');
        }
      } catch {
        // Not authenticated — stay on login
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      if (res.status === 429) {
        setError('Too many attempts. Wait a minute.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.authenticated) {
        router.replace('/dashboard');
      } else {
        setError('Invalid email or password');
        setPassword('');
      }
    } catch (err) {
      console.error('[login] Error:', err instanceof Error ? err.message : 'unknown');
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.logoMark}>N</div>
        </div>
        <h1 className={styles.title}>Nexus CRM</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            placeholder="you@dealership.ca"
            autoFocus
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
