import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Guard que verifica se o usuário precisa completar o fluxo de primeiro acesso
 * Redireciona para FirstLogin ou LGPDConsent conforme necessário
 */
const FirstAccessGuard = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('FirstAccessGuard - Verificando:', {
      isAuthenticated,
      user,
      pathname: location.pathname,
      primeiro_acesso: user?.primeiro_acesso,
      lgpd_aceite: user?.lgpd_aceite
    });

    // Não fazer nada se não estiver autenticado ou já estiver nas páginas de primeiro acesso
    if (!isAuthenticated || !user) {
      console.log('FirstAccessGuard - Não autenticado ou sem user');
      return;
    }

    // Não redirecionar se já estiver nas páginas de primeiro acesso
    const isInFirstAccessFlow = ['/first-login', '/lgpd-consent'].includes(location.pathname);
    if (isInFirstAccessFlow) {
      console.log('FirstAccessGuard - Já está no fluxo de primeiro acesso');
      return;
    }

    // Verificar se precisa alterar senha (primeiro acesso)
    // Converte para boolean para garantir compatibilidade com MySQL TINYINT
    const needsPasswordChange = Boolean(user.primeiro_acesso);
    if (needsPasswordChange) {
      console.log('✅ FirstAccessGuard - Redirecionando para alteração de senha (primeiro acesso)');
      navigate('/first-login', { replace: true });
      return;
    }

    // Verificar se precisa aceitar LGPD
    // Converte para boolean - se for false, null ou 0, precisa aceitar
    const hasAcceptedLGPD = Boolean(user.lgpd_aceite);
    if (!hasAcceptedLGPD) {
      console.log('✅ FirstAccessGuard - Redirecionando para aceite LGPD');
      navigate('/lgpd-consent', { replace: true });
      return;
    }

    console.log('✅ FirstAccessGuard - Usuário completou primeiro acesso');
  }, [user, isAuthenticated, navigate, location.pathname]);

  return children;
};

export default FirstAccessGuard;
