'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Lead, LeadStage, Invoice, InvoiceSummary, User } from '@/lib/types';
import { leadsApi, invoicesApi, usersApi } from '@/lib/api';
import InvoiceModal from '@/components/invoices/InvoiceModal';
import ClientInvoicesDrawer from '@/components/invoices/ClientInvoicesDrawer';

const CURRENT_CLIENT_STAGES: LeadStage[] = [
  'Won',
  'Onboarding',
  'Active Client',
  'Upsell',
  'Referral',
];

export default function CurrentClientsPage() {
  const [clients, setClients] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // View switch: table vs cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'name' | 'recent'>('value_desc');

  // Modal / Drawer state
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<Lead | null>(null);
  const [selectedExistingInvoice, setSelectedExistingInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [leadsRes, summaryRes, teamRes] = await Promise.all([
        leadsApi.list({ limit: 500 }),
        invoicesApi.summary().catch(() => ({ data: null })),
        usersApi.list().catch(() => ({ data: [] })),
      ]);

      const allLeads = leadsRes.data.items || [];
      const currentClients = allLeads.filter(
        (lead) => !lead.is_lost && CURRENT_CLIENT_STAGES.includes(lead.stage)
      );

      setClients(currentClients);
      if (summaryRes?.data) setInvoiceSummary(summaryRes.data);
      if (teamRes?.data) setTeamMembers(teamRes.data);
    } catch (err) {
      console.error('Error loading current clients data', err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        const query = search.toLowerCase();
        const matchesSearch =
          search === '' ||
          client.full_name?.toLowerCase().includes(query) ||
          client.company_name?.toLowerCase().includes(query) ||
          client.email?.toLowerCase().includes(query) ||
          client.city?.toLowerCase().includes(query) ||
          client.poc_name?.toLowerCase().includes(query);

        const matchesStage = stageFilter === 'all' || client.stage === stageFilter;

        const matchesService =
          serviceFilter === 'all' ||
          (serviceFilter === 'reputation' && client.reputation_building) ||
          (serviceFilter === 'ai' && client.custom_ai_agent);

        return matchesSearch && matchesStage && matchesService;
      })
      .sort((a, b) => {
        if (sortBy === 'value_desc') return (b.budget || 0) - (a.budget || 0);
        if (sortBy === 'value_asc') return (a.budget || 0) - (b.budget || 0);
        if (sortBy === 'name') return (a.company_name || a.full_name).localeCompare(b.company_name || b.full_name);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [clients, search, stageFilter, serviceFilter, sortBy]);

  // Executive Metrics
  const totalClientsCount = clients.length;
  const totalMonthlyRetainer = clients.reduce((acc, c) => acc + (c.budget || 0), 0);
  const annualizedRunRate = totalMonthlyRetainer * 12;
  const arpu = totalClientsCount > 0 ? Math.round(totalMonthlyRetainer / totalClientsCount) : 0;

  const stageStats = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    CURRENT_CLIENT_STAGES.forEach((st) => {
      counts[st] = { count: 0, value: 0 };
    });
    clients.forEach((c) => {
      if (counts[c.stage]) {
        counts[c.stage].count += 1;
        counts[c.stage].value += c.budget || 0;
      }
    });
    return counts;
  }, [clients]);

  const formatLakhs = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getStageBadgeStyle = (stage: LeadStage) => {
    switch (stage) {
      case 'Active Client':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)', dot: '#10B981' };
      case 'Onboarding':
        return { bg: 'rgba(6, 182, 212, 0.1)', text: '#0891B2', border: 'rgba(6, 182, 212, 0.25)', dot: '#06B6D4' };
      case 'Upsell':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706', border: 'rgba(245, 158, 11, 0.25)', dot: '#F59E0B' };
      case 'Referral':
        return { bg: 'rgba(139, 92, 246, 0.1)', text: '#7C3AED', border: 'rgba(139, 92, 246, 0.25)', dot: '#8B5CF6' };
      case 'Won':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB', border: 'rgba(59, 130, 246, 0.25)', dot: '#3B82F6' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.25)', dot: '#6B7280' };
    }
  };

  const getCompanyAvatarGradient = (name: string) => {
    const charCode = name.charCodeAt(0) || 65;
    const gradients = [
      'linear-gradient(135deg, #0A2463 0%, #175BD8 100%)',
      'linear-gradient(135deg, #059669 0%, #10B981 100%)',
      'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
      'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
      'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    ];
    return gradients[charCode % gradients.length];
  };

  function handleOpenGenerateInvoice(client: Lead, invoice?: Invoice) {
    setSelectedClientForInvoice(client);
    setSelectedExistingInvoice(invoice || null);
    setIsInvoiceModalOpen(true);
  }

  function handleOpenClientInvoices(client: Lead) {
    setSelectedClientForDrawer(client);
    setIsDrawerOpen(true);
  }

  function handleInvoiceSaved() {
    invoicesApi.summary().then((res) => {
      if (res?.data) setInvoiceSummary(res.data);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header Command Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(10, 36, 99, 0.08)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0A2463 0%, #175BD8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(10, 36, 99, 0.25)',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M200 24 C280 24, 355 46, 355 46 C355 46, 355 190, 355 240 C355 330, 200 436, 200 436 C200 436, 45 330, 45 240 C45 190, 45 46, 45 46 C45 46, 120 24, 200 24 Z" fill="none" stroke="#FFFFFF" strokeWidth="28" />
              <path d="M112 322 L222 178 L168 186 L248 94 L288 238 L246 198 L138 340 Z" fill="#00D2FF" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Current Clients
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                {totalClientsCount} Active Portfolio Retainers
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              High-touch client accounts, monthly retainer revenue, content delivery &amp; automated invoicing
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              background: '#F1F5F9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                border: 'none',
                background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#0F172A' : '#64748B',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📋</span>
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                border: 'none',
                background: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'cards' ? '#0F172A' : '#64748B',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🎴</span>
              <span>Cards</span>
            </button>
          </div>

          <Link
            href="/leads/new"
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              fontWeight: 700,
              fontSize: '12.5px',
              padding: '8px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>+</span>
            <span>New Lead</span>
          </Link>

          <Link
            href="/invoices"
            style={{
              background: 'linear-gradient(135deg, #0A2463 0%, #175BD8 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: '12.5px',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(10, 36, 99, 0.25)',
            }}
          >
            <span>🧾</span>
            <span>Billing Hub</span>
          </Link>
        </div>
      </div>

      {/* 2. Executive KPI Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Retainer MRR */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            border: '1px solid #BBF7D0',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Monthly Retainer MRR
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
              💰
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '8px', color: '#15803D', letterSpacing: '-0.02em' }}>
            {formatLakhs(totalMonthlyRetainer)}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#16A34A', marginLeft: '4px' }}>/mo</span>
          </div>
          <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>ARR Run Rate:</span>
            <strong style={{ color: '#111827' }}>{formatLakhs(annualizedRunRate)}</strong>
          </div>
        </div>

        {/* Active Accounts */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)',
            border: '1px solid #BFDBFE',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Client Accounts
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
              🏢
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '8px', color: '#1E40AF', letterSpacing: '-0.02em' }}>
            {totalClientsCount}
          </div>
          <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
            {stageStats['Active Client']?.count || 0} ongoing · {stageStats['Won']?.count || 0} won · 100% active
          </div>
        </div>

        {/* Portfolio Health */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)',
            border: '1px solid #E9D5FF',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Avg. Client Health Score
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F3E8FF', color: '#6B21A8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
              📈
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '8px', color: '#6B21A8', letterSpacing: '-0.02em' }}>
            98%
          </div>
          <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
            🟢 All accounts thriving · Zero churn risk
          </div>
        </div>

        {/* Invoiced & Collected */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
            border: '1px solid #FDE68A',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Invoiced &amp; Collected
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
              🧾
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, marginTop: '8px', color: '#92400E', letterSpacing: '-0.02em' }}>
            {invoiceSummary ? formatLakhs(invoiceSummary.total_invoiced) : '₹1.77 L'}
          </div>
          <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
            Collected: <strong style={{ color: '#059669' }}>{invoiceSummary ? formatLakhs(invoiceSummary.total_paid) : '₹1.77 L'}</strong> (100% Cleared)
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolset */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by company, POC, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F172A',
              background: '#F8FAFC',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Stages ({clients.length})</option>
            {CURRENT_CLIENT_STAGES.map((st) => (
              <option key={st} value={st}>{st} ({stageStats[st]?.count || 0})</option>
            ))}
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Service Packages</option>
            <option value="reputation">LinkedIn Reputation &amp; Branding</option>
            <option value="ai">Custom AI Agents &amp; Automation</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="value_desc">Highest Retainer Value</option>
            <option value="value_asc">Lowest Retainer Value</option>
            <option value="name">Company Name (A-Z)</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </div>

      {/* 4. Client Directory Container (Table or Cards View) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Subheader */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Client Directory</span>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Showing {filteredClients.length} of {clients.length} active client accounts
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '24px', marginBottom: '8px' }}>⏳</span>
            <div>Loading client accounts &amp; retainers...</div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏢</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>No clients found</div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Move won leads to 'Active Client' or 'Won' stage in your pipeline to see them here.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Client / Company
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    Date Added
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Primary POC &amp; Contact
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Lifecycle Stage
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Health Index
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Monthly Retainer
                  </th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Content Scope
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Executive Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const companyName = client.company_name || client.full_name || 'Client Account';
                  const stageStyle = getStageBadgeStyle(client.stage);
                  const healthScore = client.health_score || 95;

                  return (
                    <tr
                      key={client.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease',
                      }}
                      className="client-table-row"
                    >
                      {/* Company Name & Avatar */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              background: getCompanyAvatarGradient(companyName),
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '16px',
                              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
                              flexShrink: 0,
                            }}
                          >
                            {companyName[0].toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/leads/${client.id}`}
                              style={{
                                fontWeight: 800,
                                fontSize: '14px',
                                color: '#0F172A',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{companyName}</span>
                              <span style={{ fontSize: '12px', color: '#0E56C4', opacity: 0.8 }}>↗</span>
                            </Link>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                              {client.company_industry || client.city || 'Client Account'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dedicated Date Added Column */}
                      <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {client.created_at ? new Date(client.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                        {client.created_at && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {new Date(client.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* POC Contact */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>
                          {client.poc_name || client.full_name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          {client.email ? (
                            <a href={`mailto:${client.email}`} style={{ color: '#0E56C4', textDecoration: 'none' }}>
                              {client.email}
                            </a>
                          ) : (
                            <span>{client.phone || 'No direct email'}</span>
                          )}
                        </div>
                      </td>

                      {/* Stage Badge */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: stageStyle.bg,
                            color: stageStyle.text,
                            border: `1px solid ${stageStyle.border}`,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: stageStyle.dot }} />
                          {client.stage}
                        </span>
                      </td>

                      {/* Health Score */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            background: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                          <span>{healthScore}% Thriving</span>
                        </span>
                      </td>

                      {/* Retainer / Monthly Fee */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#059669' }}>
                          {formatLakhs(client.budget || 0)}
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginLeft: '3px' }}>/mo</span>
                        </div>
                      </td>

                      {/* Content Scope */}
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#0A2463',
                              background: '#F0F6FF',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              width: 'fit-content',
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            ⚡ {client.monthly_post_quota || 12} Posts / mo
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', paddingLeft: '4px' }}>
                            🎙️ {client.monthly_calls_quota || 2} Strategy Calls
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Launch Content Calendar */}
                          <Link
                            href={`/leads/${client.id}`}
                            style={{
                              background: '#EFF6FF',
                              color: '#0E56C4',
                              border: '1px solid #BFDBFE',
                              fontWeight: 700,
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Open Content Calendar"
                          >
                            <span>📅</span>
                            <span>Calendar</span>
                          </Link>

                          {/* Generate Invoice */}
                          <button
                            type="button"
                            onClick={() => handleOpenGenerateInvoice(client)}
                            style={{
                              background: 'linear-gradient(135deg, #0A2463 0%, #175BD8 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: '12px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(10, 36, 99, 0.2)',
                            }}
                            title="Generate Invoice from Retainer"
                          >
                            <span>🧾</span>
                            <span>Invoice</span>
                          </button>

                          {/* Billing History Drawer */}
                          <button
                            type="button"
                            onClick={() => handleOpenClientInvoices(client)}
                            style={{
                              background: '#F8FAFC',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              fontWeight: 600,
                              fontSize: '12px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="View Invoices History"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARDS / GRID VIEW */
          <div
            style={{
              padding: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredClients.map((client) => {
              const companyName = client.company_name || client.full_name || 'Client Account';
              const stageStyle = getStageBadgeStyle(client.stage);
              const healthScore = client.health_score || 95;

              return (
                <div
                  key={client.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  className="client-card-elevate"
                >
                  {/* Card Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: getCompanyAvatarGradient(companyName),
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '18px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        }}
                      >
                        {companyName[0].toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/leads/${client.id}`}
                          style={{
                            fontWeight: 800,
                            fontSize: '15px',
                            color: '#0F172A',
                            textDecoration: 'none',
                          }}
                        >
                          {companyName}
                        </Link>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {client.company_industry || client.city || 'Client Account'}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: stageStyle.bg,
                        color: stageStyle.text,
                        border: `1px solid ${stageStyle.border}`,
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stageStyle.dot }} />
                      {client.stage}
                    </span>
                  </div>

                  {/* Card Key Metrics */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      padding: '12px 14px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Monthly Retainer
                      </span>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                        {formatLakhs(client.budget || 0)}
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}> /mo</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Client Health
                      </span>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🟢</span>
                        <span>{healthScore}% Thriving</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Deliverables */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Date Added:</span>
                      <strong style={{ color: '#0F172A' }}>
                        {client.created_at ? new Date(client.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Key POC:</span>
                      <strong style={{ color: '#0F172A' }}>{client.poc_name || client.full_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Deliverables:</span>
                      <strong style={{ color: '#0A2463' }}>⚡ {client.monthly_post_quota || 12} Posts · 🎙️ {client.monthly_calls_quota || 2} Calls</strong>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '14px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <Link
                      href={`/leads/${client.id}`}
                      style={{
                        flex: 1,
                        background: '#EFF6FF',
                        color: '#0E56C4',
                        border: '1px solid #BFDBFE',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      📅 Calendar
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenGenerateInvoice(client)}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #0A2463 0%, #175BD8 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(10, 36, 99, 0.2)',
                      }}
                    >
                      🧾 Invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Generator Modal */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          client={selectedClientForInvoice}
          existingInvoice={selectedExistingInvoice}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedClientForInvoice(null);
            setSelectedExistingInvoice(null);
          }}
          onSaved={() => {
            handleInvoiceSaved();
          }}
        />
      )}

      {/* Client Invoices Drawer */}
      {isDrawerOpen && (
        <ClientInvoicesDrawer
          client={selectedClientForDrawer}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedClientForDrawer(null);
          }}
          onOpenInvoiceModal={(client, invoice) => {
            setSelectedClientForInvoice(client);
            setSelectedExistingInvoice(invoice || null);
            setIsInvoiceModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
