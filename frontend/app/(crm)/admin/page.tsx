'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import type { Tenant } from '@/lib/types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  starter: { bg: 'rgba(107,114,128,0.1)', text: '#6B7280' },
  professional: { bg: 'rgba(74,144,217,0.1)', text: '#4A90D9' },
  enterprise: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B' },
};

type Modal = 'create_tenant' | 'create_admin' | null;

export default function SuperAdminPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Forms
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '', plan: 'starter' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', designation: '', department: '' });

  useEffect(() => {
    if (currentUser?.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    loadTenants();
  }, [currentUser, router]);

  async function loadTenants() {
    setLoading(true);
    try {
      const res = await tenantsApi.list();
      setTenants(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTenant() {
    if (!tenantForm.name || !tenantForm.slug) { setError('Name and slug are required'); return; }
    setSaving(true); setError('');
    try {
      await tenantsApi.create({ name: tenantForm.name, slug: tenantForm.slug, plan: tenantForm.plan });
      setModal(null);
      setTenantForm({ name: '', slug: '', plan: 'starter' });
      loadTenants();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Failed to create tenant');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAdmin() {
    if (!adminForm.name || !adminForm.email || !adminForm.password) { setError('Name, email, and password are required'); return; }
    setSaving(true); setError('');
    try {
      await tenantsApi.createAdmin(selectedTenantId, {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
        role: 'admin',
        designation: adminForm.designation,
        department: adminForm.department,
      });
      setModal(null);
      setAdminForm({ name: '', email: '', password: '', designation: '', department: '' });
      loadTenants();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTenant(tenant: Tenant) {
    await tenantsApi.update(tenant.id, { is_active: !tenant.is_active });
    loadTenants();
  }

  const totalUsers = tenants.reduce((sum, t) => sum + (t.user_count || 0), 0);
  const totalLeads = tenants.reduce((sum, t) => sum + (t.lead_count || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
          Super Admin Panel
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          System-wide tenant and user management
        </p>
      </div>

      {/* System Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Tenants', value: tenants.length },
          { label: 'Active Tenants', value: tenants.filter(t => t.is_active).length, color: 'var(--color-success)' },
          { label: 'Total Users', value: totalUsers, color: 'var(--brand-primary)' },
          { label: 'Total Leads', value: totalLeads },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: s.color || 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tenants Table */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Tenants</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>All registered organizations</div>
          </div>
          <button
            onClick={() => { setModal('create_tenant'); setError(''); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
              background: 'var(--brand-primary)', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Tenant
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No tenants yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Organization', 'Slug', 'Plan', 'Users', 'Leads', 'Created', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const planStyle = PLAN_COLORS[t.plan] || PLAN_COLORS.starter;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{t.name}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{t.slug}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: planStyle.bg, color: planStyle.text, textTransform: 'capitalize' }}>
                          {t.plan}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{t.user_count ?? 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{t.lead_count ?? 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(t.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          background: t.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: t.is_active ? '#10B981' : '#EF4444',
                        }}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setSelectedTenantId(t.id); setModal('create_admin'); setError(''); }}
                            style={{
                              padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                              background: 'var(--bg-surface)', color: 'var(--brand-primary)',
                              border: '1px solid var(--border)', cursor: 'pointer',
                            }}
                          >
                            Add Admin
                          </button>
                          <button
                            onClick={() => handleToggleTenant(t)}
                            style={{
                              padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                              background: t.is_active ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                              color: t.is_active ? 'var(--color-danger)' : 'var(--color-success)',
                              border: 'none', cursor: 'pointer',
                            }}
                          >
                            {t.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Modals */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}
          onClick={() => setModal(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 20px' }}>
              {modal === 'create_tenant' ? 'Create New Tenant' : `Add Admin to ${tenants.find(t => t.id === selectedTenantId)?.name || 'Tenant'}`}
            </h2>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '7px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '13px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            {modal === 'create_tenant' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Organization Name', key: 'name', placeholder: 'e.g. Acme Corp' },
                  { label: 'Slug (URL-safe)', key: 'slug', placeholder: 'e.g. acme-corp' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input
                      className="input"
                      placeholder={f.placeholder}
                      value={tenantForm[f.key as 'name' | 'slug']}
                      onChange={e => setTenantForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Plan</label>
                  <select className="input" value={tenantForm.plan} onChange={e => setTenantForm(fm => ({ ...fm, plan: e.target.value }))}>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            )}

            {modal === 'create_admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Full Name', key: 'name', placeholder: 'e.g. John Smith', type: 'text' },
                  { label: 'Email Address', key: 'email', placeholder: 'e.g. john@company.com', type: 'email' },
                  { label: 'Password', key: 'password', placeholder: 'Minimum 8 characters', type: 'password' },
                  { label: 'Designation (optional)', key: 'designation', placeholder: 'e.g. CRM Manager', type: 'text' },
                  { label: 'Department (optional)', key: 'department', placeholder: 'e.g. Sales', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input
                      className="input"
                      type={f.type}
                      placeholder={f.placeholder}
                      value={adminForm[f.key as keyof typeof adminForm]}
                      onChange={e => setAdminForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={modal === 'create_tenant' ? handleCreateTenant : handleCreateAdmin}
                disabled={saving}
                style={{
                  flex: 1, padding: '9px', borderRadius: '7px', fontSize: '13px', fontWeight: 700,
                  background: 'var(--brand-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setModal(null)}
                style={{
                  padding: '9px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                  background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
