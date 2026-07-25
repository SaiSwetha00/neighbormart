import api from './api';
import { ApiResponse, User } from '@/types';

export interface LoginResponse {
  user: User;
  store: { id: string; name: string; logo?: string };
  redirectTo: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password }),

  registerStore: (data: {
    store: { name: string; address?: string; city?: string; country: string; currency: string; timezone: string };
    owner: { name: string; email: string; phone?: string; password: string };
  }) => api.post('/auth/register-store', data),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  refreshToken: () => api.post('/auth/refresh-token'),

  getSessions: () => api.get('/auth/sessions'),

  deleteSession: (id: string) => api.delete(`/auth/sessions/${id}`),

  verifyMfa: (code: string) => api.post('/auth/verify-mfa', { code }),
};
