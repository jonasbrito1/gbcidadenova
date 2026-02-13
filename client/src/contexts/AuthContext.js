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
          // Atualizar com dados mais recentes do servidor
          const updatedUser = response.data.user;
          setUser(updatedUser);
          localStorage.setItem('gb_user', JSON.stringify(updatedUser));
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
      console.log('=== [AuthContext] INÍCIO DO LOGIN ===');
      console.log('[AuthContext] Email:', email);
      console.log('[AuthContext] Password length:', password?.length);
      console.log('[AuthContext] Remember Me:', rememberMe);

      console.log('[AuthContext] Chamando authService.login...');
      const response = await authService.login({ email, password, rememberMe });
      console.log('[AuthContext] Resposta recebida do authService:', response);
      console.log('[AuthContext] response.data:', response.data);

      const { token, user: userData } = response.data;
      console.log('[AuthContext] Token extraído:', token ? 'SIM ('+token.substring(0, 20)+'...)' : 'NÃO');
      console.log('[AuthContext] User Data extraído:', userData);

      if (!token || !userData) {
        console.error('[AuthContext] ❌ Token ou dados do usuário não encontrados na resposta');
        return {
          success: false,
          error: 'Resposta inválida do servidor'
        };
      }

      // Salvar no localStorage
      console.log('[AuthContext] Salvando no localStorage...');
      localStorage.setItem('gb_token', token);
      localStorage.setItem('gb_user', JSON.stringify(userData));
      console.log('[AuthContext] Dados salvos no localStorage');

      // Atualizar estado
      console.log('[AuthContext] Atualizando estado...');
      setUser(userData);
      setIsAuthenticated(true);

      console.log('[AuthContext] ✅ Login realizado com sucesso!');
      console.log('[AuthContext] Usuário:', userData.nome, '('+userData.tipo_usuario+')');
      return { success: true, user: userData };
    } catch (error) {
      console.error('[AuthContext] ❌ ERRO CAPTURADO NO CATCH');
      console.error('[AuthContext] Tipo do erro:', error.constructor.name);
      console.error('[AuthContext] Mensagem:', error.message);
      console.error('[AuthContext] Stack:', error.stack);
      console.error('[AuthContext] error.response:', error.response);
      console.error('[AuthContext] error.response?.data:', error.response?.data);
      console.error('[AuthContext] error.response?.status:', error.response?.status);

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Erro ao fazer login';
      console.error('[AuthContext] Mensagem de erro final:', errorMessage);

      return {
        success: false,
        error: errorMessage
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
    if (!user) return false;

    // SuperAdmin tem acesso a TUDO exceto rotas exclusivas de aluno
    if (user.tipo_usuario === 'superadmin') {
      // Se a lista de roles contém APENAS 'aluno', bloquear SuperAdmin
      if (roles.length === 1 && roles[0] === 'aluno') {
        return false;
      }
      // Caso contrário, SuperAdmin tem acesso
      return true;
    }

    // Para outros usuários, verificar normalmente
    return roles.includes(user.tipo_usuario);
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