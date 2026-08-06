'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Lead, LeadStage } from '@/lib/types';
import LeadCard from './LeadCard';

interface StageColumnProps {
  stage: LeadStage;
  leads: Lead[];
  color: string;
  summary?: { count: number; total_value: number };
  onLeadClick: (lead: Lead) => void;
}

export default function StageColumn({ stage, leads, color, summary, onLeadClick }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: 'Column',
      stage,
    },
  });

  const totalValue = summary?.total_value || 0;
  const formattedValue = totalValue > 0
    ? totalValue >= 100000
      ? `₹${(totalValue / 100000).toFixed(1)}L`
      : `₹${(totalValue / 1000).toFixed(0)}K`
    : null;

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span
            className="kanban-column-dot"
            style={{ background: color }}
          />
          <span style={{ color, fontSize: '12px' }}>{stage}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {formattedValue && (
            <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 700 }}>
              {formattedValue}
            </span>
          )}
          <span className="kanban-column-count">{leads.length}</span>
        </div>
      </div>

      {/* Droppable Zone */}
      <div
        ref={setNodeRef}
        className={`kanban-cards${isOver ? ' drag-over' : ''}`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              color={color}
              onClick={() => onLeadClick(lead)}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px 12px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}
