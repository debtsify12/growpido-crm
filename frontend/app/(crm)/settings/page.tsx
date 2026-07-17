'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '@/lib/api';
import { User } from '@/lib/types';
import { format } from 'date-fns';

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await usersApi.create(form as { name: string; email: string; password: string; role: string });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'member' });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Team members & access control</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Invite Team Member'}
        </button>
      </div>

      {/* Invite Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header"><h3 className="card-title">New Team Member</h3></div>
          <form onSubmit={handleCreate}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && <div className="login-error">{error}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" required placeholder="Priya Sharma" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" required placeholder="priya@growpido.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" required placeholder="Minimum 8 characters" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-control" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="member">Member (own leads only)</option>
                    <option value="admin">Admin (all leads + settings)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Team Members ({users.length})</h3>
        </div>
        {loading ? (
          <div className="loading-page" style={{ minHeight: '200px' }}><div className="spinner" /></div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar avatar-md">
                          {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-muted'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><h3 className="card-title">Role Permissions</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { role: 'Admin', perms: ['View all leads & pipeline', 'Create/edit/delete any lead', 'Manage team members', 'Import & export CSV', 'View all tasks & reports'] },
              { role: 'Member', perms: ['View only assigned leads', 'Create and update leads', 'Manage own tasks', 'View own dashboard data', 'Add notes & update stages'] },
            ].map((r) => (
              <div key={r.role} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>{r.role}</div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {r.perms.map((p) => (
                    <li key={p} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--color-success)' }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
