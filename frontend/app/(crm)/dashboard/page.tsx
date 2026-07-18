'use client';

import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  DashboardOverview, PipelineStageData, SourceData, ConversionData, StuckLead, STAGE_COLORS,
} from '@/lib/types';

import { useRouter } from 'next/navigation';

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#F59E0B', '#EF4444', '#10B981', '#06B6D4', '#3B82F6', '#F97316', '#EC4899', '#6B7280'];

const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: {value: number}[]; label?: string}) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>{payload[0].value.toLocaleString('en-IN')}</div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStageData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [stuckLeads, setStuckLeads] = useState<StuckLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [o, p, s, c, sl] = await Promise.all([
        dashboardApi.overview(),
        dashboardApi.pipelineByStage(),
        dashboardApi.sourceBreakdown(),
        dashboardApi.conversionRates(),
        dashboardApi.stuckLeads(7),
      ]);
      setOverview(o.data);
      setPipeline(p.data);
      setSources(s.data);
      setConversions(c.data);
      setStuckLeads(sl.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-page"><div className="spinner" /> Loading dashboard...</div>;

  const pipelineChartData = pipeline.map((p) => ({
    stage: p.stage.split(' ').slice(0, 2).join(' '),
    count: p.count,
    value: Math.round(p.total_value / 1000),
    color: STAGE_COLORS[p.stage as keyof typeof STAGE_COLORS] || '#6366F1',
  }));

  const sourceChartData = sources.filter((s) => s.count > 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Pipeline analytics & performance overview</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, 
              label: 'Total Leads', value: overview.total_leads, color: '#6366F1', bg: 'rgba(99,102,241,0.1)' 
            },
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>, 
              label: 'Active Leads', value: overview.active_leads, color: '#10B981', bg: 'rgba(16,185,129,0.1)' 
            },
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, 
              label: 'Won', value: overview.won_leads, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' 
            },
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>, 
              label: 'Lost', value: overview.lost_leads, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' 
            },
            {
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
              label: 'Pipeline Value',
              value: overview.total_pipeline_value >= 100000
                ? `₹${(overview.total_pipeline_value / 100000).toFixed(1)}L`
                : `₹${(overview.total_pipeline_value / 1000).toFixed(0)}K`,
              color: '#8B5CF6',
              bg: 'rgba(139,92,246,0.1)',
              raw: true,
            },
            { 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>, 
              label: 'Overdue Tasks', value: overview.overdue_tasks, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' 
            },
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background: stat.bg, color: stat.color, fontSize: '20px' }}>
                {stat.icon}
              </div>
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.raw ? stat.value : stat.value.toLocaleString()}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Pipeline by Stage — Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Leads by Stage</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineChartData} margin={{ top: 0, right: 0, bottom: 30, left: -10 }}>
                <XAxis
                  dataKey="stage"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Breakdown — Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Lead Sources</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                >
                  {sourceChartData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sourceChartData.map((s, i) => (
                <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{s.source}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Stage Distribution %</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conversions
                .filter((c) => c.count > 0)
                .slice(0, 8)
                .map((c) => {
                  const color = STAGE_COLORS[c.stage as keyof typeof STAGE_COLORS] || '#6366F1';
                  return (
                    <div key={c.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{c.stage}</span>
                        <span style={{ fontWeight: 700, color }}>{c.pct_of_total}% · {c.count}</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${c.pct_of_total}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Stuck Leads */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Stuck Leads (7+ days)
            </h3>
            <span className="badge badge-warning">{stuckLeads.length}</span>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {stuckLeads.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-state-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div className="empty-state-desc">No stuck leads! Great pipeline hygiene.</div>
              </div>
            ) : (
              stuckLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(74, 144, 217, 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{lead.full_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.stage}</div>
                  </div>
                  <span className="stuck-indicator">{lead.days_stuck}d</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
