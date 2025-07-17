// =============================================
// UTILS - apps/backend/src/utils/tokenUtils.ts
// =============================================

import jwt from 'jsonwebtoken';

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as any;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};