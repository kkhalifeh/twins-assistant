import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Children API
export const childrenAPI = {
  getAll: () => api.get('/children').then(res => res.data),
  getOne: (id: string) => api.get(`/children/${id}`).then(res => res.data),
  create: (data: any) => api.post('/children', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/children/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/children/${id}`).then(res => res.data),
};

// Feeding API
export const feedingAPI = {
  getAll: (params?: any) => api.get('/feeding', { params }).then(res => res.data),
  create: (data: any) => api.post('/feeding', data).then(res => res.data),
  endFeeding: (id: string) => api.put(`/feeding/${id}/end`).then(res => res.data),
};

// Sleep API
export const sleepAPI = {
  getAll: (params?: any) => api.get('/sleep', { params }).then(res => res.data),
  create: (data: any) => api.post('/sleep', data).then(res => res.data),
  endSleep: (id: string) => api.put(`/sleep/${id}/end`).then(res => res.data),
};

// Diaper API
export const diaperAPI = {
  getAll: (params?: any) => api.get('/diapers', { params }).then(res => res.data),
  create: (data: any) => api.post('/diapers', data).then(res => res.data),
};

// Health API
export const healthAPI = {
  getAll: (params?: any) => api.get('/health', { params }).then(res => res.data),
  create: (data: any) => api.post('/health', data).then(res => res.data),
  getVitals: (childId: string) => api.get(`/health/vitals/${childId}`).then(res => res.data),
};

// Analytics API
export const analyticsAPI = {
  getInsights: () => api.get('/analytics/insights').then(res => res.data),
  getPredictions: () => api.get('/analytics/predictions').then(res => res.data),
  getComparison: (days: number) => api.get(`/analytics/compare?days=${days}`).then(res => res.data),
  getFeedingPatterns: (childId: string, days: number) => 
    api.get(`/analytics/patterns/feeding/${childId}?days=${days}`).then(res => res.data),
  getSleepPatterns: (childId: string, days: number) => 
    api.get(`/analytics/patterns/sleep/${childId}?days=${days}`).then(res => res.data),
  getCorrelations: (childId: string, days: number) => 
    api.get(`/analytics/correlations/${childId}?days=${days}`).then(res => res.data),
};

export default api;

// Dashboard API
export const dashboardAPI = {
  getData: (date?: string, viewMode?: 'day' | 'week' | 'month') =>
    api.get('/dashboard', { params: { date, viewMode } }).then(res => res.data),
};

// Journal API
export const journalAPI = {
  getDailyData: (date: string, childId?: string) =>
    api.get('/journal/daily', { params: { date, childId } }).then(res => res.data),
};
