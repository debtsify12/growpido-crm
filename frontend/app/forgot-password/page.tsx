'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

const GrowpidoLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M50 5C50 5 15 15 15 15C15 15 15 50 15 55C15 75 50 95 50 95C50 95 85 75 85 55C85 50 85 15 85 15C85 15 50 5 50 5Z"
      fill="#4A90D9"
      fillOpacity="0.12"
      stroke="#4A90D9"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M35 65L55 35" stroke="#4A90D9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M55 35L65 25" stroke="#4A90D9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M55 25H67V37" stroke="#4A90D9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 70L38 60" stroke="#4A90D9" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError('Failed to send reset link. Please try again.');
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

        <h1 className="login-title">Reset password</h1>
        
        {success ? (
          <>
            <p className="login-subtitle" style={{ marginBottom: '24px' }}>
              We've sent a password reset link to <br/><strong>{email}</strong>
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link 
                href="/login" 
                className="btn btn-primary btn-lg w-full"
                style={{ display: 'inline-block', textDecoration: 'none' }}
              >
                Return to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="login-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="login-error">{error}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="e.g. name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
                style={{ marginTop: '12px' }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link 
                  href="/login" 
                  style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}
                >
                  &larr; Back to login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
