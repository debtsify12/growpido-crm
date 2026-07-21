'use client';

import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '@/lib/api';
import { Task } from '@/lib/types';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { useRouter } from 'next/navigation';
import TaskFormModal from '@/components/tasks/TaskFormModal';

function TaskDueLabel({ due_date }: { due_date?: string }) {
  if (!due_date) return <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>No date</span>;
  const d = new Date(due_date);
  const isOverdue = isPast(d) && !isToday(d);
  
  let bg = 'rgba(100, 116, 139, 0.1)';
  let color = 'var(--text-secondary)';
  if (isOverdue) {
    bg = 'rgba(239, 68, 68, 0.1)';
    color = 'var(--color-danger)';
  } else if (isToday(d)) {
    bg = 'rgba(245, 158, 11, 0.1)';
    color = 'var(--color-warning)';
  }

  const label = isOverdue ? `Overdue · ${format(d, 'dd MMM')}` : isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'dd MMM yyyy');
  return (
    <span style={{ fontSize: '11px', color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      {label}
    </span>
  );
}

const TASK_TYPE_ICON: Record<string, React.ReactNode> = {
  'Follow Up': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  'Call': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
  'Email': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
  'Meeting': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  'Onboarding': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  'Content Strategist': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>,
  'Other': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>,
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'overdue' | 'all' | 'done'>('today');
  const [showModal, setShowModal] = useState(false);

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
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: !t.is_done } : t));
    await tasksApi.complete(id);
    // Reload to ensure order and filters are respected after a short delay
    setTimeout(loadTasks, 500);
  }

  const pendingCount = tasks.filter((t) => !t.is_done).length;

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--brand-primary), #60A5FA)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -4px rgba(74,144,217,0.4)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>My Day</h1>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
            {filter === 'done' ? `${tasks.length} completed tasks` : `${pendingCount} tasks to focus on`}
            {overdueCount > 0 && filter !== 'done' && (
              <span style={{ color: 'var(--color-danger)', fontWeight: 700, marginLeft: '6px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>
                {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          style={{ 
            padding: '12px 20px', 
            borderRadius: '12px', 
            background: 'var(--brand-primary)', 
            color: 'white', 
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
          Add Task
        </button>
      </div>

      {showModal && (
        <TaskFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadTasks();
          }}
        />
      )}

      {/* Styled Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', background: 'var(--surface)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', width: 'fit-content' }}>
        {[
          { key: 'today', label: 'Due Today' },
          { key: 'overdue', label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
          { key: 'all', label: 'All Pending' },
          { key: 'done', label: 'Completed' },
        ].map((tab) => {
          const isActive = filter === tab.key;
          const isOverdueTab = tab.key === 'overdue' && overdueCount > 0;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? (isOverdueTab ? 'var(--color-danger)' : 'var(--text-primary)') : 'transparent',
                color: isActive ? 'white' : (isOverdueTab ? 'var(--color-danger)' : 'var(--text-secondary)'),
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} /> 
          <span style={{ fontWeight: 500 }}>Loading your tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(74, 144, 217, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            {filter === 'today' ? 'You\'re all caught up for today!' : filter === 'done' ? 'No completed tasks yet.' : 'No tasks found'}
          </h3>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: 0, maxWidth: '300px' }}>
            {filter === 'today' ? 'Enjoy the rest of your day, or check all pending tasks.' : 'Create a new task to keep track of your work.'}
          </p>
          <button 
            onClick={() => setShowModal(true)}
            style={{ marginTop: '24px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          >
            Create your first task
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                padding: '20px',
                background: task.is_done ? 'var(--surface-hover)' : 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                opacity: task.is_done ? 0.7 : 1,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                cursor: 'default',
              }}
              onMouseOver={(e) => {
                if(!task.is_done) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = 'var(--brand-primary)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* Highlight Left Border */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: task.is_auto_created ? 'var(--brand-primary)' : 'var(--border)', opacity: task.is_done ? 0.3 : 1 }} />

              {/* Checkbox */}
              <button
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  border: task.is_done ? 'none' : '2px solid var(--border)', 
                  background: task.is_done ? 'var(--color-success)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginTop: '2px',
                  transition: 'all 0.2s',
                  color: 'white',
                }}
                onClick={() => handleComplete(task.id)}
              >
                {task.is_done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  
                  {/* Left Side: Type + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '6px', background: 'rgba(74, 144, 217, 0.1)', borderRadius: '8px', color: 'var(--brand-primary)' }}>
                      {TASK_TYPE_ICON[task.task_type] || <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: task.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.is_done ? 'line-through' : 'none', letterSpacing: '-0.01em' }}>
                      {task.title}
                    </span>
                    {task.is_auto_created && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--brand-primary)', background: 'linear-gradient(to right, rgba(74,144,217,0.1), rgba(74,144,217,0.05))', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(74,144,217,0.2)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        Auto-generated
                      </span>
                    )}
                  </div>

                  {/* Right Side: Badges */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <TaskDueLabel due_date={task.due_date} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  
                  {task.lead && (
                    <button
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => router.push(`/leads/${task.lead!.id}`)}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--brand-primary)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                      {task.lead.full_name}
                      {task.lead.company_name && <span style={{ opacity: 0.6 }}>· {task.lead.company_name}</span>}
                    </button>
                  )}

                  {task.assigned_user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '20px', background: 'var(--surface-hover)', border: '1px solid transparent' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)', color: 'white', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getInitials(task.assigned_user.name)}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {task.assigned_user.name}
                      </span>
                    </div>
                  )}
                </div>

                {task.description && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5, background: 'rgba(0,0,0,0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--border)' }}>
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
