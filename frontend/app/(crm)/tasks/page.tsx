'use client';

import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '@/lib/api';
import { Task } from '@/lib/types';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { useRouter } from 'next/navigation';

function TaskDueLabel({ due_date }: { due_date?: string }) {
  if (!due_date) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No due date</span>;
  const d = new Date(due_date);
  const isOverdue = isPast(d) && !isToday(d);
  const color = isOverdue ? 'var(--color-danger)' : isToday(d) ? 'var(--color-warning)' : 'var(--text-muted)';
  const label = isOverdue ? `Overdue · ${format(d, 'dd MMM')}` : isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'dd MMM yyyy');
  return <span style={{ fontSize: '12px', color, fontWeight: isOverdue ? 700 : 500 }}>{label}</span>;
}

const TASK_TYPE_ICON: Record<string, React.ReactNode> = {
  'Follow Up': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  'Call': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
  'Email': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
  'Meeting': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  'Onboarding': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  'Other': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>,
};

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'overdue' | 'all' | 'done'>('today');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filter === 'today') params.due_today = true;
      else if (filter === 'overdue') params.overdue = true;
      else if (filter === 'done') params.is_done = true;
      else params.is_done = false;

      const [tasksRes, overdueRes] = await Promise.all([
        tasksApi.list(params),
        tasksApi.list({ overdue: true, is_done: false }),
      ]);
      setTasks(tasksRes.data);
      setOverdueCount(overdueRes.data.length);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleComplete(id: string) {
    await tasksApi.complete(id);
    loadTasks();
  }

  const pendingCount = tasks.filter((t) => !t.is_done).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Day</h1>
          <p className="page-subtitle">
            {pendingCount} pending tasks
            {overdueCount > 0 && (
              <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}> · {overdueCount} overdue</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'today', label: 'Due Today' },
          { key: 'overdue', label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
          { key: 'all', label: 'All Pending' },
          { key: 'done', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`btn ${filter === tab.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(tab.key as typeof filter)}
            style={tab.key === 'overdue' && overdueCount > 0 ? { color: filter !== tab.key ? 'var(--color-danger)' : undefined } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /> Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="empty-state-title">
            {filter === 'today' ? 'Nothing due today!' : 'No tasks found'}
          </div>
          <div className="empty-state-desc">
            {filter === 'today' ? 'Great work — enjoy your day.' : 'Tasks auto-create when leads change stage.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="card"
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                padding: '14px 18px',
                opacity: task.is_done ? 0.55 : 1,
                borderLeft: `3px solid ${task.is_auto_created ? 'var(--brand-primary)' : 'var(--border)'}`,
              }}
            >
              {/* Checkbox */}
              <div
                className={`checkbox ${task.is_done ? 'checked' : ''}`}
                style={{ marginTop: '3px', cursor: task.is_done ? 'default' : 'pointer', flexShrink: 0 }}
                onClick={() => !task.is_done && handleComplete(task.id)}
              >
                {task.is_done && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px' }}>{TASK_TYPE_ICON[task.task_type] || '📌'}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, textDecoration: task.is_done ? 'line-through' : 'none' }}>
                    {task.title}
                  </span>
                  {task.is_auto_created && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--brand-primary)', background: 'rgba(74,144,217,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                      Auto
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <TaskDueLabel due_date={task.due_date} />

                  {task.lead && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0', height: 'auto', fontSize: '12px', color: 'var(--text-brand)' }}
                      onClick={() => router.push(`/leads/${task.lead!.id}`)}
                    >
                      {task.lead.full_name}
                      {task.lead.company_name && ` · ${task.lead.company_name}`}
                    </button>
                  )}

                  {task.assigned_user && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Assigned: {task.assigned_user.name}
                    </span>
                  )}
                </div>

                {task.description && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                    {task.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
