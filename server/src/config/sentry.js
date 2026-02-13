const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Configuração do Sentry para monitoramento de erros em produção
 *
 * IMPORTANTE: Configure a variável SENTRY_DSN no arquivo .env
 * Para obter o DSN: https://sentry.io/ -> Criar projeto -> Copiar DSN
 */

const initializeSentry = (app) => {
    // Só inicializar em produção ou se SENTRY_DSN estiver configurado
    if (!process.env.SENTRY_DSN) {
        console.log('⚠️  Sentry não configurado (SENTRY_DSN não definido)');
        return {
            initialized: false,
            errorHandler: (req, res, next) => next(),
            requestHandler: (req, res, next) => next()
        };
    }

    try {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV || 'development',
            release: process.env.npm_package_version || '1.0.0',

            // Performance monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Profiling
            profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            integrations: [
                new ProfilingIntegration(),

                // Monitorar HTTP requests
                new Sentry.Integrations.Http({ tracing: true }),

                // Monitorar Express
                new Sentry.Integrations.Express({ app }),
            ],

            // Ignorar erros conhecidos/esperados
            ignoreErrors: [
                // Erros de conexão do cliente (não são bugs do servidor)
                'ECONNRESET',
                'EPIPE',
                'ETIMEDOUT',

                // Rate limiting (esperado)
                'Too Many Requests',

                // Validação de input (esperado)
                'ValidationError',
            ],

            // Adicionar contexto extra aos erros
            beforeSend(event, hint) {
                // Não enviar erros em desenvolvimento (opcional)
                if (process.env.NODE_ENV === 'development') {
                    console.log('Sentry event (dev):', event);
                    return null; // Não enviar em dev
                }

                // Adicionar informações do usuário se disponível
                if (event.user) {
                    // Não enviar dados sensíveis
                    delete event.user.ip_address;
                    delete event.user.email; // Se quiser manter privacidade
                }

                return event;
            },

            // Configurar tags para filtrar erros
            initialScope: {
                tags: {
                    'app.name': 'gbcidadenova-api',
                    'app.version': process.env.npm_package_version || '1.0.0',
                },
            },
        });

        console.log('✅ Sentry inicializado com sucesso');

        return {
            initialized: true,
            requestHandler: Sentry.Handlers.requestHandler(),
            tracingHandler: Sentry.Handlers.tracingHandler(),
            errorHandler: Sentry.Handlers.errorHandler({
                shouldHandleError(error) {
                    // Enviar para Sentry apenas erros 500+
                    // Não enviar 4xx (erros de cliente)
                    return error.status >= 500 || !error.status;
                },
            }),
        };
    } catch (error) {
        console.error('❌ Erro ao inicializar Sentry:', error);
        return {
            initialized: false,
            errorHandler: (req, res, next) => next(),
            requestHandler: (req, res, next) => next(),
            tracingHandler: (req, res, next) => next()
        };
    }
};

/**
 * Capturar exceções não tratadas
 */
const setupGlobalErrorHandlers = () => {
    // Capturar erros síncronos não tratados
    process.on('uncaughtException', (error) => {
        console.error('❌ UNCAUGHT EXCEPTION:', error);

        if (process.env.SENTRY_DSN) {
            Sentry.captureException(error, {
                level: 'fatal',
                tags: { type: 'uncaughtException' },
            });
        }

        // Dar tempo para Sentry enviar o erro
        setTimeout(() => {
            console.error('Servidor sendo encerrado devido a exceção não tratada');
            process.exit(1);
        }, 2000);
    });

    // Capturar promises rejeitadas não tratadas
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ UNHANDLED REJECTION em:', promise, 'razão:', reason);

        if (process.env.SENTRY_DSN) {
            Sentry.captureException(reason, {
                level: 'error',
                tags: { type: 'unhandledRejection' },
            });
        }
    });

    // Capturar warnings
    process.on('warning', (warning) => {
        console.warn('⚠️  WARNING:', warning);

        if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
            Sentry.captureMessage(warning.message, {
                level: 'warning',
                tags: { type: 'warning' },
            });
        }
    });
};

/**
 * Middleware para adicionar contexto de usuário ao Sentry
 */
const addUserContextToSentry = (req, res, next) => {
    if (req.user && process.env.SENTRY_DSN) {
        Sentry.setUser({
            id: req.user.id,
            username: req.user.username || req.user.email,
            // Não incluir dados sensíveis
        });
    }
    next();
};

/**
 * Capturar erro manualmente e enviar para Sentry
 */
const captureError = (error, context = {}) => {
    console.error('Error captured:', error);

    if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            extra: context,
        });
    }
};

/**
 * Capturar mensagem/evento customizado
 */
const captureMessage = (message, level = 'info', context = {}) => {
    console.log(`[${level.toUpperCase()}]`, message);

    if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(message, {
            level,
            extra: context,
        });
    }
};

module.exports = {
    initializeSentry,
    setupGlobalErrorHandlers,
    addUserContextToSentry,
    captureError,
    captureMessage,
    Sentry,
};
