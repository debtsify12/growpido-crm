'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { leadsApi, importExportApi } from '@/lib/api';
import { Lead, PIPELINE_STAGES, LEAD_SOURCES, STAGE_COLORS } from '@/lib/types';
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
  const PAGE_SIZE = 50;

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
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter, sourceFilter, priorityFilter]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

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
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Services</th>
                <th>Budget</th>
                <th>Source</th>
                <th>Assigned To</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{lead.full_name}</div>
                    {lead.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.email}</div>}
                  </td>
                  <td>
                    <div>{lead.company_name || '—'}</div>
                    {lead.city && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.city}</div>}
                  </td>
                  <td>{stageBadge(lead.stage)}</td>
                  <td>
                    <span className={`badge badge-priority-${(lead.priority || 'warm').toLowerCase()}`}>
                      {lead.priority || 'Warm'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {lead.reputation_building && <span className="badge badge-info" style={{ fontSize: '10px' }}>LinkedIn</span>}
                      {lead.custom_ai_agent && <span className="badge badge-muted" style={{ fontSize: '10px' }}>AI Agent</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                    {lead.budget ? `₹${lead.budget.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{lead.source || '—'}</td>
                  <td>
                    {lead.assigned_user ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar avatar-sm">{lead.assigned_user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</div>
                        <span style={{ fontSize: '12px' }}>{lead.assigned_user.name}</span>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {lead.last_activity_at
                      ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
                      : '—'}
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
