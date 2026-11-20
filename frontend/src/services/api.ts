import axios from 'axios';
import {
  User,
  Project,
  Task,
  TaskDependency,
  GraphData,
  ProjectAnalytics,
  OverallAnalytics,
  ActivityLog,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('flowtrack_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/token/')
    ) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        const refresh = localStorage.getItem('flowtrack_refresh_token');
        if (refresh) {
          try {
            const { data } = await axios.post(`${API_URL}/api/auth/token/refresh/`, {
              refresh,
            });
            localStorage.setItem('flowtrack_access_token', data.access);
            if (data.refresh) {
              localStorage.setItem('flowtrack_refresh_token', data.refresh);
            }
            originalRequest.headers.Authorization = `Bearer ${data.access}`;
            return api(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('flowtrack_access_token');
            localStorage.removeItem('flowtrack_refresh_token');
            localStorage.removeItem('flowtrack_user');
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  register: (payload: { username: string; email: string; password: string }) =>
    api.post<{ message: string; user: User; tokens: { access: string; refresh: string } }>(
      '/api/auth/register/',
      payload
    ),
  login: (credentials: { username: string; password: string }) =>
    api.post<{ access: string; refresh: string }>('/api/auth/token/', credentials),
  getMe: () => api.get<User>('/api/auth/me/'),
};

// Projects endpoints
export const projectsApi = {
  list: () => api.get<Project[]>('/api/projects/'),
  get: (id: number) => api.get<Project>(`/api/projects/${id}/`),
  create: (data: Partial<Project>) => api.post<Project>('/api/projects/', data),
  update: (id: number, data: Partial<Project>) => api.patch<Project>(`/api/projects/${id}/`, data),
  delete: (id: number) => api.delete(`/api/projects/${id}/`),
};

// Tasks endpoints
export const tasksApi = {
  listByProject: (projectId: number, params?: { status?: string; priority?: string; sort_by?: string; search?: string }) =>
    api.get<Task[]>(`/api/projects/${projectId}/tasks/`, { params }),
  create: (projectId: number, data: Partial<Task>) =>
    api.post<Task>(`/api/projects/${projectId}/tasks/`, data),
  get: (taskId: number) => api.get<Task>(`/api/tasks/${taskId}/`),
  update: (taskId: number, data: Partial<Task>) => api.patch<Task>(`/api/tasks/${taskId}/`, data),
  delete: (taskId: number) => api.delete(`/api/tasks/${taskId}/`),
};

// Dependencies endpoints
export const dependenciesApi = {
  create: (data: { prerequisite_task: number; dependent_task: number }) =>
    api.post<TaskDependency>('/api/dependencies/', data),
  delete: (id: number) => api.delete(`/api/dependencies/${id}/`),
};

// Graph endpoint
export const graphApi = {
  getProjectGraph: (projectId: number) => api.get<GraphData>(`/api/projects/${projectId}/graph/`),
};

// Analytics endpoints
export const analyticsApi = {
  getProjectAnalytics: (projectId: number) =>
    api.get<ProjectAnalytics>(`/api/projects/${projectId}/analytics/`),
  getOverallAnalytics: () => api.get<OverallAnalytics>('/api/analytics/overview/'),
};

// Activity endpoints
export const activityApi = {
  getRecentActivity: () => api.get<ActivityLog[]>('/api/activity/'),
  getProjectActivity: (projectId: number) => api.get<ActivityLog[]>(`/api/projects/${projectId}/activity/`),
};

export default api;
