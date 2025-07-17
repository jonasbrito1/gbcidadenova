// =============================================
// TOKEN MANAGER - apps/frontend/src/utils/tokenManager.ts
// =============================================

const ACCESS_TOKEN_KEY = 'gb_access_token';
const REFRESH_TOKEN_KEY = 'gb_refresh_token';

export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isTokenExpiringSoon: (): boolean => {
    const token = tokenManager.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expTime = payload.exp * 1000;
      const currentTime = Date.now();
      // Consider token expiring soon if less than 5 minutes left
      return expTime - currentTime < 5 * 60 * 1000;
    } catch {
      return false;
    }
  },
};