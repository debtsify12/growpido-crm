'use client';

import { useState } from 'react';
import { contentApi } from '@/lib/api';

export default function ContentStrategistPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{score: number, verdict: string, suggestions: string[]} | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await contentApi.analyze(content);
      setResult(response.data);
    } catch (err) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setError(errorObj.response?.data?.detail || 'An error occurred while analyzing the content.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -4px rgba(16,185,129,0.4)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Content Strategist</h1>
      </div>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px', fontWeight: 500 }}>
        Paste your draft LinkedIn post to see how it ranks against top-performing content.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Left Side: Input area */}
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Your Post Draft
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write or paste your LinkedIn post here..."
            style={{ 
              width: '100%', 
              minHeight: '250px', 
              padding: '16px', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              background: 'white',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
              marginBottom: '20px'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--brand-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />

          {error && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '14px', marginBottom: '20px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            style={{ 
              width: '100%',
              padding: '14px', 
              borderRadius: '12px', 
              background: loading || !content.trim() ? 'var(--border)' : 'var(--brand-primary)', 
              color: loading || !content.trim() ? 'var(--text-muted)' : 'white', 
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: loading || !content.trim() ? 'none' : '0 4px 12px rgba(74, 144, 217, 0.3)',
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px', borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
                Analyzing against top posts...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                Analyze Content
              </>
            )}
          </button>
        </div>

        {/* Right Side: Results area */}
        <div style={{ position: 'sticky', top: '32px' }}>
          {!result && !loading ? (
            <div style={{ padding: '60px 30px', textAlign: 'center', background: 'var(--surface-hover)', borderRadius: '16px', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-primary)' }}>No Analysis Yet</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Enter your post on the left and click Analyze to get AI-powered feedback.</p>
            </div>
          ) : result ? (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {/* Score Header */}
              <div style={{ padding: '32px', textAlign: 'center', background: 'linear-gradient(to bottom, var(--surface), white)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={result.score >= 70 ? 'var(--color-success)' : result.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'} strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * result.score) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{result.score}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                  </div>
                </div>
                
                <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700, 
                  background: result.score >= 70 ? 'rgba(16, 185, 129, 0.1)' : result.score >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: result.score >= 70 ? 'var(--color-success)' : result.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                }}>
                  {result.verdict}
                </div>
              </div>

              {/* Suggestions */}
              <div style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Actionable Tips
                </h4>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--surface-hover)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 700 }}>
                        {index + 1}
                      </div>
                      <div style={{ paddingTop: '2px' }}>{suggestion}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
             <div style={{ padding: '60px 30px', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px auto', borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>Analyzing post against top-performing examples...</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
