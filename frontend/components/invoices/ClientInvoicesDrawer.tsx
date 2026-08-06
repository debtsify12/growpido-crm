'use client';

import { useState, useEffect } from 'react';
import { Lead, Invoice, InvoiceStatus } from '@/lib/types';
import { invoicesApi } from '@/lib/api';

interface ClientInvoicesDrawerProps {
  client: Lead | null;
  onClose: () => void;
  onOpenInvoiceModal: (client: Lead, invoice?: Invoice) => void;
}

export default function ClientInvoicesDrawer({
  client,
  onClose,
  onOpenInvoiceModal,
}: ClientInvoicesDrawerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    loadInvoices();
  }, [client]);

  async function loadInvoices() {
    if (!client) return;
    try {
      setLoading(true);
      const res = await invoicesApi.byClient(client.id);
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load client invoices', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(invoiceId: string, newStatus: InvoiceStatus) {
    try {
      setUpdatingId(invoiceId);
      const res = await invoicesApi.update(invoiceId, { status: newStatus });
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? res.data : inv)));
    } catch (err) {
      console.error('Failed to update invoice status', err);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(invoiceId: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoicesApi.delete(invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (err) {
      console.error('Failed to delete invoice', err);
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadgeClass = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return 'badge-success';
      case 'Sent':
        return 'badge-info';
      case 'Overdue':
        return 'badge-danger';
      case 'Cancelled':
        return 'badge-secondary';
      default:
        return 'badge-warning';
    }
  };

  if (!client) return null;

  const totalBilled = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((acc, i) => acc + i.total_amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((acc, i) => acc + i.total_amount, 0);
  const totalPending = totalBilled - totalPaid;

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="drawer-content"
        style={{
          width: '560px',
          maxWidth: '90vw',
          background: 'var(--bg-card)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Client Billing & Invoices
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>
              {client.company_name || client.full_name}
            </h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Financial KPI stats */}
        <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Invoiced</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalBilled)}</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Collected</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success, #10b981)' }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Outstanding</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: totalPending > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{formatCurrency(totalPending)}</div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Invoice History ({invoices.length})
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onOpenInvoiceModal(client)}
          >
            + Create New Invoice
          </button>
        </div>

        {/* Invoice List */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>No invoices generated yet</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>
                Click below to auto-generate the first invoice from the client retainer.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenInvoiceModal(client)}
              >
                Generate First Invoice
              </button>
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{inv.invoice_number}</span>
                    <span className={`badge ${getStatusBadgeClass(inv.status)}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                      {inv.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatCurrency(inv.total_amount)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div>Issued: {new Date(inv.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div>Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'On Receipt'}</div>
                </div>

                {/* Items preview snippet */}
                {inv.items && inv.items.length > 0 && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    {inv.items.map((it) => it.description).join(', ')}
                  </div>
                )}

                {/* Card Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {inv.status !== 'Paid' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                        disabled={updatingId === inv.id}
                        onClick={() => handleStatusChange(inv.id, 'Paid')}
                      >
                        ✓ Mark Paid
                      </button>
                    )}
                    {inv.status === 'Draft' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        disabled={updatingId === inv.id}
                        onClick={() => handleStatusChange(inv.id, 'Sent')}
                      >
                        Mark Sent
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => onOpenInvoiceModal(client, inv)}
                    >
                      View / Edit / PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(inv.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
