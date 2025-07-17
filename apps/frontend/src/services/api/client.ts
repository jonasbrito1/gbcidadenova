
// =============================================
// API CLIENT - apps/frontend/src/services/api/client.ts
// =============================================

import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { tokenManager } from '../../utils/tokenManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para adicionar token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor para tratar erros
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Se token expirou, tenta refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          tokenManager.setTokens(accessToken, newRefreshToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          tokenManager.clearTokens();
          window.location.href = '/auth/login';
          return Promise.reject(refreshError);
        }
      } else {
        tokenManager.clearTokens();
        window.location.href = '/auth/login';
      }
    }

    // Mostrar toast de erro para erros de rede
    if (!error.response) {
      toast.error('Erro de conexão. Verifique sua internet.');
    } else if (error.response.status >= 500) {
      toast.error('Erro interno do servidor. Tente novamente.');
    }

    return Promise.reject(error);
  }
);
