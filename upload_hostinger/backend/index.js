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

// Configurar Passport
require('./src/config/passport')(passport);

// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const studentRoutes = require('./src/routes/students');
const teacherRoutes = require('./src/routes/teachers');
const professoresRoutes = require('./src/routes/professores');
const turmasRoutes = require('./src/routes/turmas');
const financeiroRoutes = require('./src/routes/financeiro');
const frequenciaRoutes = require('./src/routes/frequencia');
const planRoutes = require('./src/routes/plans');
const paymentRoutes = require('./src/routes/payments');
const attendanceRoutes = require('./src/routes/attendance');
const dashboardRoutes = require('./src/routes/dashboard');
const reportsRoutes = require('./src/routes/reports');
const formulariosRoutes = require('./src/routes/formularios');
const gatewayRoutes = require('./src/routes/gateway');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['http://localhost:3000', 'http://localhost:8082']
        : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX || 100,
    message: 'Muitas requisições deste IP, tente novamente em alguns minutos.'
});
app.use(limiter);

// Middleware básico
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

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
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/professores', professoresRoutes);
app.use('/api/turmas', turmasRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/frequencia', frequenciaRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/formularios', formulariosRoutes);
app.use('/api/gateway', gatewayRoutes);

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

// Inicializar servidor
const startServer = async () => {
    try {
        // Testar conexão com banco
        await database.testConnection();
        logger.info('Conexão com banco de dados estabelecida');

        app.listen(PORT, () => {
            logger.info(`Servidor rodando na porta ${PORT}`);
            logger.info(`Ambiente: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('Erro ao inicializar servidor:', error);
        process.exit(1);
    }
};

// Tratamento de sinais de sistema
process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido, fechando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT recebido, fechando servidor...');
    process.exit(0);
});

startServer();