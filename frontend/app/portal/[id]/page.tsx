'use client';

import { useState, useEffect, use } from 'react';
import { PublicPortalResponse, ContentPost } from '@/lib/types';
import { contentPostsApi } from '@/lib/api';

export default function PublicClientPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;

  const [data, setData] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingPostId, setReviewingPostId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadPortal();
  }, [leadId]);

  const loadPortal = async () => {
    try {
      setLoading(true);
      const res = await contentPostsApi.getPublicPortal(leadId);
      setData(res.data);
    } catch (err) {
      console.error('Error loading portal', err);
      setError('This client portal link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApprove = async (post: ContentPost) => {
    try {
      setSubmitting(true);
      await contentPostsApi.submitPortalReview(leadId, post.id, 'approve');
      showToast('✓ Post Approved! Our team will schedule it for publication.');
      loadPortal();
    } catch (err) {
      console.error('Error approving post', err);
      showToast('Failed to approve post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = async (post: ContentPost) => {
    if (!feedbackText.trim()) return;
    try {
      setSubmitting(true);
      await contentPostsApi.submitPortalReview(leadId, post.id, 'comment', feedbackText.trim());
      showToast('Feedback submitted to your Growpido content team!');
      setReviewingPostId(null);
      setFeedbackText('');
      loadPortal();
    } catch (err) {
      console.error('Error submitting feedback', err);
      showToast('Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Loading Client Content Portal...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '440px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Portal Unavailable</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{error || 'Unable to load client portal.'}</p>
        </div>
      </div>
    );
  }

  const posts = data.posts || [];

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0B132B',
            color: '#FFFFFF',
            padding: '12px 22px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '13.5px',
            fontWeight: 700,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <header
        style={{
          background: 'linear-gradient(135deg, #071952 0%, #0B2B7A 50%, #0E56C4 100%)',
          color: '#FFFFFF',
          padding: '36px 24px',
          borderBottom: '4px solid #00D2FF',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#00D2FF', marginBottom: '6px' }}>
              Growpido Executive Delivery Portal
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
              {data.client_name}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'rgba(255,255,255,0.85)' }}>
              Welcome {data.poc_name}. Review upcoming LinkedIn drafts, approve posts, or leave notes for your ghostwriting team.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 20px', borderRadius: '10px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
              Active Deliverables
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {posts.length} Posts in Pipeline
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {posts.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✍️</div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>No Posts Under Review Yet</h3>
            <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '13px' }}>
              Your dedicated Growpido content strategist is currently drafting your upcoming posts. Check back shortly!
            </p>
          </div>
        ) : (
          posts.map((post, idx) => {
            const isApproved = post.status === 'Approved' || post.status === 'Scheduled' || post.status === 'Published';
            return (
              <article
                key={post.id}
                style={{
                  background: '#FFFFFF',
                  border: isApproved ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Post Top Meta */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: isApproved ? '#ECFDF5' : '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B' }}>
                      POST #{idx + 1}
                    </span>
                    <span
                      style={{
                        background: '#EFF6FF',
                        color: '#0E56C4',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                      }}
                    >
                      {post.pillar}
                    </span>
                    {post.scheduled_date && (
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                        📅 Scheduled: {new Date(post.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div>
                    {isApproved ? (
                      <span
                        style={{
                          background: '#10B981',
                          color: '#FFFFFF',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        ✓ Approved
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#FEF3C7',
                          color: '#D97706',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                        }}
                      >
                        ⏳ Awaiting Your Approval
                      </span>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    {post.title}
                  </h3>

                  {post.hook && (
                    <div
                      style={{
                        background: '#F1F5F9',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        color: '#0F172A',
                        marginBottom: '16px',
                        borderLeft: '4px solid #0E56C4',
                      }}
                    >
                      {post.hook}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.7,
                      color: '#334155',
                      whiteSpace: 'pre-line',
                      background: '#FAFAFA',
                      border: '1px solid #F1F5F9',
                      padding: '16px',
                      borderRadius: '8px',
                    }}
                  >
                    {post.content || <span style={{ color: '#94A3B8' }}>Drafting in progress...</span>}
                  </div>

                  {post.media_url && (
                    <div style={{ marginTop: '14px', fontSize: '12.5px', color: '#0E56C4' }}>
                      🔗 Supporting Asset: <a href={post.media_url} target="_blank" rel="noopener noreferrer">{post.media_url}</a>
                    </div>
                  )}

                  {post.client_feedback && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
                      <strong>Your Notes:</strong> {post.client_feedback}
                    </div>
                  )}
                </div>

                {/* Post Actions Footer */}
                <div
                  style={{
                    padding: '14px 24px',
                    background: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setReviewingPostId(reviewingPostId === post.id ? null : post.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #CBD5E1',
                      color: '#475569',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    💬 Request Changes / Add Note
                  </button>

                  {!isApproved && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleApprove(post)}
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '9px 20px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      ✓ Approve Post
                    </button>
                  )}
                </div>

                {/* Feedback Drawer */}
                {reviewingPostId === post.id && (
                  <div style={{ padding: '16px 24px', background: '#F1F5F9', borderTop: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                      What would you like changed in this post?
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="e.g. Tone down paragraph 2, add a mention of our Series A milestone..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setReviewingPostId(null)}
                        style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSubmitFeedback(post)}
                        style={{ background: '#0E56C4', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Submit Changes
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px 20px', color: '#94A3B8', fontSize: '12px', borderTop: '1px solid #E2E8F0', marginTop: '40px' }}>
        Powered by <strong>Growpido Technologies</strong> · AI Automation & Executive Personal Branding
      </footer>
    </div>
  );
}
