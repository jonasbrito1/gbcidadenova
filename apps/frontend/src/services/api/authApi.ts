
// =============================================
// API SERVICE - apps/frontend/src/services/api/authApi.ts
// =============================================

import { LoginCredentials, LoginResponse, RefreshTokenRequest, User } from '../../types/auth';
import { apiClient } from './client';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  refreshToken: async (request: RefreshTokenRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/refresh', request);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.put('/auth/change-password', { currentPassword, newPassword });
  },

  enable2FA: async (): Promise<{ qrCode: string; secret: string }> => {
    const response = await apiClient.post('/auth/2fa/enable');
    return response.data;
  },

  verify2FA: async (token: string): Promise<void> => {
    await apiClient.post('/auth/2fa/verify', { token });
  },

  disable2FA: async (token: string): Promise<void> => {
    await apiClient.post('/auth/2fa/disable', { token });
  },
};