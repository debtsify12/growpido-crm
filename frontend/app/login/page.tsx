'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const GrowpidoLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield shape */}
    <path
      d="M50 5C50 5 15 15 15 15C15 15 15 50 15 55C15 75 50 95 50 95C50 95 85 75 85 55C85 50 85 15 85 15C85 15 50 5 50 5Z"
      fill="#4A90D9"
      fillOpacity="0.12"
      stroke="#4A90D9"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Arrow going up-right */}
    <path
      d="M35 65L55 35"
      stroke="#4A90D9"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M55 35L65 25"
      stroke="#4A90D9"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M55 25H67V37"
      stroke="#4A90D9"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Small trail line */}
    <path
      d="M30 70L38 60"
      stroke="#4A90D9"
      strokeWidth="3.5"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { access_token, user } = res.data;
      // Store in localStorage for axios interceptor
      localStorage.setItem('growpido_token', access_token);
      // Set cookie for middleware
      document.cookie = `growpido_token=${access_token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
      setAuth(access_token, user);
      router.push('/pipeline');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <GrowpidoLogo size={56} />
          </div>
          <span className="login-logo-text">Growpido</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your CRM dashboard</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="admin@growpido.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Signing in...
              </>
            ) : (
              'Sign in to CRM'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Default: admin@growpido.com / Growpido@2024
        </p>
      </div>
    </div>
  );
}
