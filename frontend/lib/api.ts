import axios from 'axios';
import type {
  User, Lead, LeadListResponse, Task, Note, Activity,
  TokenResponse, DashboardOverview, PipelineStageData,
  SourceData, ConversionData, StuckLead, TeamPerformance,
  Tenant, WorkLog, PersonStats, Persona,
  Invoice, InvoiceSummary, InvoiceStatus,
  ContentPost, ContentPostsResponse, BrandVault, PublicPortalResponse,
} from './types';

// Always use the relative /api path so all requests are proxied through
// Next.js rewrites → backend. This avoids CORS errors in production.
const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('growpido_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Don't reload if we're already on the login page (e.g. login failed)
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('growpido_token');
        localStorage.removeItem('growpido_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/api/auth/login', { email, password }),
  me: () => api.get<User>('/api/auth/me'),
  forgotPassword: (email: string) => 
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/api/auth/reset-password', { token, new_password }),
};

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<LeadListResponse>('/api/leads', { params }),
  get: (id: string) => api.get<Lead>(`/api/leads/${id}`),
  create: (data: Partial<Lead>) => api.post<Lead>('/api/leads', data),
  update: (id: string, data: Partial<Lead>) => api.put<Lead>(`/api/leads/${id}`, data),
  changeStage: (id: string, stage: string, note?: string) =>
    api.post<Lead>(`/api/leads/${id}/stage`, { stage, note }),
  delete: (id: string) => api.delete(`/api/leads/${id}`),
  activities: (id: string) => api.get<Activity[]>(`/api/leads/${id}/activities`),
  notes: (id: string) => api.get<Note[]>(`/api/leads/${id}/notes`),
  addNote: (id: string, content: string) =>
    api.post<Note>(`/api/leads/${id}/notes`, { content }),
  updateNote: (leadId: string, noteId: string, content: string) =>
    api.put<Note>(`/api/leads/${leadId}/notes/${noteId}`, { content }),
  deleteNote: (leadId: string, noteId: string) =>
    api.delete(`/api/leads/${leadId}/notes/${noteId}`),
  pipelineSummary: () => api.get<PipelineStageData[]>('/api/leads/pipeline/summary'),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Task[]>('/api/tasks', { params }),
  get: (id: string) => api.get<Task>(`/api/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>('/api/tasks', data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/api/tasks/${id}`, data),
  complete: (id: string) => api.put<Task>(`/api/tasks/${id}`, { is_done: true }),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get<User[]>('/api/users'),
  get: (id: string) => api.get<User>(`/api/users/${id}`),
  create: (data: Partial<User> & { password: string }) =>
    api.post<User>('/api/users', data),
  update: (id: string, data: Partial<User>) => api.put<User>(`/api/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/api/users/${id}`),
};

// ─── People ───────────────────────────────────────────────────────────────────

