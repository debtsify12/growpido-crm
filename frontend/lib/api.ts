import axios from 'axios';
import type {
  User, Lead, LeadListResponse, Task, Note, Activity,
  TokenResponse, DashboardOverview, PipelineStageData,
  SourceData, ConversionData, StuckLead,
} from './types';

// Always use the relative /api path so all requests are proxied through
// Next.js rewrites → backend. This avoids CORS errors in production.
const api = axios.create({
  baseURL: '/api',
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
      localStorage.removeItem('growpido_token');
      localStorage.removeItem('growpido_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/api/auth/login', { email, password }),
  me: () => api.get<User>('/api/auth/me'),
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
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<User>('/api/users', data),
  update: (id: string, data: Partial<User>) => api.put<User>(`/api/users/${id}`, data),
  deactivate: (id: string) => api.delete(`/api/users/${id}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>('/api/dashboard/overview'),
  pipelineByStage: () => api.get<PipelineStageData[]>('/api/dashboard/pipeline-by-stage'),
  sourceBreakdown: () => api.get<SourceData[]>('/api/dashboard/source-breakdown'),
  conversionRates: () => api.get<ConversionData[]>('/api/dashboard/conversion-rates'),
  stuckLeads: (days?: number) =>
    api.get<StuckLead[]>('/api/dashboard/stuck-leads', { params: { days } }),
  teamPerformance: () => api.get('/api/dashboard/team-performance'),
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
