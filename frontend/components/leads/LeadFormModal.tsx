'use client';

import { useState } from 'react';
import { leadsApi } from '@/lib/api';
import {
  PIPELINE_STAGES, LEAD_SOURCES,
  LeadStage, LeadSource,
} from '@/lib/types';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  initialStage?: LeadStage;
}

export default function LeadFormModal({ onClose, onSaved, initialStage }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    company_name: '',
    company_industry: '',
    city: '',
    budget: '',
    source: '' as LeadSource | '',
    priority: 'Warm',
    stage: initialStage || 'New Lead' as LeadStage,
    reputation_building: false,
    custom_ai_agent: false,
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await leadsApi.create({
        ...form,
        budget: form.budget ? parseInt(form.budget) : undefined,
        source: form.source || undefined,
        priority: form.priority as import('@/lib/types').LeadPriority,
        stage: form.stage as import('@/lib/types').LeadStage,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Lead</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && <div className="login-error">{error}</div>}

            {/* Basic Info */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Contact Information
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" placeholder="John Doe" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" placeholder="john@company.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" placeholder="Mumbai" value={form.city} onChange={(e) => set('city', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Company Details
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-control" placeholder="Acme Inc." value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-control" placeholder="SaaS, D2C, Fintech..." value={form.company_industry} onChange={(e) => set('company_industry', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Budget (INR)</label>
                  <input className="form-control" type="number" placeholder="50000" value={form.budget} onChange={(e) => set('budget', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Services Interested
              </h3>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label className="checkbox-wrapper">
                  <div className={`checkbox ${form.reputation_building ? 'checked' : ''}`} onClick={() => set('reputation_building', !form.reputation_building)}>
                    {form.reputation_building && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '13.5px' }}>LinkedIn Reputation Building</span>
                </label>
                <label className="checkbox-wrapper">
                  <div className={`checkbox ${form.custom_ai_agent ? 'checked' : ''}`} onClick={() => set('custom_ai_agent', !form.custom_ai_agent)}>
                    {form.custom_ai_agent && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '13.5px' }}>Custom AI Agents</span>
                </label>
              </div>
            </div>

            {/* Pipeline Info */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Pipeline Info
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select className="form-control" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                    {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-control" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select className="form-control" value={form.source} onChange={(e) => set('source', e.target.value as LeadSource)}>
                    <option value="">Select source...</option>
                    {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input className="form-control" placeholder="hot lead, budget 50k+" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving...</> : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
