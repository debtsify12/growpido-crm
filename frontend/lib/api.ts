import axios from 'axios';
import type {
  User, Lead, LeadListResponse, Task, Note, Activity,
  TokenResponse, DashboardOverview, PipelineStageData,
  SourceData, ConversionData, StuckLead, TeamPerformance,
  Tenant, WorkLog, PersonStats,
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
  stuckLeads: (days?: number) =>
    api.get<StuckLead[]>('/api/dashboard/stuck-leads', { params: { days } }),
  teamPerformance: () => api.get<TeamPerformance[]>('/api/dashboard/team-performance'),
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

export default api;
