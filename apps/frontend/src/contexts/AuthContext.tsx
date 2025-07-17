
// =============================================
// AUTH CONTEXT - apps/frontend/src/contexts/AuthContext.tsx
// =============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api/authApi';
import { LoginCredentials, User } from '../types/auth';
import { tokenManager } from '../utils/tokenManager';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Query para buscar dados do usuário atual
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user'],
    queryFn: authApi.getCurrentUser,
    enabled: !!tokenManager.getToken() && isInitialized,
    retry: false,
  });

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenManager.setTokens(data.accessToken, data.refreshToken);
      queryClient.setQueryData(['user'], data.user);
      toast.success('Login realizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro no login');
    },
  });

  // Mutation para refresh token
  const refreshMutation = useMutation({
    mutationFn: authApi.refreshToken,
    onSuccess: (data) => {
      tokenManager.setTokens(data.accessToken, data.refreshToken);
    },
    onError: () => {
      logout();
    },
  });

  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = () => {
    tokenManager.clearTokens();
    queryClient.clear();
    toast.success('Logout realizado com sucesso!');
  };

  const refreshToken = async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (refreshToken) {
      await refreshMutation.mutateAsync({ refreshToken });
    }
  };

  // Auto-refresh token quando próximo do vencimento
  useEffect(() => {
    const interval = setInterval(() => {
      const token = tokenManager.getToken();
      if (token && tokenManager.isTokenExpiringSoon()) {
        refreshToken();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Inicializar contexto
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Handle token expiration
  useEffect(() => {
    if (error && error.response?.status === 401) {
      logout();
    }
  }, [error]);

  const value: AuthContextType = {
    user: user || null,
    isLoading: isLoading || loginMutation.isPending,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};