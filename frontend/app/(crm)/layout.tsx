'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import LeadFormModal from '@/components/leads/LeadFormModal';

const GrowpidoLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M200 24 C280 24, 355 46, 355 46 C355 46, 355 190, 355 240 C355 330, 200 436, 200 436 C200 436, 45 330, 45 240 C45 190, 45 46, 45 46 C45 46, 120 24, 200 24 Z"
      fill="none"
      stroke="#0E56C4"
      strokeWidth="26"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M112 322 L222 178 L168 186 L248 94 L288 238 L246 198 L138 340 Z" fill="#0E56C4" />
    <path d="M125 364 L212 254 L212 292 L146 380 Z" fill="#0E56C4" />
    <path d="M165 396 L212 334 L212 368 L186 404 Z" fill="#0E56C4" />
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
    href: '/clients',
    label: 'Current Clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
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
  {
    href: '/invoices',
    label: 'Invoices',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: '/content-strategist',
    label: 'Content Strategist',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle>
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
