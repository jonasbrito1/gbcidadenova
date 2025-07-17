// =============================================
// CUSTOM HOOKS - apps/frontend/src/hooks/useAuth.ts
// =============================================

import { useAuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  return useAuthContext();
};