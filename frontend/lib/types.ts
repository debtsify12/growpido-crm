// Growpido CRM — TypeScript Type Definitions

export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ─── Lead Types ───────────────────────────────────────────────────────────────

export type LeadStage =
  | 'New Lead'
  | 'Discovery Call Booked'
  | 'Discovery Done'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Onboarding'
  | 'Active Client'
  | 'Upsell'
  | 'Referral'
  | 'Lost';

export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

export type LeadSource =
  | 'LinkedIn'
  | 'Website / Inbound'
  | 'Referral'
  | 'Cold Outreach (Email)'
  | 'Cold Outreach (WhatsApp)'
  | 'Instagram'
  | 'Event / Conference'
  | 'Other';

export type FundingStage = 'Bootstrapped' | 'Angel' | 'Seed' | 'Series A' | 'Series B+';
export type RevenueRange = '< 10L' | '10L–50L' | '50L–1Cr' | '1Cr+';

export interface Lead {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  company_name?: string;
  company_industry?: string;
  city?: string;
  company_funding_stage?: FundingStage;
  revenue_range?: RevenueRange;
  budget?: number;
  service_interested?: string[];
  reputation_building: boolean;
  custom_ai_agent: boolean;
  source?: LeadSource;
  priority?: LeadPriority;
  tags?: string[];
  stage: LeadStage;
  is_lost: boolean;
  lost_reason?: string;
  follow_up_count: number;
  assigned_to?: string;
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at?: string;
  last_activity_at?: string;
  stage_changed_at?: string;
}

export interface LeadListResponse {
  total: number;
  items: Lead[];
}

// ─── Task Types ───────────────────────────────────────────────────────────────

export type TaskType = 'Follow Up' | 'Call' | 'Email' | 'Meeting' | 'Onboarding' | 'Other';

export interface Task {
  id: string;
  lead_id?: string;
  assigned_to?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  due_date?: string;
  is_done: boolean;
  is_auto_created: boolean;
  created_at: string;
  completed_at?: string;
  lead?: {
    id: string;
    full_name: string;
    company_name?: string;
    stage: string;
  };
  assigned_user?: {
    id: string;
    name: string;
  };
}

// ─── Note Types ───────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  author?: {
    id: string;
    name: string;
  };
}

// ─── Activity Types ───────────────────────────────────────────────────────────

export type ActivityType =
  | 'stage_change'
  | 'note_added'
  | 'task_created'
  | 'task_completed'
  | 'call_logged'
  | 'field_updated'
  | 'lead_created'
  | 'lead_assigned'
  | 'stuck_alert';

export interface Activity {
  id: string;
  lead_id: string;
  user_id?: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    name: string;
  };
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardOverview {
  total_leads: number;
  active_leads: number;
  won_leads: number;
  lost_leads: number;
  total_pipeline_value: number;
  overdue_tasks: number;
}

export interface PipelineStageData {
  stage: LeadStage;
  count: number;
  total_value: number;
}

export interface SourceData {
  source: string;
  count: number;
}

export interface ConversionData {
  stage: LeadStage;
  count: number;
  pct_of_total: number;
}

export interface StuckLead {
  id: string;
  full_name: string;
  company_name?: string;
  stage: string;
  last_activity_at: string;
  days_stuck: number;
}

// ─── API Auth ─────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── Pipeline Constants ───────────────────────────────────────────────────────

export const PIPELINE_STAGES: LeadStage[] = [
  'New Lead',
  'Discovery Call Booked',
  'Discovery Done',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Onboarding',
  'Active Client',
  'Upsell',
  'Referral',
  'Lost',
];

export const STAGE_COLORS: Record<LeadStage, string> = {
  'New Lead': '#6366F1',
  'Discovery Call Booked': '#8B5CF6',
  'Discovery Done': '#A78BFA',
  'Proposal Sent': '#F59E0B',
  'Negotiation': '#EF4444',
  'Won': '#10B981',
  'Onboarding': '#06B6D4',
  'Active Client': '#3B82F6',
  'Upsell': '#F97316',
  'Referral': '#EC4899',
  'Lost': '#6B7280',
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  Hot: '#EF4444',
  Warm: '#F59E0B',
  Cold: '#6B7280',
};

export const LEAD_SOURCES: LeadSource[] = [
  'LinkedIn',
  'Website / Inbound',
  'Referral',
  'Cold Outreach (Email)',
  'Cold Outreach (WhatsApp)',
  'Instagram',
  'Event / Conference',
  'Other',
];

export const SERVICES = ['LinkedIn Reputation Building', 'Custom AI Agents'];
