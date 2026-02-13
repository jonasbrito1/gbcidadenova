require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

// Configurar locale brasileiro
process.env.TZ = 'America/Sao_Paulo';
if (process.env.NODE_ENV !== 'production') {
    // Em desenvolvimento, definir locale
    try {
        process.env.LC_ALL = 'pt_BR.UTF-8';
        process.env.LANG = 'pt_BR.UTF-8';
    } catch (error) {
        console.warn('Não foi possível definir locale pt_BR.UTF-8');
    }
}

const database = require('./src/config/database');
const logger = require('./src/utils/logger');
const { inicializarScheduler } = require('./src/services/scheduler');
const { initializeBackupScheduler } = require('./src/schedulers/backupScheduler');

// Configurar Passport
require('./src/config/passport')(passport);

// Importar rotas
const authRoutes = require('./src/routes/auth');
const authEnhancedRoutes = require('./src/routes/auth-enhanced');
const authFirstAccessRoutes = require('./src/routes/auth_first_access');
const userRoutes = require('./src/routes/users');
const studentRoutes = require('./src/routes/students');
const studentsEnhancedRoutes = require('./src/routes/students_enhanced');
const teacherRoutes = require('./src/routes/teachers');
const professoresRoutes = require('./src/routes/professores');
const turmasRoutes = require('./src/routes/turmas');
const financeiroRoutes = require('./src/routes/financeiro');
const frequenciaRoutes = require('./src/routes/frequencia');
const frequenciaNovoRoutes = require('./src/routes/frequencia-novo');
const planRoutes = require('./src/routes/plans');
const paymentRoutes = require('./src/routes/payments');
const attendanceRoutes = require('./src/routes/attendance');
const dashboardRoutes = require('./src/routes/dashboard');
const reportsRoutes = require('./src/routes/reports');
const formulariosRoutes = require('./src/routes/formularios');
const publicFormsRoutes = require('./src/routes/public-forms');
const gatewayRoutes = require('./src/routes/gateway');

// Rotas do perfil do aluno
const studentProfileRoutes = require('./src/routes/student-profile');
const studentAttendanceRoutes = require('./src/routes/student-attendance');
const studentPaymentsRoutes = require('./src/routes/student-payments');

// Rotas do SuperAdmin
const superadminRoutes = require('./src/routes/superadmin');

// Rotas do CMS
const cmsRoutes = require('./src/routes/cms');

const app = express();
const PORT = process.env.PORT || 3000;

// Confiar em proxies (necessário para Hostinger e outros servidores com proxy reverso)
app.set('trust proxy', true);

// Middleware de segurança
app.use(helmet());

// CORS - Configuração corrigida para produção
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || 'https://gbcidadenovaam.com.br,http://gbcidadenovaam.com.br').split(',')
    : ['http://localhost:3000', 'http://localhost:4010', 'http://localhost:4011', 'http://localhost:8082'];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requisições sem origin (ex: Postman, mobile apps, SSR)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn(`[CORS] Origem bloqueada: ${origin}`);
            logger.warn(`[CORS] Origens permitidas: ${allowedOrigins.join(', ')}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Rate limiting - Configuração segura para proxy reverso
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    // Aumentar limite em desenvolvimento, manter restrito em produção
    max: process.env.NODE_ENV === 'production'
        ? (process.env.RATE_LIMIT_MAX || 100)
        : 1000, // 1000 requisições em desenvolvimento
    message: 'Muitas requisições deste IP, tente novamente em alguns minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    // Desabilitar validação rigorosa do trust proxy (necessário para express-rate-limit v6+)
    validate: { trustProxy: false },
    // Configuração segura para proxy reverso (LiteSpeed/Hostinger)
    skip: () => false,
    keyGenerator: (req) => {
        // Usar X-Forwarded-For se disponível, senão usar IP da conexão
        return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.headers['x-real-ip'] ||
               req.ip ||
               'unknown';
    }
});
app.use(limiter);

// Middleware básico
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Middleware de logging de requisições (SuperAdmin)
const { requestLogger } = require('./src/middleware/requestLogger');
app.use(requestLogger);

// Configurar charset UTF-8 para todas as respostas
app.use((req, res, next) => {
    res.charset = 'utf-8';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Inicializar Passport
app.use(passport.initialize());

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/auth', authEnhancedRoutes);
app.use('/api/auth', authFirstAccessRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentsEnhancedRoutes); // Rota aprimorada com novos campos
app.use('/api/teachers', teacherRoutes);
app.use('/api/professores', professoresRoutes);
app.use('/api/turmas', turmasRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/frequencia', frequenciaRoutes);
app.use('/api/frequencia-novo', frequenciaNovoRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/formularios', formulariosRoutes);
app.use('/api/public-forms', publicFormsRoutes); // Formulários públicos
app.use('/api/gateway', gatewayRoutes);

// Rotas do perfil do aluno
app.use('/api/student-profile', studentProfileRoutes);
app.use('/api/student-attendance', studentAttendanceRoutes);
app.use('/api/student-payments', studentPaymentsRoutes);

// Rotas do SuperAdmin
app.use('/api/superadmin', superadminRoutes);

// Rotas do CMS
app.use('/api/cms', cmsRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    logger.error('Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar servidor com PortManager (prevenção de EADDRINUSE)
const startServer = async () => {
    try {
        // Testar conexão com banco
        await database.testConnection();
        logger.info('Conexão com banco de dados estabelecida');

        // Detectar se está rodando no Docker
        const fs = require('fs');
        const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_ENV === 'true';

        // Inicializar servidor diretamente (sem PortManager para evitar loops)
        logger.info('Iniciando servidor...');
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`✅ Servidor rodando na porta ${PORT}`);
            logger.info(`Ambiente: ${process.env.NODE_ENV}`);
            inicializarScheduler();
            initializeBackupScheduler();
        });

        // Graceful shutdown
        const gracefulShutdown = () => {
            logger.info('Sinal de encerramento recebido, fechando servidor...');
            server.close(() => {
                logger.info('Servidor fechado com sucesso');
                process.exit(0);
            });

            // Força encerramento após 10 segundos
            setTimeout(() => {
                logger.error('Forçando encerramento após timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        logger.error('Erro crítico ao inicializar servidor:', error);
        logger.error('Stacktrace:', error.stack);
        process.exit(1); // PM2 vai reiniciar automaticamente se configurado
    }
};

startServer();