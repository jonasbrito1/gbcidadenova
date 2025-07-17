// =============================================
// AUTH CONTROLLER - apps/backend/src/controllers/authController.ts
// =============================================

import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { generateTokens, verifyRefreshToken } from '../utils/tokenUtils';
import { validateInput } from '../utils/validation';

// Schemas de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  twoFactorToken: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const authController = {
  // Login
  login: async (req: Request, res: Response) => {
    try {
      const { email, password, twoFactorToken } = validateInput(loginSchema, req.body);

      // Buscar usuário
      const user = await req.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          studentProfile: true,
          instructorProfile: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas',
        });
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas',
        });
      }

      // Verificar status do usuário
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Conta inativa ou suspensa',
        });
      }

      // Verificar 2FA se habilitado
      if (user.twoFactorEnabled) {
        if (!twoFactorToken) {
          return res.status(200).json({
            success: true,
            requiresTwoFactor: true,
            message: 'Token de dois fatores necessário',
          });
        }

        // Aqui você implementaria a verificação do 2FA
        // const isValidToken = verify2FAToken(user.twoFactorSecret, twoFactorToken);
        // if (!isValidToken) {
        //   return res.status(401).json({
        //     success: false,
        //     error: 'Token de dois fatores inválido',
        //   });
        // }
      }

      // Gerar tokens
      const tokens = generateTokens(user.id);

      // Salvar refresh token no Redis
      await req.redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

      // Atualizar último login
      await req.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Log de auditoria
      req.logger.info('Login realizado', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      // Remover dados sensíveis
      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });

    } catch (error) {
      req.logger.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Refresh Token
  refreshToken: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = validateInput(refreshTokenSchema, req.body);

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token inválido',
        });
      }

      // Verificar se token existe no Redis
      const storedToken = await req.redis.get(`refresh_token:${decoded.userId}`);
      if (storedToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token inválido',
        });
      }

      // Buscar usuário
      const user = await req.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Usuário não encontrado ou inativo',
        });
      }

      // Gerar novos tokens
      const newTokens = generateTokens(user.id);

      // Atualizar refresh token no Redis
      await req.redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, newTokens.refreshToken);

      res.json({
        success: true,
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        },
      });

    } catch (error) {
      req.logger.error('Erro no refresh token:', error);
      res.status(401).json({
        success: false,
        error: 'Refresh token inválido',
      });
    }
  },

  // Get Current User
  getCurrentUser: async (req: AuthRequest, res: Response) => {
    try {
      const user = await req.prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          studentProfile: true,
          instructorProfile: true,
        },
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
          studentProfile: true,
          instructorProfile: true,
        },
      });

      res.json({
        success: true,
        data: user,
      });

    } catch (error) {
      req.logger.error('Erro ao buscar usuário atual:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Logout
  logout: async (req: AuthRequest, res: Response) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (token) {
        // Adicionar token à blacklist
        const decoded = jwt.decode(token) as any;
        if (decoded?.exp) {
          const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            await req.redis.setEx(`blacklist:${token}`, expiresIn, 'true');
          }
        }
      }

      // Remover refresh token do Redis
      await req.redis.del(`refresh_token:${req.user!.id}`);

      req.logger.info('Logout realizado', {
        userId: req.user!.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Logout realizado com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Esqueci minha senha
  forgotPassword: async (req: Request, res: Response) => {
    try {
      const { email } = validateInput(forgotPasswordSchema, req.body);

      const user = await req.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Sempre retorna sucesso por segurança
      if (!user) {
        return res.json({
          success: true,
          message: 'Se o email existir, você receberá instruções para redefinir sua senha',
        });
      }

      // Gerar token de reset
      const resetToken = jwt.sign(
        { userId: user.id, type: 'reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Salvar token no banco
      await req.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        },
      });

      // Enviar email (implementar serviço de email)
      // await emailService.sendPasswordReset(user.email, resetToken);

      req.logger.info('Solicitação de reset de senha', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Se o email existir, você receberá instruções para redefinir sua senha',
      });

    } catch (error) {
      req.logger.error('Erro no esqueci senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },

  // Reset de senha
  resetPassword: async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = validateInput(resetPasswordSchema, req.body);

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'reset') {
        return res.status(400).json({
          success: false,
          error: 'Token inválido',
        });
      }

      // Buscar usuário
      const user = await req.prisma.user.findUnique({
        where: { 
          id: decoded.userId,
          passwordResetToken: token,
        },
      });

      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Token inválido ou expirado',
        });
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Atualizar senha e limpar tokens de reset
      await req.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      req.logger.info('Senha resetada', {
        userId: user.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso',
      });

    } catch (error) {
      req.logger.error('Erro no reset de senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  },
};