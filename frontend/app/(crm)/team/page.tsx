'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { peopleApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import type { User } from '@/lib/types';

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B' },
  admin: { bg: 'rgba(74,144,217,0.1)', text: '#4A90D9' },
  member: { bg: 'rgba(16,185,129,0.1)', text: '#10B981' },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'Member',
};

const AVATAR_COLORS = [
  '#4A90D9', '#7C6ED9', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#F97316',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function TeamPage() {
  const { user: currentUser } = useAuthStore();
  const [people, setPeople] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    Promise.all([
      peopleApi.list(),
      peopleApi.departments(),
    ]).then(([pRes, dRes]) => {
      setPeople(pRes.data);
      setDepartments(dRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = people.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.designation || '').toLowerCase().includes(q) ||
      (p.employee_id || '').toLowerCase().includes(q);
    const matchDept = !filterDept || p.department === filterDept;
    const matchRole = !filterRole || p.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  // Group by department
  const grouped: Record<string, User[]> = {};
  filtered.forEach(p => {
    const dept = p.department || 'Unassigned';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(p);
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>Team Directory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{people.length} member{people.length !== 1 ? 's' : ''} in your organization</p>
        </div>
        {canManage && (
          <Link href="/settings?tab=team" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'var(--brand-primary)', color: '#fff', textDecoration: 'none',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Member
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input"
            placeholder="Search by name, email, designation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
        </div>
        <select className="input" value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-strong)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Loading team...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No team members found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, members]) => (
            <div key={dept}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{dept}</div>
                <div style={{ height: '1px', flex: 1, background: 'var(--border)' }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{members.length}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {members.map(person => {
                  const color = avatarColor(person.name);
                  const roleStyle = ROLE_COLORS[person.role] || ROLE_COLORS.member;
                  return (
                    <Link
                      key={person.id}
                      href={`/team/${person.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="card" style={{
                        padding: '16px 18px', cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          {/* Avatar */}
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '10px',
                            background: color + '18',
                            border: `1.5px solid ${color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700, color, flexShrink: 0,
                          }}>
                            {initials(person.name)}
                          </div>
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {person.name}
                              </div>
                              <span style={{
                                display: 'inline-block', padding: '1px 7px', borderRadius: '4px',
                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                                background: roleStyle.bg, color: roleStyle.text, flexShrink: 0,
                              }}>
                                {ROLE_LABELS[person.role]}
                              </span>
                            </div>
                            {person.designation && (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                {person.designation}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {person.email}
                              </div>
                              {person.employee_id && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {person.employee_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {person.phone && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {person.phone}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
