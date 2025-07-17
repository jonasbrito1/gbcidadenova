// =============================================
// AUTH MIDDLEWARE - apps/backend/src/middleware/auth.ts
// =============================================

import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, User } from '../types';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso não fornecido'
      });
    }

    // Verificar se token está na blacklist
    const isBlacklisted = await req.redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Buscar usuário no banco
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Usuário não encontrado ou inativo'
      });
    }

    req.user = user as User;
    next();

  } catch (error) {
    req.logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// Middleware para verificar permissões específicas
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado - permissão insuficiente'
      });
    }
    next();
  };
};