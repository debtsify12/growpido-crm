'use client';

import { useState } from 'react';
import { Lead, BrandVault } from '@/lib/types';
import { contentPostsApi } from '@/lib/api';

interface Props {
  client: Lead;
  onUpdated?: () => void;
}

export default function ClientBrandVault({ client, onUpdated }: Props) {
  const [vault, setVault] = useState<BrandVault>(client.brand_vault || {});
  const [toneOfVoice, setToneOfVoice] = useState(vault.tone_of_voice || 'Authoritative, contrarian, data-driven thought leadership. Short punchy lines.');
  const [targetAudience, setTargetAudience] = useState(vault.target_audience || 'Series A/B Founders, Angel Investors, and Tech Executives.');
  const [executiveBio, setExecutiveBio] = useState(vault.executive_bio || `${client.poc_name || client.full_name} is a pioneer in tech innovation, driving automated growth and scalable solutions.`);
  const [driveUrl, setDriveUrl] = useState(vault.drive_folder_url || '');
  const [notionUrl, setNotionUrl] = useState(vault.notion_workspace_url || '');
  const [loomUrl, setLoomUrl] = useState(vault.loom_video_url || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedVault: BrandVault = {
        tone_of_voice: toneOfVoice,
        target_audience: targetAudience,
        executive_bio: executiveBio,
        drive_folder_url: driveUrl.trim() || undefined,
        notion_workspace_url: notionUrl.trim() || undefined,
        loom_video_url: loomUrl.trim() || undefined,
      };

      await contentPostsApi.updateDeliverySettings(client.id, {
        brand_vault: updatedVault,
      });

      setVault(updatedVault);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error saving brand vault', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
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
            <span style={{ fontSize: '20px' }}>🗄️</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
              Brand Vault & Ghostwriting Guidelines
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748B)' }}>
            Central repository for {client.company_name || client.full_name}'s tone of voice, founder positioning, and cloud asset folders.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary btn-sm"
          style={{ padding: '8px 20px', fontWeight: 800 }}
        >
          {saving ? 'Saving...' : savedSuccess ? '✓ Saved!' : 'Save Brand Guidelines'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left Column: Tone of Voice & Bio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Tone of Voice & Writing Style Guide
            </label>
            <textarea
              rows={4}
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              placeholder="e.g. Authoritative, direct, no fluff. Uses real numbers, contrasts old ways with AI systems..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Executive Positioning & Founder Bio
            </label>
            <textarea
              rows={4}
              value={executiveBio}
              onChange={(e) => setExecutiveBio(e.target.value)}
              placeholder="Short bio, achievements, milestones, and personal brand angle..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Target Audience / ICP
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. B2B SaaS Founders, Enterprise Decision Makers"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        {/* Right Column: Asset Links Hub */}
        <div
          style={{
            background: 'var(--bg-subtle, #F8FAFC)',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <h4 style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
            📁 Integrated Assets & Cloud Folders
          </h4>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Google Drive Brand Kit / Raw Assets
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  Open
                </a>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Notion Content Workspace / Database
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                placeholder="https://notion.so/..."
                value={notionUrl}
                onChange={(e) => setNotionUrl(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              {notionUrl && (
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  Open
                </a>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Loom Strategy & Strategy Call Recordings
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                placeholder="https://www.loom.com/share/..."
                value={loomUrl}
                onChange={(e) => setLoomUrl(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              {loomUrl && (
                <a
                  href={loomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  Open
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
