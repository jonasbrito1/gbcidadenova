const logger = require('../utils/logger');
const { captureError, captureMessage } = require('../config/sentry');

/**
 * Middleware para monitorar e log de todos os erros
 * Captura erros não tratados e envia para Sentry + logs
 */

class ErrorMonitor {
    constructor() {
        this.errorCount = 0;
        this.errorsByType = new Map();
        this.lastErrors = [];
        this.maxLastErrors = 50;
    }

    /**
     * Registrar erro
     */
    logError(error, context = {}) {
        this.errorCount++;

        // Registrar por tipo
        const errorType = error.name || 'UnknownError';
        const count = this.errorsByType.get(errorType) || 0;
        this.errorsByType.set(errorType, count + 1);

        // Adicionar aos últimos erros
        this.lastErrors.unshift({
            timestamp: new Date().toISOString(),
            type: errorType,
            message: error.message,
            stack: error.stack,
            context,
        });

        // Limitar tamanho do array
        if (this.lastErrors.length > this.maxLastErrors) {
            this.lastErrors = this.lastErrors.slice(0, this.maxLastErrors);
        }

        // Log
        logger.error('Error captured by monitor:', {
            type: errorType,
            message: error.message,
            context,
            stack: error.stack,
        });

        // Enviar para Sentry
        captureError(error, context);
    }

    /**
     * Obter estatísticas de erros
     */
    getStats() {
        return {
            totalErrors: this.errorCount,
            errorsByType: Object.fromEntries(this.errorsByType),
            lastErrors: this.lastErrors.slice(0, 10), // Últimos 10
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Resetar contadores
     */
    reset() {
        this.errorCount = 0;
        this.errorsByType.clear();
        this.lastErrors = [];
    }
}

// Singleton
const errorMonitor = new ErrorMonitor();

/**
 * Middleware Express para capturar erros
 */
const errorMonitoringMiddleware = (err, req, res, next) => {
    // Context adicional
    const context = {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
    };

    // Registrar erro
    errorMonitor.logError(err, context);

    // Passar para próximo middleware de erro
    next(err);
};

/**
 * Middleware para detectar requests lentos (possível problema de performance)
 */
const slowRequestMonitor = (threshold = 5000) => {
    return (req, res, next) => {
        const start = Date.now();

        // Sobrescrever res.send para capturar quando resposta é enviada
        const originalSend = res.send;
        res.send = function (data) {
            const duration = Date.now() - start;

            // Se request demorou mais que threshold, alertar
            if (duration > threshold) {
                const message = `Slow request detected: ${req.method} ${req.url} took ${duration}ms`;

                logger.warn(message, {
                    method: req.method,
                    url: req.url,
                    duration,
                    threshold,
                });

                // Enviar para Sentry como warning
                captureMessage(message, 'warning', {
                    method: req.method,
                    url: req.url,
                    duration,
                });
            }

            originalSend.call(this, data);
        };

        next();
    };
};

/**
 * Endpoint para obter estatísticas de erros (debug)
 */
const getErrorStats = (req, res) => {
    res.json(errorMonitor.getStats());
};

/**
 * Endpoint para resetar estatísticas (debug)
 */
const resetErrorStats = (req, res) => {
    errorMonitor.reset();
    res.json({ message: 'Error stats reset successfully' });
};

module.exports = {
    errorMonitor,
    errorMonitoringMiddleware,
    slowRequestMonitor,
    getErrorStats,
    resetErrorStats,
};
