'use client';

import { useState, useEffect } from 'react';
import { contentApi, personaApi } from '@/lib/api';

const SAMPLE_POST = `Mahindra Bank is worth about 3.8 lakh Cr and Axis Bank about 3.9 lakh Cr.

It started in 1987 as Bajaj Auto Finance, a small arm built to put scooters on EMI for middle class families.

Today the NBFC that cannot even open a savings account for you is worth more than either of the two banks that can.

The EMI built an empire. Here are 3 growth lessons every entrepreneur needs to hear...`;

export default function ContentStrategistPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    verdict: string;
    suggestions: string[];
    hooks?: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);
  const [appliedHookIndex, setAppliedHookIndex] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'hooks'>('analysis');
  const [personaContext, setPersonaContext] = useState('');
  const [inputTab, setInputTab] = useState<'draft' | 'persona'>('draft');
  const [personas, setPersonas] = useState<any[]>([]);
  const [personaName, setPersonaName] = useState('');

  useEffect(() => {
    personaApi.getPersonas()
      .then(res => setPersonas(res.data))
      .catch(console.error);
  }, []);

  const handleSavePersona = async () => {
    if (!personaName.trim() || !personaContext.trim()) {
      showToast('Name and context required to save!');
      return;
    }
    try {
      const res = await personaApi.createPersona({ name: personaName, context: personaContext });
      setPersonas([...personas, res.data]);
      showToast('Persona saved successfully!');
      setPersonaName('');
    } catch (err) {
      showToast('Failed to save persona.');
    }
  };

  const handleSelectPersona = (p: any) => {
    setPersonaContext(p.context);
    showToast(`Selected persona: ${p.name}`);
  };

  // Real-time calculations
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTimeSec = Math.max(1, Math.ceil(wordCount / 3.3));
  const hasLineBreaks = content.includes('\n');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await contentApi.analyze(content, personaContext);
      setResult(response.data);
      setActiveTab('analysis');
    } catch (err) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setError(errorObj.response?.data?.detail || 'An error occurred while analyzing the content.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHook = (hookText: string, index: number) => {
    navigator.clipboard.writeText(hookText);
    setCopiedHookIndex(index);
    showToast('Hook copied to clipboard!');
    setTimeout(() => setCopiedHookIndex(null), 2000);
  };

  const handleApplyHook = (hookText: string, index: number) => {
    const lines = content.split('\n');
    let updatedText = '';

    if (lines.length > 1) {
      // Replace top line with new hook
      lines[0] = hookText;
      updatedText = lines.join('\n');
    } else {
      updatedText = `${hookText}\n\n${content}`;
    }

    setContent(updatedText);
    setAppliedHookIndex(index);
    showToast('Applied hook to your draft!');
    setTimeout(() => setAppliedHookIndex(null), 2000);
  };

  const handleLoadSample = () => {
    setContent(SAMPLE_POST);
    showToast('Sample draft loaded!');
  };

  const handleClear = () => {
    setContent('');
    setPersonaContext('');
    setResult(null);
    setError('');
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1080px', margin: '0 auto', width: '100%', position: 'relative' }}>
      {/* Notification Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--text-primary)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(16,185,129,0.4)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              AI Content Strategist
            </h1>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
            Optimize your LinkedIn post hooks, structure, and readability powered by OpenRouter AI.
          </p>
        </div>

        {/* Quick Sample Action */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleLoadSample}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              color: 'var(--color-success)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span>⚡ Load Sample Post</span>
          </button>
          {content && (
            <button
              onClick={handleClear}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--surface-hover)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Left Side: Interactive Editor Area */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => setInputTab('draft')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: inputTab === 'draft' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: inputTab === 'draft' ? '2px solid #10B981' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Draft Post
              </button>
              <button
                onClick={() => setInputTab('persona')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: inputTab === 'persona' ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: inputTab === 'persona' ? '2px solid #10B981' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Persona / Skill
              </button>
            </div>

            {/* Live Stats Pills */}
            {inputTab === 'draft' && (
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--surface-hover)' }}>
                  📝 {wordCount} words
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--surface-hover)' }}>
                  🔤 {charCount} chars
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--surface-hover)' }}>
                  ⏱️ {readTimeSec}s read
                </span>
              </div>
            )}
          </div>

          {inputTab === 'draft' ? (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write or paste your LinkedIn post here... (Click 'Load Sample Post' to test instantly)"
                style={{
                  width: '100%',
                  minHeight: '260px',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  lineHeight: 1.65,
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10B981';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.background = 'var(--surface)';
                }}
              />

              {/* Real-time Content Health Bar */}
              {content.trim().length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  fontSize: '13px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)'
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Format Check:</span>
                  <span style={{ color: wordCount >= 30 ? '#10B981' : '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {wordCount >= 30 ? '✓ Good length' : '⚠️ Short post'}
                  </span>
                  <span style={{ color: hasLineBreaks ? '#10B981' : '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasLineBreaks ? '✓ Clear line breaks' : '⚠️ Add line breaks'}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Saved Personas List */}
              {personas.length > 0 && (
                <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Saved Personas:</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {personas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPersona(p)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'white',
                          border: '1px solid var(--border)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Persona Context Input */}
              <textarea
                value={personaContext}
                onChange={(e) => setPersonaContext(e.target.value)}
                placeholder="Describe the author's persona, formatting rules, or specific tone here... (e.g. 'Write like an experienced B2B SaaS founder, use short sentences, avoid emojis, be slightly controversial')"
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  lineHeight: 1.65,
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10B981';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.background = 'var(--surface)';
                }}
              />

              {/* Save Controls */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Persona Name (e.g. Alex Hormozi Style)"
                  value={personaName}
                  onChange={e => setPersonaName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSavePersona}
                  disabled={!personaName.trim() || !personaContext.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: (!personaName.trim() || !personaContext.trim()) ? 'var(--border)' : '#10B981',
                    color: (!personaName.trim() || !personaContext.trim()) ? 'var(--text-muted)' : 'white',
                    border: 'none',
                    fontWeight: 600,
                    cursor: (!personaName.trim() || !personaContext.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save Persona
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', borderRadius: '10px', fontSize: '14px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              background: loading || !content.trim() ? 'var(--border)' : 'linear-gradient(135deg, #10B981, #059669)',
              color: loading || !content.trim() ? 'var(--text-muted)' : 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: loading || !content.trim() ? 'none' : '0 6px 20px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
                Evaluating with OpenRouter AI...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                Analyze Content & Generate Hooks
              </>
            )}
          </button>
        </div>

        {/* Right Side: Interactive AI Feedback Dashboard */}
        <div style={{ position: 'sticky', top: '32px' }}>
          {!result && !loading ? (
            <div style={{
              padding: '60px 28px',
              textAlign: 'center',
              background: 'white',
              borderRadius: '20px',
              border: '2px dashed var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>AI Analysis Ready</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Paste a post on the left or click <strong>&quot;Load Sample Post&quot;</strong> to generate your score, recommendations, and hook variations.
              </p>
            </div>
          ) : result ? (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              {/* Score Circular Display Header */}
              <div style={{
                padding: '28px 24px 20px 24px',
                textAlign: 'center',
                background: 'linear-gradient(to bottom, var(--surface), white)',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{
                  position: 'relative',
                  width: '110px',
                  height: '110px',
                  margin: '0 auto 14px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
                }}>
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke={result.score >= 70 ? '#10B981' : result.score >= 50 ? '#F59E0B' : '#EF4444'}
                      strokeWidth="8"
                      strokeDasharray="276"
                      strokeDashoffset={276 - (276 * result.score) / 100}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{result.score}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                  </div>
                </div>

                <div style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: result.score >= 70 ? 'rgba(16, 185, 129, 0.1)' : result.score >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: result.score >= 70 ? 'var(--color-success)' : result.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                }}>
                  {result.verdict}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <button
                  onClick={() => setActiveTab('analysis')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'analysis' ? 'white' : 'transparent',
                    borderBottom: activeTab === 'analysis' ? '2px solid #10B981' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: activeTab === 'analysis' ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  💡 Actionable Tips ({result.suggestions.length})
                </button>
                <button
                  onClick={() => setActiveTab('hooks')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    background: activeTab === 'hooks' ? 'white' : 'transparent',
                    borderBottom: activeTab === 'hooks' ? '2px solid #F59E0B' : 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: activeTab === 'hooks' ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  ⚡ Hook Ideas ({result.hooks?.length || 0})
                </button>
              </div>

              {/* Tab 1: Suggestions */}
              {activeTab === 'analysis' && (
                <div style={{ padding: '20px' }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index} style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        background: 'var(--surface)',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#10B981',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ paddingTop: '1px' }}>{suggestion}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tab 2: Interactive Hooks */}
              {activeTab === 'hooks' && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {result.hooks && result.hooks.length > 0 ? (
                    result.hooks.map((hook, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'var(--surface)',
                          padding: '14px',
                          borderRadius: '14px',
                          border: '1px solid var(--border)',
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ fontStyle: 'italic', fontWeight: 600, color: 'var(--text-primary)' }}>
                          &quot;{hook}&quot;
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleApplyHook(hook, index)}
                            style={{
                              background: appliedHookIndex === index ? 'rgba(16, 185, 129, 0.15)' : 'linear-gradient(135deg, #10B981, #059669)',
                              color: appliedHookIndex === index ? '#059669' : 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                          >
                            {appliedHookIndex === index ? '✓ Applied!' : '⚡ Apply to Post'}
                          </button>

                          <button
                            onClick={() => handleCopyHook(hook, index)}
                            style={{
                              background: copiedHookIndex === index ? 'rgba(59, 130, 246, 0.15)' : 'white',
                              color: copiedHookIndex === index ? '#2563EB' : 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {copiedHookIndex === index ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      No hooks generated yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'white',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
              <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px auto', borderColor: '#10B981', borderTopColor: 'transparent' }} />
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                OpenRouter AI is analyzing your hook & structure...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
