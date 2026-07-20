'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { peopleApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import type { User, PersonStats, WorkLog } from '@/lib/types';
import { STAGE_COLORS, WORK_LOG_CATEGORIES } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#4A90D9', '#7C6ED9', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CATEGORY_COLORS: Record<string, string> = {
  Development: '#4A90D9',
  Sales: '#10B981',
  'Client Management': '#7C6ED9',
  Design: '#EC4899',
  Research: '#F97316',
  Meetings: '#F59E0B',
  Admin: '#6B7280',
  Other: '#9CA3AF',
};

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const userId = params.userId as string;

  const [person, setPerson] = useState<User | null>(null);
  const [stats, setStats] = useState<PersonStats | null>(null);
  const [leads, setLeads] = useState<unknown[]>([]);
  const [tasks, setTasks] = useState<unknown[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'tasks' | 'worklog'>('leads');

  // Work log form
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    hours: '',
    category: 'Other' as string,
  });
  const [savingLog, setSavingLog] = useState(false);

  const isSelf = currentUser?.id === userId;
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      peopleApi.get(userId),
      peopleApi.stats(userId),
      peopleApi.leads(userId),
      peopleApi.tasks(userId),
      peopleApi.workLogs(userId),
    ]).then(([p, s, l, t, w]) => {
      setPerson(p.data);
      setStats(s.data);
      setLeads(l.data as unknown[]);
      setTasks(t.data as unknown[]);
      setWorkLogs(w.data);
    }).catch(() => router.push('/team'))
      .finally(() => setLoading(false));
  }, [userId, router]);

  async function handleAddWorkLog() {
    if (!logForm.description.trim()) return;
    setSavingLog(true);
    try {
      await peopleApi.addWorkLog(userId, {
        date: new Date(logForm.date).toISOString(),
        description: logForm.description,
        hours: logForm.hours ? parseFloat(logForm.hours) : undefined,
        category: logForm.category,
      });
      const w = await peopleApi.workLogs(userId);
      setWorkLogs(w.data);
      setLogForm({ date: new Date().toISOString().slice(0, 10), description: '', hours: '', category: 'Other' });
      setShowLogForm(false);
    } finally {
      setSavingLog(false);
    }
  }

  async function handleDeleteWorkLog(logId: string) {
    if (!confirm('Delete this work log entry?')) return;
    await peopleApi.deleteWorkLog(userId, logId);
    setWorkLogs(prev => prev.filter(w => w.id !== logId));
  }

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-strong)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!person) return null;

  const color = avatarColor(person.name);

  return (
    <div className="page-container">
      {/* Back nav */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/team" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Team Directory
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '16px',
            background: color + '18', border: `2px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color, flexShrink: 0,
          }}>
            {initials(person.name)}
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {person.name}
              </h1>
              {person.employee_id && (
                <span style={{
                  fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '4px',
                  background: 'var(--bg-surface)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}>
                  {person.employee_id}
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: '4px',
                background: person.role === 'admin' ? 'rgba(74,144,217,0.1)' : 'rgba(16,185,129,0.1)',
                color: person.role === 'admin' ? '#4A90D9' : '#10B981',
              }}>
                {person.role === 'admin' ? 'Administrator' : 'Team Member'}
              </span>
            </div>

            {person.designation && (
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {person.designation}
                {person.department && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> &middot; {person.department}</span>}
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                {person.email}
              </span>
              {person.phone && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.1 6.1l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {person.phone}
                </span>
              )}
              {person.join_date && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Joined {formatDate(person.join_date)}
                </span>
              )}
            </div>

            {person.bio && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {person.bio}
              </div>
            )}
          </div>

          {canManage && (
            <Link href={`/settings?tab=team&edit=${person.id}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-surface)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', textDecoration: 'none',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total Leads', value: stats.total_leads, color: 'var(--brand-primary)' },
            { label: 'Open Leads', value: stats.open_leads, color: 'var(--brand-primary)' },
            { label: 'Won Leads', value: stats.won_leads, color: 'var(--color-success)' },
            { label: 'Lost Leads', value: stats.lost_leads, color: 'var(--color-danger)' },
            { label: 'Tasks Done', value: stats.completed_tasks, color: 'var(--color-success)' },
            { label: 'Pending Tasks', value: stats.total_tasks - stats.completed_tasks },
            { label: 'Overdue Tasks', value: stats.overdue_tasks, color: stats.overdue_tasks > 0 ? 'var(--color-danger)' : undefined },
            { label: 'Hours This Month', value: `${stats.work_hours_this_month.toFixed(1)}h` },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color || 'var(--text-primary)', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '0' }}>
        {(['leads', 'tasks', 'worklog'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}
          >
            {tab === 'leads' ? `Leads (${leads.length})` : tab === 'tasks' ? `Tasks (${tasks.length})` : `Work Log (${workLogs.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'leads' && (
        <div>
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>No leads assigned yet.</div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Lead', 'Company', 'Stage', 'Priority', 'Budget', 'Last Activity'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(leads as Record<string, unknown>[]).map((l) => {
                    const stage = l.stage as string;
                    const stageColor = STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || '#6B7280';
                    return (
                      <tr key={l.id as string} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <Link href={`/leads/${l.id}`} style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {l.full_name as string}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{(l.company_name as string) || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: stageColor + '18', color: stageColor }}>
                            {stage}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{(l.priority as string) || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                          {l.budget ? `₹${Number(l.budget).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {l.last_activity_at ? new Date(l.last_activity_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>No tasks assigned yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(tasks as Record<string, unknown>[]).map((t) => {
                const isOverdue = !t.is_done && t.due_date && new Date(t.due_date as string) < new Date();
                return (
                  <div key={t.id as string} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                      background: t.is_done ? 'var(--color-success)' : 'var(--bg-surface)',
                      border: t.is_done ? 'none' : '1.5px solid var(--border-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {t.is_done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: t.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                        {t.title as string}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t.task_type as string}
                        {t.due_date && ` · Due ${new Date(t.due_date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    {isOverdue && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                        Overdue
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'worklog' && (
        <div>
          {(isSelf || canManage) && (
            <div style={{ marginBottom: '16px' }}>
              {!showLogForm ? (
                <button
                  onClick={() => setShowLogForm(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                    background: 'var(--brand-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Log Work
                </button>
              ) : (
                <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Add Work Log Entry</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date</label>
                      <input type="date" className="input" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Hours</label>
                      <input type="number" className="input" placeholder="e.g. 3.5" min="0" step="0.5" value={logForm.hours} onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                      <select className="input" value={logForm.category} onChange={e => setLogForm(f => ({ ...f, category: e.target.value }))}>
                        {WORK_LOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Description</label>
                    <textarea
                      className="input"
                      placeholder="What did you work on?"
                      rows={2}
                      value={logForm.description}
                      onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleAddWorkLog}
                      disabled={savingLog || !logForm.description.trim()}
                      style={{
                        padding: '7px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                        background: 'var(--brand-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                        opacity: savingLog || !logForm.description.trim() ? 0.6 : 1,
                      }}
                    >
                      {savingLog ? 'Saving...' : 'Save Entry'}
                    </button>
                    <button
                      onClick={() => setShowLogForm(false)}
                      style={{
                        padding: '7px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                        background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {workLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>No work logs recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workLogs.map(log => {
                const catColor = CATEGORY_COLORS[log.category] || '#6B7280';
                return (
                  <div key={log.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '48px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {new Date(log.date).getDate()}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {new Date(log.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{log.description}</div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
                        <span style={{ padding: '1px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: catColor + '18', color: catColor }}>
                          {log.category}
                        </span>
                        {log.hours && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.hours}h</span>
                        )}
                      </div>
                    </div>
                    {(isSelf || canManage) && (
                      <button
                        onClick={() => handleDeleteWorkLog(log.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}
                        title="Delete entry"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
