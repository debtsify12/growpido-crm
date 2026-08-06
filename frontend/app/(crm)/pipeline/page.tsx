'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCorners,
  CollisionDetection,
} from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { leadsApi } from '@/lib/api';
import { Lead, PIPELINE_STAGES, STAGE_COLORS, LeadStage } from '@/lib/types';
import LeadCard from '@/components/pipeline/LeadCard';
import StageColumn from '@/components/pipeline/StageColumn';
import LeadFormModal from '@/components/leads/LeadFormModal';
import GoogleSheetsSyncModal from '@/components/integrations/GoogleSheetsSyncModal';

export default function PipelinePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSheetsSync, setShowSheetsSync] = useState(false);
  const [stageSummary, setStageSummary] = useState<Record<string, { count: number; total_value: number }>>({});

  const loadLeads = useCallback(async () => {
    try {
      const res = await leadsApi.list({ page: 1, page_size: 200 });
      setLeads(res.data.items);
    } catch (err) {
      console.error('Failed to load leads', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await leadsApi.pipelineSummary();
      const map: Record<string, { count: number; total_value: number }> = {};
      res.data.forEach((s: { stage: string; count: number; total_value: number }) => {
        map[s.stage] = { count: s.count, total_value: s.total_value };
      });
      setStageSummary(map);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLeads();
    loadSummary();
  }, [loadLeads, loadSummary]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // 1. Pointer inside container or card (most accurate)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // 2. Rectangular intersection
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    // 3. Closest corners fallback
    return closestCorners(args);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    let targetStage: LeadStage | null = null;

    const overData = over.data?.current;
    if (overData?.type === 'Column' && overData.stage) {
      targetStage = overData.stage as LeadStage;
    } else if (overData?.type === 'Lead') {
      targetStage = (overData.stage || overData.lead?.stage) as LeadStage;
    } else if (PIPELINE_STAGES.includes(over.id as LeadStage)) {
      targetStage = over.id as LeadStage;
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) {
        targetStage = overLead.stage;
      }
    }

    if (!targetStage || lead.stage === targetStage) return;

    const oldStage = lead.stage;

    // Optimistic lead list update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage! } : l))
    );

    // Optimistic summary update
    setStageSummary((prev) => {
      const next = { ...prev };
      const val = lead.budget || 0;
      if (next[oldStage]) {
        next[oldStage] = {
          count: Math.max(0, (next[oldStage].count || 1) - 1),
          total_value: Math.max(0, (next[oldStage].total_value || val) - val),
        };
      }
      if (next[targetStage!]) {
        next[targetStage!] = {
          count: (next[targetStage!].count || 0) + 1,
          total_value: (next[targetStage!].total_value || 0) + val,
        };
      } else {
        next[targetStage!] = { count: 1, total_value: val };
      }
      return next;
    });

    try {
      await leadsApi.changeStage(leadId, targetStage);
      await loadSummary();
    } catch (err) {
      console.error('Stage change failed', err);
      // Revert optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: oldStage } : l))
      );
      await loadSummary();
    }
  }

  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-page">
          <div className="spinner" />
          Loading pipeline...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 24px 0' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p className="page-subtitle">
            {leads.length} total leads across {PIPELINE_STAGES.length} stages
          </p>
        </div>
        <div className="topbar-actions">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSheetsSync(true)}
            style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981', 
              borderColor: 'rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <span>📊</span>
            <span>Sync Google Sheet</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => router.push('/leads')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Grid View
            </span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            id="add-lead-btn"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage] || []}
              color={STAGE_COLORS[stage]}
              summary={stageSummary[stage]}
              onLeadClick={(lead) => router.push(`/leads/${lead.id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div style={{ transform: 'rotate(2deg)', opacity: 0.95, pointerEvents: 'none' }}>
              <LeadCard
                lead={activeLead}
                color={STAGE_COLORS[activeLead.stage]}
                onClick={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <LeadFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadLeads();
            loadSummary();
          }}
        />
      )}

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={showSheetsSync}
        onClose={() => setShowSheetsSync(false)}
        onSyncCompleted={() => {
          loadLeads();
          loadSummary();
        }}
      />
    </div>
  );
}
