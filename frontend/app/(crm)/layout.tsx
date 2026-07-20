'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import LeadFormModal from '@/components/leads/LeadFormModal';

const GrowpidoLogo = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M50 5C50 5 15 15 15 15C15 15 15 50 15 55C15 75 50 95 50 95C50 95 85 75 85 55C85 50 85 15 85 15C85 15 50 5 50 5Z"
      fill="#4A90D9"
      fillOpacity="0.12"
      stroke="#4A90D9"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M35 65L55 35" stroke="#4A90D9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M55 35L65 25" stroke="#4A90D9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M55 25H67V37" stroke="#4A90D9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 70L38 60" stroke="#4A90D9" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const WORKSPACE_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/pipeline',
    label: 'Pipeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'All Leads',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'My Tasks',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    href: '/team',
    label: 'Team',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
];

const ADMIN_ITEMS = [
  {
    href: '/settings',
    label: 'Settings',
    roles: ['admin', 'super_admin', 'member'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Super Admin',
    roles: ['super_admin'],
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  member: 'Team Member',
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'GP';

  function handleLogout() {
    document.cookie = 'growpido_token=; path=/; max-age=0';
    logout();
    router.push('/login');
  }

  const allNavItems = [...WORKSPACE_ITEMS, ...ADMIN_ITEMS];
  const currentRouteName = allNavItems.find((item) => pathname.startsWith(item.href))?.label || 'Workspace';

  const visibleAdminItems = ADMIN_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user?.role || 'member')
  );

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo" style={{
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          alignItems: 'center',
          gap: isCollapsed ? '16px' : '0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo-icon">
              <GrowpidoLogo size={30} />
            </div>
            {!isCollapsed && <span className="sidebar-logo-text" style={{ fontSize: '20px', fontWeight: 700 }}>Growpido</span>}
          </div>

          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ color: 'var(--text-muted)', width: '28px', height: '28px', padding: 0 }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
              </svg>
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!isCollapsed && <span className="sidebar-section-label">Workspace</span>}

          {WORKSPACE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {!isCollapsed && item.label}
            </Link>
          ))}

          {!isCollapsed && <span className="sidebar-section-label" style={{ marginTop: '12px' }}>System</span>}

          {visibleAdminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {!isCollapsed && item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Click to sign out" style={{ cursor: 'pointer' }}>
            <div className="user-avatar">{initials}</div>
            {!isCollapsed && (
              <>
                <div className="user-info">
                  <div className="user-name">{user?.name || 'User'}</div>
                  <div className="user-role" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: user?.role === 'super_admin' ? '#F59E0B' : user?.role === 'admin' ? '#4A90D9' : '#10B981',
                      flexShrink: 0,
                    }} />
                    {ROLE_LABELS[user?.role || 'member']}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
        <header className={`topbar ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="topbar-breadcrumbs">
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Growpido</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', margin: '0 6px' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{currentRouteName}</span>
          </div>

          <div className="topbar-actions">
            {user?.role !== 'member' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewLeadModal(true)}>
                + New Lead
              </button>
            )}
          </div>
        </header>

        <div className="main-scroll-area">
          {children}
        </div>
      </main>

      {showNewLeadModal && (
        <LeadFormModal
          onClose={() => setShowNewLeadModal(false)}
          onSaved={() => {
            setShowNewLeadModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
