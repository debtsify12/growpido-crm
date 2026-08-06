'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leadsApi, tasksApi, usersApi, invoicesApi } from '@/lib/api';
import { Lead, Activity, Note, Task, User, Invoice, PIPELINE_STAGES, STAGE_COLORS, LEAD_SOURCES } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import InvoiceModal from '@/components/invoices/InvoiceModal';
import ClientContentCalendar from '@/components/clients/ClientContentCalendar';
import ClientRetainerTracker from '@/components/clients/ClientRetainerTracker';
import ClientBrandVault from '@/components/clients/ClientBrandVault';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  stage_change: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-1.35"/></svg>,
  note_added: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  task_created: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  task_completed: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  call_logged: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  field_updated: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  lead_created: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22l5-5"/><path d="M11.5 14.5L16 10"/><path d="M22 2l-7.5 7.5L10 5.5l-4 4L19 22l3-3z"/></svg>,
  lead_assigned: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  stuck_alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

export default function LeadProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [changingStage, setChangingStage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Invoice modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Client delivery operations tab
  const isClientStage = lead ? ['Won', 'Onboarding', 'Active Client', 'Upsell', 'Referral'].includes(lead.stage) : false;
  const [activeTab, setActiveTab] = useState<'delivery' | 'crm'>('delivery');

  const load = useCallback(async () => {
    try {
      const [leadRes, activitiesRes, notesRes, tasksRes, invoicesRes, usersRes] = await Promise.all([
        leadsApi.get(id),
        leadsApi.activities(id),
        leadsApi.notes(id),
        tasksApi.list({ lead_id: id }),
        invoicesApi.byClient(id).catch(() => ({ data: [] })),
        usersApi.list(),
      ]);
      setLead(leadRes.data);
      setEditForm(leadRes.data);
      setActivities(activitiesRes.data);
      setNotes(notesRes.data);
      setTasks(tasksRes.data);
      setInvoices(invoicesRes.data || []);
      setUsers(usersRes.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStageChange(newStage: string) {
    if (!lead || newStage === lead.stage) return;
    setChangingStage(true);
    try {
      await leadsApi.changeStage(id, newStage);
      await load();
    } finally {
      setChangingStage(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await leadsApi.update(id, editForm);
      setEditMode(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    await leadsApi.addNote(id, noteText);
    setNoteText('');
    load();
  }

  async function handleCompleteTask(taskId: string) {
    await tasksApi.complete(taskId);
    load();
  }

  if (loading) {
    return <div className="loading-page"><div className="spinner" /> Loading lead...</div>;
  }

  if (!lead) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="empty-state-title">Lead not found</div>
          <button className="btn btn-primary" onClick={() => router.push('/leads')}>← Back to Leads</button>
        </div>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[lead.stage] || '#6B7280';
  const daysSince = lead.last_activity_at
    ? Math.floor((Date.now() - new Date(lead.last_activity_at).getTime()) / 86400000)
    : 0;

  return (
    <div className="page-container">
      {/* Back + Header + Tab Switcher */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>

        {isClientStage && (
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-elevated, #F1F5F9)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              style={{
                background: activeTab === 'delivery' ? 'var(--brand-primary, #0E56C4)' : 'transparent',
                color: activeTab === 'delivery' ? '#FFFFFF' : 'var(--text-secondary)',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📅 Content Calendar & Delivery Suite
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('crm')}
              style={{
                background: activeTab === 'crm' ? 'var(--brand-primary, #0E56C4)' : 'transparent',
                color: activeTab === 'crm' ? '#FFFFFF' : 'var(--text-secondary)',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              👤 CRM Profile & Invoices
            </button>
          </div>
        )}
      </div>

      {/* CLIENT OPERATIONS & CONTENT DELIVERY VIEW */}
      {isClientStage && activeTab === 'delivery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ClientRetainerTracker client={lead} deliveredPostsCount={0} onUpdated={load} />
          <ClientContentCalendar client={lead} onPostUpdated={load} />
          <ClientBrandVault client={lead} onUpdated={load} />
        </div>
      )}

      {/* CRM PROFILE & PIPELINE VIEW */}
      {(!isClientStage || activeTab === 'crm') && (
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* LEFT: Lead Profile Panel & Invoices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Identity Card */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="avatar avatar-xl">
                    {lead.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800 }}>{lead.full_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{lead.company_name || 'No company'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(!editMode)}>
                    {editMode ? '✕ Cancel' : 'Edit Profile'}
                  </button>
                  {!editMode && (
                    <button 
                      className="btn btn-sm" 
                      style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', background: 'transparent' }}
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Stage selector */}
              <div style={{ marginBottom: '16px' }}>
                <div className="form-label" style={{ marginBottom: '6px' }}>Pipeline Stage</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="stage-badge" style={{ background: `${stageColor}20`, color: stageColor, fontSize: '12px' }}>
                    {lead.stage}
                  </span>
                  {daysSince >= 7 && (
                    <span className="stuck-indicator">{daysSince}d no activity</span>
                  )}
                </div>
                <select
                  className="form-control"
                  style={{ marginTop: '8px' }}
                  value={lead.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={changingStage}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {changingStage && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Updating stage & creating follow-up task...</div>}
              </div>

              {/* Fields */}
              {editMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Phone', key: 'phone', type: 'tel' },
                    { label: 'Email', key: 'email', type: 'email' },
                    { label: 'City', key: 'city', type: 'text' },
                    { label: 'Company Industry', key: 'company_industry', type: 'text' },
                    { label: 'Budget (INR)', key: 'budget', type: 'number' },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="form-group">
                      <label className="form-label">{label}</label>
                      <input
                        className="form-control"
                        type={type}
                        value={(editForm as Record<string, unknown>)[key] as string || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Source</label>
                    <select className="form-control" value={editForm.source || ''} onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value as Lead['source'] }))}>
                      <option value="">Select...</option>
                      {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={editForm.priority || 'Warm'} onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value as Lead['priority'] }))}>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned To</label>
                    <select className="form-control" value={editForm.assigned_to || ''} onChange={(e) => setEditForm((p) => ({ ...p, assigned_to: e.target.value || undefined }))}>
                      <option value="">Unassigned</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label: lead.phone },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label: lead.email },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: lead.city },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>, label: lead.company_industry },
                  ].filter((f) => f.label).map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13.5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{f.icon}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                    </div>
                  ))}
                  {lead.budget && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>₹{lead.budget.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {lead.source && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Source:</span>
                      <span className="badge badge-secondary">{lead.source}</span>
                    </div>
                  )}
                  {lead.created_at && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', paddingTop: '4px', borderTop: '1px dashed var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Added on:</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {format(new Date(lead.created_at), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoices & Billing Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <h3 className="card-title" style={{ margin: 0 }}>Invoices ({invoices.length})</h3>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-xs"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => {
                  setSelectedInvoice(null);
                  setIsInvoiceModalOpen(true);
                }}
              >
                + Generate
              </button>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {invoices.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                  No invoices generated for this client yet.
                </div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setIsInvoiceModalOpen(true);
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {inv.invoice_number}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Draft'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0E56C4' }}>
                        {inv.currency || '$'}{Number(inv.total_amount || 0).toLocaleString()}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: inv.status === 'Paid' ? '#ecfdf5' : inv.status === 'Sent' ? '#eff6ff' : '#f8fafc',
                          color: inv.status === 'Paid' ? '#059669' : inv.status === 'Sent' ? '#2563eb' : '#64748b',
                        }}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tasks Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Tasks ({tasks.filter((t) => !t.is_done).length} pending)</h3>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>No tasks yet</div>
              )}
              {tasks.map((task) => (
                <div key={task.id} style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)', opacity: task.is_done ? 0.5 : 1,
                }}>
                  <div
                    className={`checkbox ${task.is_done ? 'checked' : ''}`}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                    onClick={() => !task.is_done && handleCompleteTask(task.id)}
                  >
                    {task.is_done && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: task.is_done ? 'line-through' : 'none' }}>
                      {task.title}
                    </div>
                    {task.due_date && (
                      <div style={{ fontSize: '11px', color: new Date(task.due_date) < new Date() && !task.is_done ? 'var(--color-danger)' : 'var(--text-muted)', marginTop: '2px' }}>
                        Due {format(new Date(task.due_date), 'dd MMM yyyy')}
                      </div>
                    )}
                    {task.is_auto_created && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--brand-primary)', background: 'rgba(74,144,217,0.08)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        Auto-created
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Activity Timeline + Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add Note */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Add Note</h3></div>
            <div className="card-body">
              <textarea
                className="form-control"
                placeholder="Add an internal note... (@mention team members)"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ minHeight: '80px' }}
              />
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '10px' }}
                onClick={handleAddNote}
                disabled={!noteText.trim()}
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Notes */}
          {notes.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Notes</h3></div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notes.map((note) => (
                  <div key={note.id} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--brand-primary)' }}>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.content}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {note.author?.name} · {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Activity Timeline</h3></div>
            <div style={{ padding: '16px 20px' }}>
              {activities.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <div className="empty-state-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  </div>
                  <div className="empty-state-desc">No activity yet</div>
                </div>
              ) : (
                <div className="timeline">
                  {activities.map((activity) => (
                    <div key={activity.id} className="timeline-item">
                      <div className="timeline-icon">
                        {ACTIVITY_ICONS[activity.activity_type] || <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-description">{activity.description}</div>
                        <div className="timeline-time">
                          {activity.user?.name && `${activity.user.name} · `}
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Invoice Generator Modal */}
      {isInvoiceModalOpen && lead && (
        <InvoiceModal
          client={lead}
          existingInvoice={selectedInvoice}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoice(null);
          }}
          onSaved={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoice(null);
            load();
          }}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowDeleteModal(false)}>
          <div className="card" style={{ padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.2)', textAlign: 'center', animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Delete Lead?</h3>
            <p style={{ margin: '0 0 32px 0', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{lead.full_name}</strong>? This action cannot be undone and all associated notes, tasks, and activities will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button 
                className="btn" 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', background: 'var(--color-danger)', color: 'white', border: 'none', boxShadow: '0 8px 16px -4px rgba(239, 68, 68, 0.4)' }}
                onClick={async () => {
                  try {
                    await leadsApi.delete(id);
                    router.push('/leads');
                  } catch {
                    alert('Failed to delete lead.');
                  }
                }}
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
