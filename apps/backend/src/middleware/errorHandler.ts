// =============================================
// ERROR HANDLER - apps/backend/src/middleware/errorHandler.ts
// =============================================

import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger = (req as any).logger;

  // Log do erro
  logger.error('Erro capturado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Erro de validação do Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos fornecidos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // Erro de constraint do Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          error: 'Dados duplicados - registro já existe',
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          error: 'Registro não encontrado',
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Erro de banco de dados',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
  }

  // Erro de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
    });
  }

  // Erro personalizado com status code
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  // Erro interno do servidor
  return res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};