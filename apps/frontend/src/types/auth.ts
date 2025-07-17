
// =============================================
// TYPES - apps/frontend/src/types/auth.ts
// =============================================

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'instructor' | 'front_desk' | 'student';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
