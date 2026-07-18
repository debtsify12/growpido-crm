'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  color: string;
  onClick: () => void;
  isDragging?: boolean;
}


export default function LeadCard({ lead, color, onClick, isDragging }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    '--stage-color': color,
  } as React.CSSProperties;

  const daysSinceActivity = lead.last_activity_at
    ? Math.floor((Date.now() - new Date(lead.last_activity_at).getTime()) / 86400000)
    : 0;

  const isStuck = daysSinceActivity >= 7;

  const budget = lead.budget
    ? lead.budget >= 100000
      ? `₹${(lead.budget / 100000).toFixed(1)}L`
      : `₹${(lead.budget / 1000).toFixed(0)}K`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card${isSortableDragging || isDragging ? ' dragging' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div className="kanban-card-name">{lead.full_name}</div>
        <span className={`badge badge-priority-${(lead.priority || 'warm').toLowerCase()}`}>
          {lead.priority || 'Warm'}
        </span>
      </div>

      <div className="kanban-card-company">
        {lead.company_name || <span style={{ color: 'var(--text-muted)' }}>No company</span>}
      </div>

      {/* Services */}
      {(lead.reputation_building || lead.custom_ai_agent) && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {lead.reputation_building && (
            <span className="badge badge-info" style={{ fontSize: '10px' }}>LinkedIn</span>
          )}
          {lead.custom_ai_agent && (
            <span className="badge badge-muted" style={{ fontSize: '10px' }}>AI Agent</span>
          )}
        </div>
      )}

      <div className="kanban-card-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {budget && <span className="kanban-card-value">{budget}</span>}
          {isStuck && (
            <span className="stuck-indicator">{daysSinceActivity}d</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {lead.assigned_user && (
            <div
              className="avatar avatar-sm"
              title={lead.assigned_user.name}
              style={{ fontSize: '9px' }}
            >
              {lead.assigned_user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          {lead.last_activity_at && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
