/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import type {
  DashboardOverview, PipelineStageData, SourceData,
  StuckLead, TeamPerformance,
} from '@/lib/types';
import { STAGE_COLORS } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const isCurrency = payload[0].dataKey === 'total_value';
    const val = isCurrency ? formatINR(payload[0].value) : payload[0].value;
    const labelText = isCurrency ? 'Value' : 'Count';

    return (
      <div style={{
        background: 'var(--bg-modal)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
        fontSize: '13px'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ color: payload[0].fill }}>
          {labelText}: <span style={{ fontWeight: 600 }}>{val}</span>
        </div>
      </div>
    );
  }
  return null;
}

const PIE_COLORS = ['#0A2463', '#244494', '#3E6BDE', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6B7280'];

function StatCard({
  label,
  value,
  sub,
  color,
  trend,
  trendLabel,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = trend !== undefined && trend >= 0;
  return (
    <div className="card" style={{ padding: '20px 24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
        {trend !== undefined && (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            background: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isPositive ? '#059669' : '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div 
        title={String(value)}
        style={{ 
          fontSize: 'clamp(16px, 1.8vw, 24px)', 
          fontWeight: 700, 
          color: color || 'var(--text-primary)', 
          lineHeight: 1,
          wordBreak: 'break-word',
          letterSpacing: '-0.02em'
        }}
      >
        {value}
      </div>
      {(sub || trendLabel) && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{sub}</span>
          {trendLabel && <span style={{ opacity: 0.8 }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

const STAGE_SHORT: Record<string, string> = {
  'New Lead': 'New Lead',
  'Discovery Call Booked': 'Discovery Call',
  'Discovery Done': 'Discovery Done',
  'Proposal Sent': 'Proposal Sent',
  'Negotiation': 'Negotiation',
  'Won': 'Won',
  'Onboarding': 'Onboarding',
  'Active Client': 'Active Client',
  'Disqualified': 'Disqualified',
  'Referral': 'Referral',
  'Lost': 'Lost',
};

function formatINR(n: number) {
  if (!n || isNaN(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStageData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [stuck, setStuck] = useState<StuckLead[]>([]);
  const [team, setTeam] = useState<TeamPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'leads' | 'personas' | 'team' | null; processing: boolean }>({ isOpen: false, type: null, processing: false });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; isError: boolean }>({ isOpen: false, message: '', isError: false });

  useEffect(() => {
    Promise.all([
      dashboardApi.overview(),
      dashboardApi.pipelineByStage(),
      dashboardApi.sourceBreakdown(),
      dashboardApi.stuckLeads(7),
      dashboardApi.teamPerformance(),
    ]).then(([ov, pp, src, sk, tm]) => {
      setOverview(ov.data);
      
      // format pipeline for recharts
      const formattedPipeline = pp.data.map(p => ({
        name: STAGE_SHORT[p.stage] || p.stage,
        originalStage: p.stage,
        count: p.count,
        total_value: p.total_value,
        fill: STAGE_COLORS[p.stage as keyof typeof STAGE_COLORS] || '#6B7280'
      }));
      setPipeline(formattedPipeline as any);
      
      setSources(src.data);
      setStuck(sk.data);
      setTeam(tm.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-strong)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const handleClearData = (type: 'leads' | 'personas' | 'team') => {
    setConfirmModal({ isOpen: true, type, processing: false });
  };

  const executeClearData = async () => {
    const type = confirmModal.type;
    if (!type) return;
    
    setConfirmModal(prev => ({ ...prev, processing: true }));
    try {
      await dashboardApi.clearData({
        leads: type === 'leads',
        personas: type === 'personas',
        team: type === 'team',
      });
      setConfirmModal({ isOpen: false, type: null, processing: false });
      setAlertModal({ isOpen: true, message: `All ${type} cleared successfully.`, isError: false });
    } catch (error) {
      console.error('Clear data failed:', error);
      setConfirmModal({ isOpen: false, type: null, processing: false });
      setAlertModal({ isOpen: true, message: `Failed to clear ${type}.`, isError: true });
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          {user?.role === 'super_admin'
            ? 'System-wide overview across all tenants'
            : user?.role === 'admin'
            ? `Overview for your organization`
            : `Your personal performance overview`}
        </p>
      </div>

      {/* Main Revenue & Client KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatCard
          label="Active Clients"
          value={overview?.current_clients ?? 0}
          sub="Clients in Won, Onboarding, Active"
          color="#0E56C4"
          trend={overview?.clients_growth}
          trendLabel="vs last month"
        />
        <StatCard
          label="Monthly Retainer (MRR)"
          value={overview?.monthly_retainer ? formatINR(overview.monthly_retainer) : '₹0'}
          sub="Recurring monthly budget"
          color="#10B981"
          trend={overview?.mrr_growth}
          trendLabel="vs last month"
        />
        <StatCard
          label="Total Invoiced"
          value={overview?.total_invoiced ? formatINR(overview.total_invoiced) : '₹0'}
          sub={`${overview?.total_invoices_count ?? 0} total invoices`}
          color="var(--text-primary)"
          trend={overview?.invoiced_growth}
          trendLabel="vs last month"
        />
        <StatCard
          label="Paid Invoices"
          value={overview?.total_paid_invoices ? formatINR(overview.total_paid_invoices) : '₹0'}
          sub={`${overview?.paid_invoices_count ?? 0} invoices cleared`}
          color="#10B981"
        />
        <StatCard
          label="Overdue Invoices"
          value={overview?.total_overdue_invoices ? formatINR(overview.total_overdue_invoices) : '₹0'}
          sub={`${overview?.overdue_invoices_count ?? 0} invoices overdue`}
          color="#EF4444"
        />
      </div>

      {/* Secondary Pipeline & Activity KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <StatCard
          label="Total Leads"
          value={overview?.total_leads ?? 0}
          trend={overview?.leads_growth}
          trendLabel="vs last month"
        />
        <StatCard label="Active Pipeline" value={overview?.active_leads ?? 0} color="var(--brand-primary)" />
        <StatCard label="Won Deals" value={overview?.won_leads ?? 0} color="var(--color-success)" />
        <StatCard label="Lost Deals" value={overview?.lost_leads ?? 0} color="var(--color-danger)" />
        <StatCard
          label="Pipeline Value"
          value={overview?.total_pipeline_value ? formatINR(overview.total_pipeline_value) : '₹0'}
          color="var(--color-warning)"
        />
        <StatCard
          label="Overdue Tasks"
          value={overview?.overdue_tasks ?? 0}
          color={overview?.overdue_tasks ? 'var(--color-danger)' : 'var(--text-primary)'}
        />
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <>
            <StatCard label="Team Members" value={overview?.team_size ?? 0} />
            <StatCard label="Personas / Skills" value={overview?.total_personas ?? 0} color="var(--color-info)" />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Pipeline by Stage Bar Chart */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader title="Leads by Stage" sub="Interactive pipeline count" />
          <div style={{ flex: 1, minHeight: '300px', width: '100%', marginTop: '10px' }}>
            {pipeline.length > 0 && pipeline.some(p => p.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    tickMargin={5}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {pipeline.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', paddingTop: '40px', textAlign: 'center' }}>
                No lead data yet.
              </div>
            )}
          </div>
        </div>

        {/* Lead Sources Pie Chart */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader title="Lead Sources" sub="Distribution of incoming leads" />
          <div style={{ flex: 1, minHeight: '300px', width: '100%', marginTop: '10px' }}>
            {sources.length > 0 && sources.some(s => s.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={sources}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="source"
                  >
                    {sources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', paddingTop: '40px', textAlign: 'center' }}>
                No source data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Performance */}
      {(user?.role === 'admin' || user?.role === 'super_admin') && team.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <SectionHeader title="Team Performance" sub="Lead and task breakdown per team member" />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Member', 'Designation', 'Total Leads', 'Open', 'Won', 'Tasks Done', 'Pending', 'Overdue'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      textAlign: h === 'Member' || h === 'Designation' ? 'left' : 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/team/${t.user_id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: 'var(--bg-surface)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', flexShrink: 0,
                          }}>
                            {initials(t.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{t.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.employee_id || t.email}</div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t.designation || t.department || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>{t.total_leads}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--brand-primary)' }}>{t.open_leads}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>{t.won_leads}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-success)' }}>{t.completed_tasks}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>{t.pending_tasks}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                        fontSize: '12px', fontWeight: 600,
                        background: t.overdue_tasks > 0 ? 'var(--color-danger-bg)' : 'transparent',
                        color: t.overdue_tasks > 0 ? 'var(--color-danger)' : 'var(--text-muted)',
                      }}>
                        {t.overdue_tasks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Pipeline Value by Stage */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader title="Pipeline Value by Stage" sub="Expected revenue across pipeline" />
          <div style={{ flex: 1, minHeight: '300px', width: '100%', marginTop: '10px' }}>
            {pipeline.length > 0 && pipeline.some(p => p.total_value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    tickMargin={5}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis 
                    tickFormatter={(val) => formatINR(val)}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.4 }} />
                  <Bar dataKey="total_value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {pipeline.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', paddingTop: '40px', textAlign: 'center' }}>
                No revenue data yet.
              </div>
            )}
          </div>
        </div>

        {/* Stuck Leads Summary */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Stuck Leads (7+ days)
            </h2>
            <div style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
              {stuck.length}
            </div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {stuck.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Lead', 'Stage', 'Days', 'Action'].map(h => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          textAlign: h === 'Action' || h === 'Days' ? 'center' : 'left',
                          fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: 'var(--text-muted)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stuck.slice(0, 5).map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, fontSize: '13px' }}>{s.full_name}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: (STAGE_COLORS[s.stage as keyof typeof STAGE_COLORS] || '#6B7280') + '18',
                            color: STAGE_COLORS[s.stage as keyof typeof STAGE_COLORS] || '#6B7280',
                          }}>
                            {STAGE_SHORT[s.stage] || s.stage}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                            background: s.days_stuck >= 14 ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                            color: s.days_stuck >= 14 ? 'var(--color-danger)' : 'var(--color-warning)',
                          }}>
                            {s.days_stuck}d
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Link href={`/leads/${s.id}`} style={{
                            display: 'inline-block', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 600, background: 'var(--bg-surface)',
                            color: 'var(--brand-primary)', border: '1px solid var(--border)', textDecoration: 'none',
                          }}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stuck.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <Link href="/leads?stuck=true" style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      View all {stuck.length} stuck leads
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  No stuck leads! Great pipeline hygiene.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {(user?.role === 'admin' || user?.role === 'super_admin') && (
        <div className="card" style={{ padding: '20px 24px', border: '1px solid var(--color-danger-bg)' }}>
          <SectionHeader title="Danger Zone (Admin Only)" sub="Permanently delete data from your workspace" />
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => handleClearData('leads')}
              style={{
                background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '6px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}>
              Delete All Leads
            </button>
            <button 
              onClick={() => handleClearData('personas')}
              style={{
                background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '6px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}>
              Delete All Personas/Skills
            </button>
            <button 
              onClick={() => handleClearData('team')}
              style={{
                background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '6px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}>
              Delete All Team Members
            </button>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-modal, #fff)',
            borderRadius: '8px', padding: '24px', maxWidth: '400px', width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Are you sure you want to delete all {confirmModal.type}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setConfirmModal({ isOpen: false, type: null, processing: false })}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'
                }}
                disabled={confirmModal.processing}
              >
                Cancel
              </button>
              <button 
                onClick={executeClearData}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: 'var(--color-danger, #ef4444)', color: '#fff', cursor: 'pointer',
                  opacity: confirmModal.processing ? 0.7 : 1
                }}
                disabled={confirmModal.processing}
              >
                {confirmModal.processing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--bg-modal, #fff)',
            borderRadius: '8px', padding: '24px', maxWidth: '400px', width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 600, color: alertModal.isError ? 'var(--color-danger, #ef4444)' : 'var(--brand-primary, #10b981)' }}>
              {alertModal.isError ? 'Error' : 'Success'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              {alertModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setAlertModal({ isOpen: false, message: '', isError: false });
                  if (!alertModal.isError) window.location.reload();
                }}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none',
                  background: 'var(--brand-primary, #10b981)', color: '#fff', cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
