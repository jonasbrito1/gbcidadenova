const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware para logging automático de requisições
 * Registra todas as requisições no system_logs
 */
const requestLogger = async (req, res, next) => {
    const startTime = Date.now();

    // Capturar dados da requisição
    const requestData = {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || null,
        userId: req.user ? req.user.id : null,
        body: req.method !== 'GET' ? req.body : null
    };

    // Interceptar o response para capturar o status
    const originalSend = res.send;
    res.send = function (data) {
        res.send = originalSend;

        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Determinar tipo e categoria do log
        let tipo = 'info';
        let categoria = 'api';

        if (statusCode >= 500) {
            tipo = 'error';
        } else if (statusCode >= 400) {
            tipo = 'warning';
        }

        // Categorizar por URL
        if (requestData.url.includes('/auth') || requestData.url.includes('/login')) {
            categoria = 'auth';
        } else if (requestData.url.includes('/user') || requestData.url.includes('/usuarios')) {
            categoria = 'user';
        } else if (requestData.url.includes('/payment') || requestData.url.includes('/pagamento')) {
            categoria = 'payment';
        } else if (requestData.url.includes('/superadmin')) {
            categoria = 'system';
            tipo = 'security';
        }

        // Registrar no banco de forma assíncrona (não bloquear resposta)
        setImmediate(async () => {
            try {
                await query(`
                    INSERT INTO system_logs (
                        tipo,
                        categoria,
                        usuario_id,
                        acao,
                        descricao,
                        ip_address,
                        user_agent,
                        request_method,
                        request_url,
                        request_body,
                        response_status,
                        metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    tipo,
                    categoria,
                    requestData.userId,
                    `${requestData.method} ${requestData.url}`,
                    `Request processada em ${responseTime}ms`,
                    requestData.ip,
                    requestData.userAgent,
                    requestData.method,
                    requestData.url,
                    requestData.body ? JSON.stringify(requestData.body) : null,
                    statusCode,
                    JSON.stringify({ responseTime })
                ]);
            } catch (error) {
                logger.error('Erro ao registrar log da requisição:', error);
            }
        });

        return originalSend.call(this, data);
    };

    next();
};

/**
 * Middleware simplificado para rotas que não precisam de logging completo
 */
const basicLogger = (req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl || req.url} - User: ${req.user ? req.user.id : 'anonymous'}`);
    next();
};

module.exports = {
    requestLogger,
    basicLogger
};
