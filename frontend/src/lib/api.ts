import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';
export const API_SERVER_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3003';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get full image URL
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_SERVER_URL}${imagePath}`;
};

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
    const response = await api.get('/users/me');
    return response.data;
  },
};

// User Management API
export const userAPI = {
  getTeamMembers: () => api.get('/users/team').then(res => res.data),
  inviteTeamMember: (data: { email: string; name: string; role: string; password: string }) =>
    api.post('/users/team/invite', data).then(res => res.data),
  updateMemberRole: (memberId: string, role: string) =>
    api.put(`/users/team/${memberId}/role`, { role }).then(res => res.data),
  removeMember: (memberId: string) =>
    api.delete(`/users/team/${memberId}`).then(res => res.data),
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
  update: (id: string, data: any) => api.put(`/feeding/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/feeding/${id}`).then(res => res.data),
  endFeeding: (id: string) => api.put(`/feeding/${id}/end`).then(res => res.data),
};

// Pumping API
export const pumpingAPI = {
  getAll: (params?: any) => api.get('/pumping', { params }).then(res => res.data),
  create: (data: any) => api.post('/pumping', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/pumping/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/pumping/${id}`).then(res => res.data),
};

// Sleep API
export const sleepAPI = {
  getAll: (params?: any) => api.get('/sleep', { params }).then(res => res.data),
  getActive: () => api.get('/sleep/active').then(res => res.data),
  create: (data: any) => api.post('/sleep', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/sleep/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/sleep/${id}`).then(res => res.data),
  endSleep: (id: string) => api.put(`/sleep/${id}/end`).then(res => res.data),
};

// Diaper API
export const diaperAPI = {
  getAll: (params?: any) => api.get('/diapers', { params }).then(res => res.data),
  create: (data: any) => api.post('/diapers', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/diapers/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/diapers/${id}`).then(res => res.data),
};

// Health API
export const healthAPI = {
  getAll: (params?: any) => api.get('/health', { params }).then(res => res.data),
  create: (data: any) => api.post('/health', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/health/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/health/${id}`).then(res => res.data),
  getVitals: (childId: string) => api.get(`/health/vitals/${childId}`).then(res => res.data),
};

// Hygiene API
export const hygieneAPI = {
  getAll: (params?: any) => api.get('/hygiene', { params }).then(res => res.data),
  create: (data: any) => api.post('/hygiene', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/hygiene/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/hygiene/${id}`).then(res => res.data),
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

// Inventory API
export const inventoryAPI = {
  getAll: (params?: any) => api.get('/inventory', { params }).then(res => res.data),
  getOne: (id: string) => api.get(`/inventory/${id}`).then(res => res.data),
  getLowStock: () => api.get('/inventory/low-stock').then(res => res.data),
  create: (data: any) => api.post('/inventory', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/inventory/${id}`).then(res => res.data),
  restock: (id: string, quantity: number) =>
    api.put(`/inventory/${id}/restock`, { quantity }).then(res => res.data),
  decrease: (id: string, quantity: number) =>
    api.put(`/inventory/${id}/decrease`, { quantity }).then(res => res.data),
};

// Milestones API
export const milestonesAPI = {
  getAll: (params?: any) => api.get('/milestones', { params }).then(res => res.data),
  getByChild: (childId: string) => api.get('/milestones', { params: { childId } }).then(res => res.data),
  create: (data: any) => api.post('/milestones', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/milestones/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/milestones/${id}`).then(res => res.data),
};

// Payments API
export const paymentsAPI = {
  getAll: (params?: any) => api.get('/payments', { params }).then(res => res.data),
  create: (data: any) => api.post('/payments', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/payments/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/payments/${id}`).then(res => res.data),
  getSummary: (params?: any) => api.get('/payments/summary', { params }).then(res => res.data),
};

// Log Import API
export const logImportAPI = {
  analyzeImages: async (formData: FormData) => {
    const response = await api.post('/log-import/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  bulkSave: (data: any) => api.post('/log-import/bulk-save', data).then(res => res.data),
  createLog: (data: any) => api.post('/log-import/create-log', data).then(res => res.data),
};
