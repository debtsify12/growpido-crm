'use client';

import { useState, useEffect, useMemo } from 'react';
import { invoicesApi } from '@/lib/api';
import { Invoice, InvoiceStatus } from '@/lib/types';
import InvoiceModal from '@/components/invoices/InvoiceModal';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Load Invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    setError('');
    try {
      const res = await invoicesApi.list();
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Failed to load invoices', err);
      setError('Could not fetch invoices from CRM backend.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Status Update
  async function handleStatusChange(invoiceId: string, newStatus: InvoiceStatus) {
    try {
      const res = await invoicesApi.update(invoiceId, { status: newStatus });
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? res.data : inv)));
    } catch (err) {
      console.error('Failed to update invoice status', err);
    }
  }

  // Handle Delete
  async function handleDelete(invoiceId: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoicesApi.delete(invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (err) {
      console.error('Failed to delete invoice', err);
    }
  }

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.lead?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.lead?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client_details?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.client_details?.company?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Financial KPI Metrics
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;

    invoices.forEach((inv) => {
      const amt = Number(inv.total_amount || 0);
      totalInvoiced += amt;
      if (inv.status === 'Paid') {
        totalPaid += amt;
      } else if (inv.status === 'Sent' || inv.status === 'Draft' || inv.status === 'Overdue') {
        totalPending += amt;
      }
    });

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      count: invoices.length,
    };
  }, [invoices]);

  const getStatusColor = (st: InvoiceStatus) => {
    switch (st) {
      case 'Paid':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'Sent':
        return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'Overdue':
        return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
      case 'Cancelled':
        return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
      default: // Draft
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div className="crm-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(14, 86, 196, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg">
                <path d="M200 24 C280 24, 355 46, 355 46 C355 46, 355 190, 355 240 C355 330, 200 436, 200 436 C200 436, 45 330, 45 240 C45 190, 45 46, 45 46 C45 46, 120 24, 200 24 Z" fill="none" stroke="#0E56C4" strokeWidth="26" />
                <path d="M112 322 L222 178 L168 186 L248 94 L288 238 L246 198 L138 340 Z" fill="#0E56C4" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Client Invoices & Billing
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Create, customize, and issue branded Growpido invoices with real-time tracking
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="/templates/invoice-template.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🌐</span>
            <span>Open Standalone HTML Template</span>
          </a>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              setEditingInvoice(null);
              setModalOpen(true);
            }}
          >
            <span>+</span>
            <span>Generate New Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Invoiced
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            ${metrics.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{metrics.count} total records</span>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Collected / Paid
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            ${metrics.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cleared payments</span>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending & Due
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            ${metrics.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting settlement</span>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0E56C4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average Value
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E56C4', marginTop: '4px' }}>
            ${metrics.count > 0 ? (metrics.totalInvoiced / metrics.count).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Per generated invoice</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'draft', 'sent', 'paid', 'overdue'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn btn-xs ${statusFilter === tab ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize', fontSize: '12px' }}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search invoice #, client, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '12.5px', paddingLeft: '32px' }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="card" style={{ padding: '0', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📑</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
              {searchQuery || statusFilter !== 'all' ? 'No matching invoices found' : 'No invoices generated yet'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 18px' }}>
              Create professional branded invoices for your clients and export them to PDF or HTML with automatic remittance details.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingInvoice(null);
                setModalOpen(true);
              }}
            >
              + Create First Invoice
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Invoice #</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Client / Company</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Issue Date</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Due Date</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const sc = getStatusColor(inv.status);
                  const clientName = inv.client_details?.company || inv.client_details?.name || inv.lead?.company_name || inv.lead?.full_name || 'Client';
                  const currencySymbol = inv.currency === 'INR' ? '₹' : inv.currency === 'EUR' ? '€' : inv.currency === 'GBP' ? '£' : '$';

                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--primary)' }}>
                        #{inv.invoice_number}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{clientName}</div>
                        {inv.client_details?.email && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inv.client_details.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                        {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        {currencySymbol}{Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <select
                          value={inv.status}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                          style={{
                            background: sc.bg,
                            color: sc.text,
                            border: `1px solid ${sc.border}`,
                            borderRadius: '20px',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              setEditingInvoice(inv);
                              setModalOpen(true);
                            }}
                          >
                            Open / Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDelete(inv.id)}
                            title="Delete invoice"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {modalOpen && (
        <InvoiceModal
          existingInvoice={editingInvoice}
          onClose={() => {
            setModalOpen(false);
            setEditingInvoice(null);
          }}
          onSaved={(savedInvoice) => {
            setInvoices((prev) => {
              const idx = prev.findIndex((i) => i.id === savedInvoice.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = savedInvoice;
                return updated;
              }
              return [savedInvoice, ...prev];
            });
          }}
        />
      )}
    </div>
  );
}
