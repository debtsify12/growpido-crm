'use client';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { leadsApi } from '@/lib/api';
import { Lead, PIPELINE_STAGES, STAGE_COLORS, LeadStage } from '@/lib/types';
import LeadCard from '@/components/pipeline/LeadCard';
import StageColumn from '@/components/pipeline/StageColumn';
import LeadFormModal from '@/components/leads/LeadFormModal';

export default function PipelinePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as LeadStage;
    const lead = leads.find((l) => l.id === leadId);

    if (!lead || lead.stage === newStage) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    try {
      await leadsApi.changeStage(leadId, newStage);
      await loadSummary();
    } catch (err) {
      console.error('Stage change failed', err);
      // Revert
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: lead.stage } : l))
      );
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
        collisionDetection={closestCenter}
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
            <div style={{ transform: 'rotate(3deg)', opacity: 0.9 }}>
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
    </div>
  );
}
