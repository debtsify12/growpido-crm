'use client';

import { useState } from 'react';
import { Lead } from '@/lib/types';
import { contentPostsApi } from '@/lib/api';

interface Props {
  client: Lead;
  deliveredPostsCount: number;
  onUpdated?: () => void;
}

export default function ClientRetainerTracker({ client, deliveredPostsCount, onUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [postQuota, setPostQuota] = useState(client.monthly_post_quota || 12);
  const [callsQuota, setCallsQuota] = useState(client.monthly_calls_quota || 2);
  const [healthScore, setHealthScore] = useState(client.health_score || 95);
  const [saving, setSaving] = useState(false);

  const progressPercent = Math.min(100, Math.round((deliveredPostsCount / Math.max(1, postQuota)) * 100));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await contentPostsApi.updateDeliverySettings(client.id, {
        monthly_post_quota: postQuota,
        monthly_calls_quota: callsQuota,
        health_score: healthScore,
      });
      setIsEditing(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error updating delivery settings', err);
    } finally {
      setSaving(false);
    }
  };

  const getHealthBadge = (score: number) => {
    if (score >= 85) {
      return { label: '🟢 Thriving & Highly Satisfied', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    } else if (score >= 70) {
      return { label: '🟡 Active & Steady', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
    } else {
      return { label: '🔴 Attention Needed / Risk', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
    }
  };

  const health = getHealthBadge(client.health_score || 95);

  return (
    <div
      style={{
        background: 'var(--card-bg, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
              Retainer & Deliverable Operations
            </h3>
            <span
              style={{
                background: health.bg,
                color: health.color,
                border: `1px solid ${health.border}`,
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 800,
              }}
            >
              {health.label} ({client.health_score || 95}%)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
            Live delivery quotas, monthly retainer pacing, and engagement metrics for {client.company_name || client.full_name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="btn btn-secondary btn-sm"
        >
          {isEditing ? 'Cancel Edit' : '⚙️ Adjust Quotas'}
        </button>
      </div>

      {/* Edit Form Drawer */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          style={{
            background: 'var(--bg-subtle, #F8FAFC)',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
            gap: '16px',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
              Monthly Post Quota
            </label>
            <input
              type="number"
              min={1}
              value={postQuota}
              onChange={(e) => setPostQuota(parseInt(e.target.value) || 12)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
              Monthly Strategy Calls
            </label>
            <input
              type="number"
              min={0}
              value={callsQuota}
              onChange={(e) => setCallsQuota(parseInt(e.target.value) || 2)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
              Client Health Score (0-100%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={healthScore}
              onChange={(e) => setHealthScore(parseInt(e.target.value) || 95)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-sm"
            style={{ height: '36px' }}
          >
            {saving ? 'Saving...' : 'Save Targets'}
          </button>
        </form>
      )}

      {/* Metrics Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Post Deliverables Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#0E56C4', letterSpacing: '0.04em' }}>
              Monthly Posts Quota
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0E56C4' }}>
              {deliveredPostsCount} / {client.monthly_post_quota || 12}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#F1F5F9',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: progressPercent >= 100 ? '#10B981' : 'linear-gradient(90deg, #0E56C4, #00D2FF)',
                borderRadius: '9999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>
            {progressPercent}% of monthly scope delivered
          </span>
        </div>

        {/* Strategy Calls Quota */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6366F1', letterSpacing: '0.04em' }}>
              Executive Strategy Calls
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#6366F1' }}>
              1 / {client.monthly_calls_quota || 2}
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#F1F5F9',
              borderRadius: '9999px',
              overflow: 'hidden',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, #6366F1, #818CF8)',
                borderRadius: '9999px',
              }}
            />
          </div>

          <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>
            1 Bi-weekly sync completed
          </span>
        </div>

        {/* Contract & Retainer MRR */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#059669', letterSpacing: '0.04em' }}>
            Contract Value / Budget
          </span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {client.budget ? `₹${client.budget.toLocaleString('en-IN')}` : '$4,500 / mo'}
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>
            Active Retainer Contract
          </span>
        </div>

        {/* Automation Status */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#D97706', letterSpacing: '0.04em' }}>
            AI Infrastructure Status
          </span>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            {client.custom_ai_agent ? 'AI Voice & Lead Agent Active' : 'Personal Branding System'}
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748B)' }}>
            Deployed on client accounts
          </span>
        </div>
      </div>
    </div>
  );
}
