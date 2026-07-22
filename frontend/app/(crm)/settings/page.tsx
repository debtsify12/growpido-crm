'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import type { User } from '@/lib/types';
import { DEPARTMENTS } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'rgba(74,144,217,0.1)', text: '#4A90D9' },
  member: { bg: 'rgba(16,185,129,0.1)', text: '#10B981' },
};

const AVATAR_COLORS = ['#4A90D9', '#7C6ED9', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'member' as 'admin' | 'member',
  department: '', designation: '', phone: '', employee_id: '', bio: '', join_date: '',
};

type Tab = 'profile' | 'team';

function SettingsContent() {
  const { user: currentUser, setAuth } = useAuthStore();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get('tab') as Tab) || 'profile';

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile edit form
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    bio: currentUser?.bio || '',
    department: currentUser?.department || '',
    designation: currentUser?.designation || '',
    employee_id: currentUser?.employee_id || '',
    newPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const canManageTeam = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (activeTab === 'team' && canManageTeam) {
      loadUsers();
    }
  }, [activeTab, canManageTeam]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.data.filter(u => u.role !== 'super_admin'));
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setForm({ ...EMPTY_FORM });
    setEditingUser(null);
    setError('');
    setShowAddModal(true);
  }

  function openEditModal(user: User) {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role === 'admin' ? 'admin' : 'member',
      department: user.department || '',
      designation: user.designation || '',
      phone: user.phone || '',
      employee_id: user.employee_id || '',
      bio: user.bio || '',
      join_date: user.join_date ? user.join_date.slice(0, 10) : '',
    });
    setEditingUser(user);
    setError('');
    setShowAddModal(true);
  }

  async function handleSaveUser() {
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    if (!editingUser && !form.password) { setError('Password is required for new users'); return; }
    setSaving(true); setError('');
    try {
      if (editingUser) {
        const updateData: Partial<User> = {
          name: form.name,
          role: form.role,
          department: form.department || undefined,
          designation: form.designation || undefined,
          phone: form.phone || undefined,
          employee_id: form.employee_id || undefined,
          bio: form.bio || undefined,
          join_date: form.join_date ? new Date(form.join_date).toISOString() : undefined,
        };
        await usersApi.update(editingUser.id, updateData);
      } else {
        await usersApi.create({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          department: form.department || undefined,
          designation: form.designation || undefined,
          phone: form.phone || undefined,
          employee_id: form.employee_id || undefined,
          bio: form.bio || undefined,
          join_date: form.join_date ? new Date(form.join_date).toISOString() : undefined,
        });
      }
      setShowAddModal(false);
      loadUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }



  async function handleToggleStatus(user: User) {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
    } catch {
      alert('Failed to update status');
    }
  }

  async function handleSaveProfile() {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      const res = await usersApi.update(currentUser.id, {
        name: profileForm.name,
        phone: profileForm.phone || undefined,
        bio: profileForm.bio || undefined,
        department: profileForm.department || undefined,
        designation: profileForm.designation || undefined,
        employee_id: profileForm.employee_id || undefined,
        ...(profileForm.newPassword ? { password: profileForm.newPassword } : {}),
      });
      // Update local store
      const token = localStorage.getItem('growpido_token') || '';
      setAuth(token, res.data);
      setSuccessMsg('Profile updated successfully');
      setProfileForm(f => ({ ...f, newPassword: '' })); // clear password input
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'My Profile' },
    ...(canManageTeam ? [{ key: 'team' as Tab, label: 'Team Members' }] : []),
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Manage your profile and team</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '0' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === t.key ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === t.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Avatar and Header Card */}
          <div className="card" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--brand-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, flexShrink: 0,
            }}>
              {initials(currentUser?.name || '')}
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser?.name}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
                {currentUser?.role === 'super_admin' ? 'Super Administrator' : currentUser?.role === 'admin' ? 'Administrator' : 'Team Member'}
                {currentUser?.department ? ` · ${currentUser.department}` : ''}
              </p>
              <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>Email: <strong style={{ color: 'var(--text-secondary)' }}>{currentUser?.email}</strong></span>
                <span>Employee ID: <strong style={{ color: 'var(--text-secondary)' }}>{currentUser?.employee_id || 'Not assigned'}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            {/* Form Card */}
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '24px', color: 'var(--text-primary)' }}>Personal Information</div>

              {successMsg && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '13.5px', marginBottom: '20px', fontWeight: 500 }}>
                  {successMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                  <input className="form-control" placeholder="Your full name" value={profileForm.name} onChange={e => setProfileForm(fm => ({ ...fm, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Employee ID</label>
                  <input className="form-control" placeholder="e.g. EMP-001" value={profileForm.employee_id} onChange={e => setProfileForm(fm => ({ ...fm, employee_id: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                  <input className="form-control" placeholder="e.g. +91 9876543210" value={profileForm.phone} onChange={e => setProfileForm(fm => ({ ...fm, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Designation</label>
                  <input className="form-control" placeholder="e.g. Sales Executive" value={profileForm.designation} onChange={e => setProfileForm(fm => ({ ...fm, designation: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Department</label>
                  <input className="form-control" placeholder="e.g. Sales" value={profileForm.department} onChange={e => setProfileForm(fm => ({ ...fm, department: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Bio</label>
                  <textarea className="form-control" placeholder="Brief description about yourself" rows={4} value={profileForm.bio} onChange={e => setProfileForm(fm => ({ ...fm, bio: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
              </div>
              
              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSaveProfile} disabled={savingProfile} className="btn btn-primary" style={{ padding: '0 24px', opacity: savingProfile ? 0.7 : 1 }}>
                  {savingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Password Card */}
            <div className="card" style={{ padding: '32px', height: 'max-content' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>Security</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                Update your password to keep your account secure. We recommend using a strong password.
              </p>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>New Password</label>
                <input type="password" className="form-control" placeholder="Minimum 8 characters" value={profileForm.newPassword} onChange={e => setProfileForm(fm => ({ ...fm, newPassword: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && canManageTeam && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{users.length} team member{users.length !== 1 ? 's' : ''}</div>
            <button
              onClick={openAddModal}
              className="btn btn-primary"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Member
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Member', 'Role', 'Department', 'Designation', 'Employee ID', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const color = avatarColor(u.name);
                    const roleStyle = ROLE_COLORS[u.role] || ROLE_COLORS.member;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: u.is_active ? 1 : 0.5 }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                              background: color + '18', border: `1.5px solid ${color}30`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 700, color,
                            }}>
                              {initials(u.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{u.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: roleStyle.bg, color: roleStyle.text, textTransform: 'capitalize' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{u.designation || '—'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{u.employee_id || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer' }}>
                            <div style={{
                              position: 'relative', width: '36px', height: '20px',
                              background: u.is_active ? 'var(--color-success)' : 'var(--text-muted)',
                              borderRadius: '20px', transition: 'background 0.2s', opacity: u.id === currentUser?.id ? 0.5 : 1
                            }}>
                              <div style={{
                                position: 'absolute', top: '2px', left: u.is_active ? '18px' : '2px',
                                width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                            <input 
                              type="checkbox" 
                              style={{ display: 'none' }} 
                              checked={u.is_active} 
                              disabled={u.id === currentUser?.id}
                              onChange={() => handleToggleStatus(u)} 
                            />
                            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: u.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => openEditModal(u)}
                              style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                            >
                              Edit
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
      )}

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '520px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 20px' }}>
              {editingUser ? `Edit ${editingUser.name}` : 'Add Team Member'}
            </h2>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '7px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '13px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input className="form-control" placeholder="e.g. John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                <input className="form-control" type="email" placeholder="e.g. john@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editingUser} />
              </div>
              {!editingUser && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Password *</label>
                  <input className="form-control" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              )}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'member' }))}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Employee ID</label>
                <input className="form-control" placeholder="e.g. EMP-005" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Department</label>
                <select className="form-control" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Designation</label>
                <input className="form-control" placeholder="e.g. Sales Executive" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
                <input className="form-control" placeholder="e.g. +91 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Joining Date</label>
                <input className="form-control" type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Bio</label>
                <textarea className="form-control" placeholder="Short bio (optional)" rows={2} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="btn btn-primary"
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : editingUser ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="page-container"><div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Settings...</div></div>}>
      <SettingsContent />
    </Suspense>
  );
}
