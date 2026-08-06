'use client';

import { useState, useEffect, useMemo, DragEvent } from 'react';
import { Lead, ContentPost, ContentPillar, ContentStatus } from '@/lib/types';
import { contentPostsApi, contentApi } from '@/lib/api';

const PILLARS: ContentPillar[] = [
  'Thought Leadership',
  'AI Automation',
  'Personal Story',
  'Case Study',
  'Contrarian Take',
  'Actionable Framework',
];

const STATUSES: { key: ContentStatus; label: string; icon: string; color: string; bg: string; border: string }[] = [
  { key: 'Idea', label: 'Idea / Topic', icon: '💡', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'Drafting', label: 'Drafting', icon: '✍️', color: '#0E56C4', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'Review', label: 'Client Review', icon: '👀', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'Approved', label: 'Approved', icon: '✅', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { key: 'Scheduled', label: 'Scheduled', icon: '⏳', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  { key: 'Published', label: 'Published', icon: '🚀', color: '#10B981', bg: '#D1FAE5', border: '#6EE7B7' },
];

interface Props {
  client: Lead;
  onPostUpdated?: () => void;
}

export default function ClientContentCalendar({ client, onPostUpdated }: Props) {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar' | 'list'>('kanban');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Drag & Drop State
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ContentStatus | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formHook, setFormHook] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPillar, setFormPillar] = useState<ContentPillar>('Thought Leadership');
  const [formStatus, setFormStatus] = useState<ContentStatus>('Idea');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [modalTab, setModalTab] = useState<'editor' | 'preview'>('editor');

  // AI Scoring state inside modal
  const [isScoring, setIsScoring] = useState(false);
  const [aiScoreResult, setAiScoreResult] = useState<{ score: number; verdict: string; suggestions: string[] } | null>(null);

  // Toast / Copy state
  const [toastMsg, setToastMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Calendar date navigator
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  useEffect(() => {
    loadPosts();
  }, [client.id]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await contentPostsApi.listByClient(client.id);
      setPosts(res.data.items || []);
    } catch (err) {
      console.error('Error loading content posts', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const openCreateModal = (presetStatus: ContentStatus = 'Idea', presetDate?: string) => {
    setEditingPost(null);
    setFormTitle('');
    setFormHook('');
    setFormContent('');
    setFormPillar('Thought Leadership');
    setFormStatus(presetStatus);
    setFormScheduledDate(presetDate || new Date().toISOString().slice(0, 16));
    setFormMediaUrl('');
    setAiScoreResult(null);
    setModalTab('editor');
    setIsModalOpen(true);
  };

  const openEditModal = (post: ContentPost) => {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormHook(post.hook || '');
    setFormContent(post.content || '');
    setFormPillar(post.pillar);
    setFormStatus(post.status);
    setFormScheduledDate(post.scheduled_date ? post.scheduled_date.slice(0, 16) : '');
    setFormMediaUrl(post.media_url || '');
    setAiScoreResult(null);
    setModalTab('editor');
    setIsModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please provide a post title or topic');
      return;
    }

    try {
      const payload: Partial<ContentPost> = {
        title: formTitle.trim(),
        hook: formHook.trim(),
        content: formContent.trim(),
        pillar: formPillar,
        status: formStatus,
        scheduled_date: formScheduledDate ? new Date(formScheduledDate).toISOString() : undefined,
        media_url: formMediaUrl.trim() || undefined,
        viral_score: aiScoreResult ? aiScoreResult.score : editingPost?.viral_score || 0,
      };

      if (editingPost) {
        await contentPostsApi.update(editingPost.id, payload);
        showToast('Post updated successfully!');
      } else {
        await contentPostsApi.createForClient(client.id, payload);
        showToast('New post created in calendar!');
      }

      setIsModalOpen(false);
      loadPosts();
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Error saving post', err);
      showToast('Failed to save post. Please try again.');
    }
  };

  const handleQuickStatusChange = async (postId: string, newStatus: ContentStatus) => {
    try {
      await contentPostsApi.update(postId, { status: newStatus });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
      );
      showToast(`Moved to ${newStatus}`);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Error changing status', err);
      showToast('Failed to update status');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await contentPostsApi.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast('Post deleted');
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Error deleting post', err);
      showToast('Failed to delete post');
    }
  };

  const handleAnalyzePost = async () => {
    const textToScore = formContent || formHook || formTitle;
    if (!textToScore.trim()) {
      showToast('Draft some content or hooks first to analyze!');
      return;
    }

    try {
      setIsScoring(true);
      const personaTone = client.brand_vault?.tone_of_voice || 'Authoritative, concise, executive leadership';
      const res = await contentApi.analyze(textToScore, personaTone);
      setAiScoreResult(res.data);
      showToast(`AI Viral Score: ${res.data.score}/100 🎯`);
    } catch (err) {
      console.error('Error analyzing content', err);
      showToast('Failed to run AI analysis');
    } finally {
      setIsScoring(false);
    }
  };

  const copyPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal/${client.id}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    showToast('Client Review Portal link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Drag & Drop Handlers for Calendar Date Rescheduling
  const handleDropOnDate = async (postId: string, newDateStr: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const oldScheduledDate = post.scheduled_date;
    const oldStatus = post.status;

    // Keep existing time or default to 10:00
    const timePart =
      post.scheduled_date && post.scheduled_date.length >= 16
        ? post.scheduled_date.slice(11, 16)
        : '10:00';
    const newScheduledIso = `${newDateStr}T${timePart}:00`;
    const newStatus: ContentStatus = post.status === 'Published' ? 'Published' : 'Scheduled';

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, scheduled_date: newScheduledIso, status: newStatus }
          : p
      )
    );

    const formattedDate = new Date(newScheduledIso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    showToast(`📅 Rescheduled "${post.title}" to ${formattedDate}`);

    try {
      await contentPostsApi.update(postId, {
        scheduled_date: newScheduledIso,
        status: newStatus,
      });
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Error rescheduling post', err);
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, scheduled_date: oldScheduledDate, status: oldStatus }
            : p
        )
      );
      showToast('Failed to reschedule post');
    }
  };

  // Drag & Drop Handlers for Kanban Column Status Changes
  const handleDropOnStatus = async (postId: string, newStatus: ContentStatus) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || post.status === newStatus) return;

    const oldStatus = post.status;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    );

    showToast(`✓ Moved "${post.title}" to ${newStatus}`);

    try {
      await contentPostsApi.update(postId, { status: newStatus });
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Error changing post status', err);
      // Revert on error
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: oldStatus } : p))
      );
      showToast('Failed to update status');
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchPillar = selectedPillar === 'all' || p.pillar === selectedPillar;
      const matchSearch =
        search === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content?.toLowerCase().includes(search.toLowerCase()) ||
        p.hook?.toLowerCase().includes(search.toLowerCase());
      return matchPillar && matchSearch;
    });
  }, [posts, selectedPillar, search]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Pad previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      days.push({ day: pDay, dateStr: dStr, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    // Days of this month
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr: dStr, isCurrentMonth: true, isToday: dStr === todayStr });
    }

    // Pad next month days to complete full grid (35 or 42 cells)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextDaysCount = totalCells - days.length;
    for (let n = 1; n <= nextDaysCount; n++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      days.push({ day: n, dateStr: dStr, isCurrentMonth: false, isToday: dStr === todayStr });
    }

    return days;
  }, [currentCalendarDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--brand-primary, #0A2463)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(10, 36, 99, 0.35)',
            zIndex: 9999,
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.2)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <span>✨</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Client Portal Share Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A2463 0%, #17387F 50%, #244494 100%)',
          borderRadius: '14px',
          padding: '22px 28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(10, 36, 99, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backdropFilter: 'blur(8px)',
              }}
            >
              📅
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Content Calendar &amp; LinkedIn Delivery
            </h2>
            <span
              style={{
                background: 'rgba(255,255,255,0.18)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {posts.length} DELIVERABLES
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
            Manage drafts, schedule posts, drag &amp; drop reschedule, and share one-click approval links with{' '}
            <strong style={{ color: '#FFFFFF', textDecoration: 'underline' }}>
              {client.company_name || client.full_name}
            </strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={copyPortalLink}
            style={{
              background: copiedLink ? '#10B981' : 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              padding: '9px 16px',
              borderRadius: '9px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span>{copiedLink ? '✓' : '🔗'}</span>
            <span>{copiedLink ? 'Portal Link Copied!' : 'Share Approval Portal'}</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal('Idea')}
            style={{
              background: '#00D2FF',
              color: '#071952',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0, 210, 255, 0.4)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 210, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 210, 255, 0.4)';
            }}
          >
            <span>+</span>
            <span>New Post / Draft</span>
          </button>
        </div>
      </div>

      {/* Control Bar: View Switcher & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-card, #FFFFFF)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Left: View Mode Toggle */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--bg-surface, #F8FAFC)',
            padding: '4px',
            borderRadius: '9px',
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            style={{
              background: viewMode === 'kanban' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: viewMode === 'kanban' ? 'var(--brand-primary, #0A2463)' : 'var(--text-muted, #64748B)',
              fontWeight: 700,
              border: viewMode === 'kanban' ? '1px solid var(--border)' : '1px solid transparent',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            📋 Kanban Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            style={{
              background: viewMode === 'calendar' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: viewMode === 'calendar' ? 'var(--brand-primary, #0A2463)' : 'var(--text-muted, #64748B)',
              fontWeight: 700,
              border: viewMode === 'calendar' ? '1px solid var(--border)' : '1px solid transparent',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            📅 Monthly Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' ? 'var(--bg-card, #FFFFFF)' : 'transparent',
              color: viewMode === 'list' ? 'var(--brand-primary, #0A2463)' : 'var(--text-muted, #64748B)',
              fontWeight: 700,
              border: viewMode === 'list' ? '1px solid var(--border)' : '1px solid transparent',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
          >
            📑 Table List
          </button>
        </div>

        {/* Right: Search & Pillar Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search topic or copy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{
                height: '36px',
                fontSize: '12.5px',
                paddingLeft: '32px',
                minWidth: '220px',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '13px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
          </div>

          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value)}
            className="form-control"
            style={{
              height: '36px',
              fontSize: '12.5px',
              minWidth: '180px',
            }}
          >
            <option value="all">All Content Pillars</option>
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW 1: KANBAN PIPELINE (DRAGGABLE & DROPPABLE) */}
      {viewMode === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(240px, 1fr))',
            gap: '14px',
            overflowX: 'auto',
            paddingBottom: '16px',
          }}
        >
          {STATUSES.map((st) => {
            const columnPosts = filteredPosts.filter((p) => p.status === st.key);
            const isColumnDragOver = dragOverStatus === st.key;

            return (
              <div
                key={st.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverStatus !== st.key) setDragOverStatus(st.key);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverStatus === st.key) setDragOverStatus(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverStatus(null);
                  const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
                  if (!postId) return;
                  await handleDropOnStatus(postId, st.key);
                }}
                style={{
                  background: isColumnDragOver ? `${st.bg}` : 'var(--bg-card, #FFFFFF)',
                  border: isColumnDragOver ? `2px dashed ${st.color}` : `1px solid ${st.border}`,
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '750px',
                  boxShadow: isColumnDragOver ? `0 8px 24px ${st.color}25` : 'var(--shadow-sm)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: `1px solid ${st.border}`,
                    background: st.bg,
                    borderTopLeftRadius: '11px',
                    borderTopRightRadius: '11px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{st.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <span
                    style={{
                      background: st.color,
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                    }}
                  >
                    {columnPosts.length}
                  </span>
                </div>

                {/* Column Body / Cards */}
                <div
                  style={{
                    padding: '10px',
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {columnPosts.map((post) => {
                    const isDraggingThis = draggedPostId === post.id;

                    return (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', post.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedPostId(post.id);
                        }}
                        onDragEnd={() => {
                          setDraggedPostId(null);
                          setDragOverStatus(null);
                          setDragOverDate(null);
                        }}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid var(--border)',
                          borderLeft: `3px solid ${st.color}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'grab',
                          transition: 'all var(--transition-fast)',
                          opacity: isDraggingThis ? 0.4 : 1,
                          transform: isDraggingThis ? 'scale(0.96)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isDraggingThis) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDraggingThis) {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                          }
                        }}
                        onClick={() => openEditModal(post)}
                      >
                        {/* Pillar Pill & Score */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--bg-surface, #F1F5F9)',
                              color: 'var(--text-secondary, #475569)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {post.pillar}
                          </span>

                          {post.viral_score > 0 && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                color: post.viral_score >= 80 ? '#059669' : '#D97706',
                                background: post.viral_score >= 80 ? '#ECFDF5' : '#FFFBEB',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: `1px solid ${post.viral_score >= 80 ? '#A7F3D0' : '#FDE68A'}`,
                              }}
                            >
                              🎯 {post.viral_score}/100
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            margin: '0 0 6px',
                            color: 'var(--text-primary, #0F172A)',
                            lineHeight: 1.4,
                          }}
                        >
                          {post.title}
                        </h4>

                        {/* Hook Preview */}
                        {post.hook && (
                          <p
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--text-muted, #64748B)',
                              margin: '0 0 8px',
                              fontStyle: 'italic',
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            &ldquo;{post.hook}&rdquo;
                          </p>
                        )}

                        {/* Schedule date or Client feedback */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px',
                            color: 'var(--text-muted, #64748B)',
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border)',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {post.scheduled_date
                              ? `📅 ${new Date(post.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}`
                              : 'No date'}
                          </span>

                          {post.client_feedback && (
                            <span style={{ color: '#D97706', fontWeight: 700 }}>💬 Feedback</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {columnPosts.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '30px 12px',
                        color: 'var(--text-muted, #94A3B8)',
                        fontSize: '12px',
                        border: '1px dashed var(--border)',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.01)',
                      }}
                    >
                      Drag &amp; drop cards here
                    </div>
                  )}

                  {/* Add button inside column */}
                  <button
                    type="button"
                    onClick={() => openCreateModal(st.key)}
                    style={{
                      background: 'transparent',
                      border: '1px dashed var(--border)',
                      color: 'var(--text-muted, #64748B)',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: '4px',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = st.bg;
                      e.currentTarget.style.color = st.color;
                      e.currentTarget.style.borderColor = st.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted, #64748B)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    + Add to {st.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: MONTHLY CALENDAR GRID (DRAGGABLE & DROPPABLE RESCHEDULER) */}
      {viewMode === 'calendar' && (
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          {/* Month Header Navigation Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-card)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              {(() => {
                const monthPostsCount = filteredPosts.filter((p) => {
                  if (!p.scheduled_date) return false;
                  const pYear = new Date(p.scheduled_date).getFullYear();
                  const pMonth = new Date(p.scheduled_date).getMonth();
                  return (
                    pYear === currentCalendarDate.getFullYear() &&
                    pMonth === currentCalendarDate.getMonth()
                  );
                }).length;
                return (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(10, 36, 99, 0.06)',
                      color: 'var(--brand-primary)',
                      border: '1px solid rgba(10, 36, 99, 0.12)',
                    }}
                  >
                    {monthPostsCount} {monthPostsCount === 1 ? 'post' : 'posts'} scheduled
                  </span>
                );
              })()}
            </div>

            {/* Navigation Button Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setCurrentCalendarDate(
                      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
                    )
                  }
                  style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all var(--transition-fast)',
                  }}
                  title="Previous Month"
                >
                  ◀ Prev
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentCalendarDate(new Date())}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--brand-primary)',
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentCalendarDate(
                      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
                    )
                  }
                  style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all var(--transition-fast)',
                  }}
                  title="Next Month"
                >
                  Next ▶
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openCreateModal('Scheduled', `${currentCalendarDate.toISOString().slice(0, 10)}T10:00`)}
                style={{ padding: '0 14px', gap: '6px', fontWeight: 600 }}
              >
                + New Post
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
              <div
                key={d}
                style={{
                  padding: '10px 4px',
                  color: i === 0 || i === 6 ? '#94A3B8' : 'var(--text-secondary)',
                  borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Grid Container (Unified 1px grid table layout with Drop Targets) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'var(--border)',
              gap: '1px',
            }}
          >
            {calendarDays.map((cd, idx) => {
              const dayPosts = filteredPosts.filter((p) => {
                if (!p.scheduled_date) return false;
                return p.scheduled_date.slice(0, 10) === cd.dateStr;
              });

              const isDayDragOver = dragOverDate === cd.dateStr;

              return (
                <div
                  key={`${cd.dateStr}-${idx}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverDate !== cd.dateStr) setDragOverDate(cd.dateStr);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverDate === cd.dateStr) setDragOverDate(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverDate(null);
                    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
                    if (!postId || !cd.dateStr) return;
                    await handleDropOnDate(postId, cd.dateStr);
                  }}
                  style={{
                    minHeight: '125px',
                    background: isDayDragOver
                      ? 'rgba(62, 107, 222, 0.14)'
                      : cd.isToday
                      ? 'rgba(74, 144, 217, 0.05)'
                      : cd.isCurrentMonth
                      ? 'var(--bg-card, #FFFFFF)'
                      : 'var(--bg-surface, #FAF9F6)',
                    border: isDayDragOver ? '2px dashed var(--brand-accent, #3E6BDE)' : 'none',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    position: 'relative',
                    transition: 'all var(--transition-fast)',
                    opacity: cd.isCurrentMonth ? 1 : 0.65,
                  }}
                  className="calendar-cell"
                >
                  {/* Cell Top: Day Number & Add Button */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        fontSize: '12px',
                        fontWeight: cd.isToday ? 800 : 600,
                        background: cd.isToday ? 'var(--brand-primary, #0A2463)' : 'transparent',
                        color: cd.isToday
                          ? '#FFFFFF'
                          : cd.isCurrentMonth
                          ? 'var(--text-primary)'
                          : '#94A3B8',
                        padding: '0 4px',
                      }}
                    >
                      {cd.day}
                    </span>

                    <button
                      type="button"
                      onClick={() => openCreateModal('Scheduled', `${cd.dateStr}T10:00`)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        lineHeight: 1,
                        transition: 'all var(--transition-fast)',
                      }}
                      title={`Schedule post for ${cd.dateStr}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--brand-primary)';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = 'var(--brand-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--brand-primary)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Drop Placeholder Indicator when dragging over */}
                  {isDayDragOver && (
                    <div
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: 'rgba(62, 107, 222, 0.18)',
                        border: '1px dashed var(--brand-accent)',
                        color: 'var(--brand-accent)',
                        fontSize: '11px',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      🎯 Drop here to reschedule
                    </div>
                  )}

                  {/* Scheduled Post Badges (Draggable) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      flex: 1,
                      overflowY: 'auto',
                    }}
                  >
                    {dayPosts.map((p) => {
                      const stObj = STATUSES.find((s) => s.key === p.status);
                      const timeStr =
                        p.scheduled_date && p.scheduled_date.length >= 16
                          ? p.scheduled_date.slice(11, 16)
                          : null;
                      const isDraggingThis = draggedPostId === p.id;

                      return (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', p.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedPostId(p.id);
                          }}
                          onDragEnd={() => {
                            setDraggedPostId(null);
                            setDragOverDate(null);
                            setDragOverStatus(null);
                          }}
                          onClick={() => openEditModal(p)}
                          style={{
                            background: stObj?.bg || 'var(--bg-surface)',
                            border: `1px solid ${stObj?.border || 'var(--border)'}`,
                            borderLeft: `3px solid ${stObj?.color || 'var(--brand-primary)'}`,
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'grab',
                            transition: 'all var(--transition-fast)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            opacity: isDraggingThis ? 0.35 : 1,
                            transform: isDraggingThis ? 'scale(0.95)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            if (!isDraggingThis) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.08)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isDraggingThis) {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                            }
                          }}
                          title={`${p.title} (${stObj?.label || p.status}) — Drag to reschedule`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px' }}>{stObj?.icon}</span>
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                fontWeight: 700,
                                fontSize: '11.5px',
                                color: stObj?.color || 'var(--text-primary)',
                              }}
                            >
                              {p.title}
                            </span>
                          </div>

                          {timeStr && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                              🕒 {timeStr}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: TABLE LIST */}
      {viewMode === 'list' && (
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface, #F8FAFC)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Topic / Title
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Pillar
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Scheduled Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Viral Score
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((p) => {
                const stObj = STATUSES.find((s) => s.key === p.status);
                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => openEditModal(p)}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.title}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{p.pillar}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: stObj?.bg,
                          color: stObj?.color,
                          border: `1px solid ${stObj?.border}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {stObj?.icon} {stObj?.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {p.scheduled_date ? new Date(p.scheduled_date).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {p.viral_score > 0 ? (
                        <span style={{ fontWeight: 800, color: p.viral_score >= 80 ? '#059669' : '#D97706' }}>
                          🎯 {p.viral_score}/100
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(p);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= COMPOSER & LINKEDIN PREVIEW MODAL ================= */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1050 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="modal modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '850px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0A2463 0%, #1A367D 50%, #244494 100%)',
                color: '#FFFFFF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  {editingPost ? 'Edit Post & Ghostwriting Draft' : 'New Content Deliverable'}
                </h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  Client: {client.company_name || client.full_name}
                </span>
              </div>

              {/* Tab Switcher: Editor vs LinkedIn Live Preview */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('editor')}
                  style={{
                    background: modalTab === 'editor' ? '#FFFFFF' : 'transparent',
                    color: modalTab === 'editor' ? '#0A2463' : '#FFFFFF',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  ✍️ Composer
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('preview')}
                  style={{
                    background: modalTab === 'preview' ? '#FFFFFF' : 'transparent',
                    color: modalTab === 'preview' ? '#0A2463' : '#FFFFFF',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  📱 LinkedIn Live Preview
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: 'var(--bg-card)' }}>
              {modalTab === 'editor' && (
                <form onSubmit={handleSavePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Topic Title */}
                  <div className="form-group">
                    <label className="form-label">Topic / Working Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Why most founders fail at scaling AI agents in 2026..."
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '13.5px', fontWeight: 600 }}
                    />
                  </div>

                  <div className="form-row">
                    {/* Pillar */}
                    <div className="form-group">
                      <label className="form-label">Content Pillar</label>
                      <select
                        value={formPillar}
                        onChange={(e) => setFormPillar(e.target.value as ContentPillar)}
                        className="form-control"
                      >
                        {PILLARS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="form-group">
                      <label className="form-label">Workflow Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                        className="form-control"
                      >
                        {STATUSES.map((st) => (
                          <option key={st.key} value={st.key}>
                            {st.icon} {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Scheduled Date */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Scheduled Publish Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={formScheduledDate}
                        onChange={(e) => setFormScheduledDate(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Media / Carousel Asset URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/... or slide deck link"
                        value={formMediaUrl}
                        onChange={(e) => setFormMediaUrl(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>

                  {/* Hook / First 2 Lines */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Hook (First 2 Lines Before &quot;See More&quot;)</label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formHook.length} characters
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="The attention-grabbing 1-2 sentence lead..."
                      value={formHook}
                      onChange={(e) => setFormHook(e.target.value)}
                      className="form-control"
                    />
                  </div>

                  {/* Full Body Content */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Full Post Copy &amp; Body</label>
                      <button
                        type="button"
                        onClick={handleAnalyzePost}
                        disabled={isScoring}
                        className="btn btn-secondary btn-sm"
                        style={{
                          background: 'rgba(10, 36, 99, 0.08)',
                          color: 'var(--brand-primary)',
                          fontWeight: 700,
                        }}
                      >
                        {isScoring ? '🤖 Analyzing AI Viral Score...' : '✨ Run AI Viral Hook Analysis'}
                      </button>
                    </div>
                    <textarea
                      rows={9}
                      placeholder="Write the full post draft here... Use short punchy lines, bullet points, and high-impact takeaways."
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      className="form-control"
                      style={{ height: 'auto', minHeight: '160px', fontFamily: 'inherit', lineHeight: 1.6 }}
                    />
                  </div>

                  {/* AI Score Feedback Box */}
                  {aiScoreResult && (
                    <div
                      style={{
                        background: 'rgba(10, 36, 99, 0.04)',
                        border: '1px solid rgba(10, 36, 99, 0.15)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-primary)' }}>
                          AI Viral Optimization Score
                        </span>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: aiScoreResult.score >= 80 ? '#059669' : '#D97706',
                          }}
                        >
                          🎯 {aiScoreResult.score}/100
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        <strong>Verdict:</strong> {aiScoreResult.verdict}
                      </p>
                      {aiScoreResult.suggestions && aiScoreResult.suggestions.length > 0 && (
                        <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {aiScoreResult.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Modal Footer Controls */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      {editingPost && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeletePost(editingPost.id)}
                        >
                          🗑️ Delete Deliverable
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {editingPost ? 'Save Changes' : 'Create Deliverable'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 2: LINKEDIN LIVE PREVIEW */}
              {modalTab === 'preview' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '540px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '18px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* LinkedIn User Profile Header */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0A2463, #3E6BDE)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '18px',
                          flexShrink: 0,
                        }}
                      >
                        {client.full_name ? client.full_name[0].toUpperCase() : 'C'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                            {client.full_name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>• 1st</span>
                        </div>
                        <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748B', lineHeight: 1.3 }}>
                          {client.company_name || 'Founder & Executive Leader'} | {client.stage}
                        </p>
                        <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                          {formScheduledDate ? new Date(formScheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Scheduled'} • 🌐
                        </span>
                      </div>
                    </div>

                    {/* Post Hook & Body */}
                    <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#0F172A', whiteSpace: 'pre-wrap' }}>
                      {formHook && (
                        <p style={{ margin: '0 0 10px', fontWeight: 600 }}>
                          {formHook}
                        </p>
                      )}
                      {formContent || (
                        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>
                          No draft content yet. Switch to Composer to write copy.
                        </span>
                      )}
                    </div>

                    {/* Media Preview if provided */}
                    {formMediaUrl && (
                      <div style={{ marginTop: '14px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                        <img
                          src={formMediaUrl}
                          alt="Post Media"
                          style={{ width: '100%', maxHeight: '280px', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* LinkedIn Social Interaction Bar */}
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '10px',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#64748B',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ cursor: 'pointer' }}>👍 Like</span>
                      <span style={{ cursor: 'pointer' }}>💬 Comment</span>
                      <span style={{ cursor: 'pointer' }}>🔁 Repost</span>
                      <span style={{ cursor: 'pointer' }}>🚀 Send</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