export const peopleApi = {
  list: (params?: { department?: string; designation?: string; search?: string; is_active?: boolean }) =>
    api.get<User[]>('/api/people', { params }),
  departments: () => api.get<string[]>('/api/people/departments'),
  get: (id: string) => api.get<User>(`/api/people/${id}`),
  stats: (id: string) => api.get<PersonStats>(`/api/people/${id}/stats`),
  toggleStatus: (id: string, is_active: boolean) => api.patch<User>(`/api/people/${id}/toggle-status`, { is_active }),
  leads: (id: string, params?: { stage?: string; limit?: number }) =>
    api.get(`/api/people/${id}/leads`, { params }),
  tasks: (id: string, params?: { is_done?: boolean; limit?: number }) =>
    api.get(`/api/people/${id}/tasks`, { params }),
  workLogs: (id: string) => api.get<WorkLog[]>(`/api/people/${id}/work-logs`),
  addWorkLog: (id: string, data: {
    date: string;
    description: string;
    hours?: number;
    category: string;
    lead_id?: string;
  }) => api.post<WorkLog>(`/api/people/${id}/work-logs`, data),
  deleteWorkLog: (userId: string, logId: string) =>
    api.delete(`/api/people/${userId}/work-logs/${logId}`),
};

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenantsApi = {
  list: () => api.get<Tenant[]>('/api/tenants'),
  get: (id: string) => api.get<Tenant>(`/api/tenants/${id}`),
  create: (data: { name: string; slug: string; plan?: string }) =>
    api.post<Tenant>('/api/tenants', data),
  update: (id: string, data: Partial<Tenant>) => api.put<Tenant>(`/api/tenants/${id}`, data),
  createAdmin: (tenantId: string, data: Partial<User> & { password: string }) =>
    api.post<User>(`/api/tenants/${tenantId}/admins`, data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>('/api/dashboard/overview'),
  pipelineByStage: () => api.get<PipelineStageData[]>('/api/dashboard/pipeline-by-stage'),
  sourceBreakdown: () => api.get<SourceData[]>('/api/dashboard/source-breakdown'),
  conversionRates: () => api.get<ConversionData[]>('/api/dashboard/conversion-rates'),
  stuckLeads: (days: number = 7) => api.get<StuckLead[]>(`/api/dashboard/stuck-leads?days=${days}`),
  teamPerformance: () => api.get<TeamPerformance[]>('/api/dashboard/team-performance'),
  clearData: (options: { leads: boolean; personas: boolean; team: boolean }) =>
    api.post<{ status: string; message: string }>('/api/dashboard/clear-data', options),
};

// ─── Import / Export ──────────────────────────────────────────────────────────

export const importExportApi = {
  importCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportCsv: () =>
    api.get('/api/export/csv', { responseType: 'blob' }),
};

// ─── Content Strategist ───────────────────────────────────────────────────────

export const contentApi = {
  analyze: (content: string, personaContext?: string) => api.post<{score: number, verdict: string, suggestions: string[], hooks?: string[]}>('/api/content/analyze', { content, persona_context: personaContext }),
};

export const personaApi = {
  getPersonas: () => api.get<Persona[]>('/api/personas'),
  createPersona: (data: { name: string, description?: string, context: string }) => api.post<Persona>('/api/personas', data),
  deletePersona: (id: string) => api.delete(`/api/personas/${id}`),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (params?: { lead_id?: string; status?: InvoiceStatus }) =>
    api.get<Invoice[]>('/api/invoices', { params }),
  summary: () => api.get<InvoiceSummary>('/api/invoices/summary'),
  get: (id: string) => api.get<Invoice>(`/api/invoices/${id}`),
  byClient: (leadId: string) => api.get<Invoice[]>(`/api/invoices/client/${leadId}`),
  create: (data: Partial<Invoice>) => api.post<Invoice>('/api/invoices', data),
  update: (id: string, data: Partial<Invoice>) => api.put<Invoice>(`/api/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/api/invoices/${id}`),
};

// ─── Client Delivery & Content Calendar ───────────────────────────────────────

export const contentPostsApi = {
  listByClient: (leadId: string) =>
    api.get<ContentPostsResponse>(`/api/leads/${leadId}/content-posts`),
  createForClient: (leadId: string, data: Partial<ContentPost>) =>
    api.post<ContentPost>(`/api/leads/${leadId}/content-posts`, data),
  updateDeliverySettings: (
    leadId: string,
    data: {
      monthly_post_quota?: number;
      monthly_calls_quota?: number;
      health_score?: number;
      brand_vault?: BrandVault;
    }
  ) => api.patch<{ message: string }>(`/api/leads/${leadId}/delivery-settings`, data),
  get: (postId: string) => api.get<ContentPost>(`/api/content-posts/${postId}`),
  update: (postId: string, data: Partial<ContentPost>) =>
    api.patch<ContentPost>(`/api/content-posts/${postId}`, data),
  delete: (postId: string) => api.delete(`/api/content-posts/${postId}`),
  getPublicPortal: (leadId: string) =>
    api.get<PublicPortalResponse>(`/api/public/portal/${leadId}`),
  submitPortalReview: (
    leadId: string,
    postId: string,
    action: 'approve' | 'comment',
    feedback?: string
  ) =>
    api.post<{ message: string; post: ContentPost }>(
      `/api/public/portal/${leadId}/posts/${postId}/review`,
      { action, feedback }
    ),
};

export const integrationsApi = {
  getGoogleSheetsConfig: () =>
    api.get<{
      spreadsheet_id: string;
      gid: string;
      spreadsheet_url: string;
      last_synced_at: string | null;
      last_sync_result: any;
      auto_sync_enabled: boolean;
      sync_interval_minutes: number;
      webhook_url: string;
      script_code: string;
    }>('/api/integrations/google-sheets/config'),
  syncGoogleSheets: (spreadsheet_id?: string, gid?: string) =>
    api.post<{
      success: boolean;
      total_rows_processed: number;
      created_leads: number;
      updated_leads: number;
      unchanged_leads: number;
      errors: string[];
      synced_at: string;
    }>('/api/integrations/google-sheets/sync', { spreadsheet_id, gid }),
  getAppsScript: () =>
    api.get<{
      webhook_url: string;
      script: string;
    }>('/api/integrations/google-sheets/script'),
};

export default api;

