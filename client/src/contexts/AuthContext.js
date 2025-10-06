import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar token ao carregar a aplicação
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('gb_token');
      const savedUser = localStorage.getItem('gb_user');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);

        // Verificar se o token ainda é válido
        const response = await authService.verifyToken();
        if (response.data.valid) {
          setUser(response.data.user);
        } else {
          // Token inválido, limpar dados
          logout();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      console.log('Iniciando login com email:', email);
      const response = await authService.login({ email, password, rememberMe });
      console.log('Resposta do login:', response.data);

      const { token, user: userData } = response.data;

      if (!token || !userData) {
        console.error('Token ou dados do usuário não encontrados na resposta');
        return {
          success: false,
          error: 'Resposta inválida do servidor'
        };
      }

      // Salvar no localStorage
      localStorage.setItem('gb_token', token);
      localStorage.setItem('gb_user', JSON.stringify(userData));

      // Atualizar estado
      setUser(userData);
      setIsAuthenticated(true);

      console.log('Login realizado com sucesso para o usuário:', userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro no login:', error);
      console.error('Detalhes do erro:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || 'Erro ao fazer login'
      };
    }
  };

  const logout = async () => {
    try {
      // Tentar fazer logout no backend
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar dados locais independentemente do resultado
      localStorage.removeItem('gb_token');
      localStorage.removeItem('gb_user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('gb_user', JSON.stringify(userData));
  };

  const isAdmin = () => {
    return user && user.tipo_usuario === 'admin';
  };

  const isTeacher = () => {
    return user && user.tipo_usuario === 'professor';
  };

  const isStudent = () => {
    return user && user.tipo_usuario === 'aluno';
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.tipo_usuario);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    isAdmin,
    isTeacher,
    isStudent,
    hasRole,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};