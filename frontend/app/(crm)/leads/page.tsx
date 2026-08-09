'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { leadsApi, importExportApi, peopleApi } from '@/lib/api';
import { Lead, User, PIPELINE_STAGES, LEAD_SOURCES, STAGE_COLORS } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import LeadFormModal from '@/components/leads/LeadFormModal';


export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const PAGE_SIZE = 50;

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (stageFilter) params.stage = stageFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await leadsApi.list(params);
      setLeads(res.data.items);
      setTotal(res.data.total);
      setSelectedLeadIds([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter, sourceFilter, priorityFilter]);

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    setDeletingBulk(true);
    try {
      await leadsApi.batchDelete(selectedLeadIds);
      setShowDeleteConfirm(false);
      
      // If we deleted all leads on the current page and we're not on page 1, go to previous page
      if (selectedLeadIds.length === leads.length && page > 1) {
        setPage((prev) => prev - 1);
        setSelectedLeadIds([]);
      } else {
        setSelectedLeadIds([]);
        await loadLeads();
      }
    } catch (err) {
      console.error('Failed to bulk delete leads', err);
      alert('Failed to delete selected leads. Make sure you have admin permissions.');
    } finally {
      setDeletingBulk(false);
    }
  };

  useEffect(() => { 
    loadLeads(); 
    peopleApi.list().then(res => setTeamMembers(res.data)).catch(console.error);
  }, [loadLeads]);

  async function handleExport() {
    const res = await importExportApi.exportCsv();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'growpido_leads.csv';
    a.click();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importExportApi.importCsv(file);
      loadLeads();
      setImportMsg({ type: 'success', text: 'Import successful! Leads have been added to your pipeline.' });
    } catch {
      setImportMsg({ type: 'error', text: 'Import failed. Please check the CSV format.' });
    }
    setTimeout(() => setImportMsg(null), 5000);
    e.target.value = ''; // Reset input
  }

  const isClientStage = (stage: string) => {
    return ['Won', 'Onboarding', 'Active Client', 'Upsell', 'Referral'].includes(stage);
  };

  const stageBadge = (stage: string) => {
    const color = STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || '#6B7280';
    return (
      <span className="stage-badge" style={{ background: `${color}20`, color }}>
        {stage}
      </span>
    );
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">All Leads</h1>
          <p className="page-subtitle">{total} leads · Single source of truth</p>
        </div>
        <div className="topbar-actions">
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import CSV
            <input type="file" accept=".csv" hidden onChange={handleImport} />
          </label>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="create-lead-btn">
            + Add Lead
          </button>
        </div>
      </div>

      {importMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 500, fontSize: '13.5px',
          background: importMsg.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: importMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${importMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
        }}>
          {importMsg.type === 'success' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          {importMsg.text}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            className="search-input"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select className="filter-select" value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}>
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="filter-select" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          <option value="Hot">Hot</option>
          <option value="Warm">Warm</option>
          <option value="Cold">Cold</option>
        </select>

        <select className="filter-select" value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
          <option value="">All Sources</option>
          {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {(stageFilter || priorityFilter || sourceFilter || search) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setStageFilter(''); setPriorityFilter(''); setSourceFilter(''); setSearch(''); setPage(1); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions floating/inline bar */}
      {selectedLeadIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-danger)' }}>
            {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedLeadIds([])}
            >
              Deselect All
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--color-danger)', color: '#fff', border: 'none' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              🗑 Delete Selected ({selectedLeadIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /> Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="empty-state-title">No leads found</div>
          <div className="empty-state-desc">Add your first lead or adjust the filters above</div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Add Lead</button>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '1650px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', padding: '12px 8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th style={{ minWidth: '220px' }}>Name & Company</th>
                <th style={{ minWidth: '130px' }}>Date Added</th>
                <th style={{ minWidth: '150px' }}>Profile (Added By)</th>
                <th style={{ minWidth: '140px' }}>Stage</th>
                <th style={{ minWidth: '100px' }}>Priority</th>
                <th>POC</th>
                <th>Services</th>
                <th>Budget</th>
                <th>Source</th>
                <th style={{ minWidth: '180px' }}>Assigned To</th>
                <th style={{ minWidth: '150px' }}>Next Step</th>
                <th>Next Step Date</th>
                <th>Company Address</th>
                <th>Company Phone</th>
                <th>LinkedIn</th>
                <th>Notes</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(14, 86, 196, 0.05)' : undefined,
                    }}
                  >
                    <td
                      onClick={(e) => toggleSelectLead(lead.id, e)}
                      style={{ textAlign: 'center', padding: '12px 8px' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lead.full_name}</div>
                      {lead.company_name && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.company_name}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                      {lead.created_at && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(lead.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td>
                      {lead.added_by_user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="avatar avatar-sm">{lead.added_by_user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</div>
                          <span style={{ fontSize: '12px' }}>{lead.added_by_user.name}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>{stageBadge(lead.stage)}</td>
                    <td>
                      {isClientStage(lead.stage) ? (
                        <span
                          className="badge"
                          style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            fontWeight: 700,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ fontSize: '9px' }}>●</span> Client
                        </span>
                      ) : lead.is_lost ? (
                        <span className="badge badge-muted" style={{ opacity: 0.6, fontSize: '11px' }}>
                          Lost
                        </span>
                      ) : (
                        <span className={`badge badge-priority-${(lead.priority || 'warm').toLowerCase()}`}>
                          {lead.priority || 'Warm'}
                        </span>
                      )}
                    </td>
                    <td>{lead.poc_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {lead.reputation_building && <span className="badge badge-info" style={{ fontSize: '10px' }}>LinkedIn</span>}
                        {lead.custom_ai_agent && <span className="badge badge-muted" style={{ fontSize: '10px' }}>AI Agent</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      {lead.budget ? `₹${lead.budget.toLocaleString('en-IN')}` : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{lead.source || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="form-control"
                        style={{ padding: '4px 8px', fontSize: '12px', minWidth: '130px', height: '32px' }}
                        value={lead.assigned_to || ''}
                        onChange={async (e) => {
                          try {
                            await leadsApi.update(lead.id, { assigned_to: e.target.value || undefined });
                            loadLeads();
                          } catch (err) {
                            console.error("Failed to assign lead", err);
                          }
                        }}
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(member => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: '12px' }}>{lead.next_step || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ fontSize: '12px' }}>{lead.next_step_date ? new Date(lead.next_step_date).toLocaleDateString() : <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ fontSize: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.company_address || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ fontSize: '12px' }}>{lead.phone || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td>
                      {lead.linkedin_url ? (
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--brand-accent)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </a>
                      ) : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ fontSize: '12px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lead.general_notes || ''}>
                      {lead.general_notes || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {lead.last_activity_at
                        ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
                        : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}>Next →</button>
        </div>
      )}

      {showCreateModal && (
        <LeadFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); loadLeads(); }}
        />
      )}


      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>Delete Leads</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                Are you sure you want to delete <strong>{selectedLeadIds.length}</strong> selected lead{selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--color-danger)', color: '#fff' }}
                disabled={deletingBulk}
                onClick={handleBulkDelete}
              >
                {deletingBulk ? 'Deleting...' : `Delete ${selectedLeadIds.length} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
