// =============================================
// BACKEND SETUP - apps/backend/src/server.ts
// =============================================

import { PrismaClient } from '@prisma/client';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createClient } from 'redis';
import winston from 'winston';

// Importar rotas
import authRoutes from './routes/auth';
import classRoutes from './routes/classes';
import dashboardRoutes from './routes/dashboard';
import instructorRoutes from './routes/instructors';
import paymentRoutes from './routes/payments';
import studentRoutes from './routes/students';

// Importar middlewares
import { auditLogger } from './middleware/auditLogger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

// =============================================
// CONFIGURAÇÃO DO LOGGER
// =============================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gb-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// =============================================
// INICIALIZAÇÃO DO PRISMA E REDIS
// =============================================
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const redis = createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

// =============================================
// CONFIGURAÇÃO DO EXPRESS
// =============================================
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// MIDDLEWARES DE SEGURANÇA
// =============================================

// Helmet para headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configurado
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limite por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Rate limiting mais restritivo para login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login, tente novamente em 15 minutos.',
  },
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', authLimiter);

// Compressão
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================
// MIDDLEWARES CUSTOMIZADOS
// =============================================

// Middleware para adicionar instâncias globais
app.use((req, res, next) => {
  req.prisma = prisma;
  req.redis = redis;
  req.logger = logger;
  next();
});

// Middleware de auditoria
app.use('/api/', auditLogger);

// =============================================
// ROTAS
// =============================================

// Health check
app.get('/health', async (req, res) => {
  try {
    // Verificar conexão com banco
    await prisma.$queryRaw`SELECT 1`;
    
    // Verificar Redis
    await redis.ping();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/students', authMiddleware, studentRoutes);
app.use('/api/instructors', authMiddleware, instructorRoutes);
app.use('/api/classes', authMiddleware, classRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
  });
});

// =============================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// =============================================
app.use(errorHandler);

// =============================================
// INICIALIZAÇÃO DO SERVIDOR
// =============================================
async function startServer() {
  try {
    // Conectar Redis
    await redis.connect();
    logger.info('Redis conectado com sucesso');

    // Verificar conexão com banco
    await prisma.$connect();
    logger.info('PostgreSQL conectado com sucesso');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}/health`);
      logger.info(`🔧 Ambiente: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Recebido SIGINT, iniciando shutdown graceful...');
  
  try {
    await prisma.$disconnect();
    await redis.disconnect();
    logger.info('Conexões fechadas com sucesso');
    process.exit(0);
  } catch (error) {
    logger.error('Erro durante shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Recebido SIGTERM, iniciando shutdown graceful...');
  
  try {
    await prisma.$disconnect();
    await redis.disconnect();
    logger.info('Conexões fechadas com sucesso');
    process.exit(0);
  } catch (error) {
    logger.error('Erro durante shutdown:', error);
    process.exit(1);
  }
});

// Iniciar servidor
startServer();