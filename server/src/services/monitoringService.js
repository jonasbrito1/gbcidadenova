const { query } = require('../config/database');
const logger = require('../utils/logger');
const os = require('os');

/**
 * Serviço de monitoramento do sistema
 * Coleta e armazena métricas de performance e uso
 */

/**
 * Coletar métricas atuais do sistema
 * @returns {Object} Métricas do sistema
 */
async function collectSystemMetrics() {
    try {
        // Métricas do sistema operacional
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

        // CPU load average (últimos 1, 5 e 15 minutos)
        const loadAvg = os.loadavg();
        const cpuUsage = (loadAvg[0] * 100 / os.cpus().length).toFixed(2);

        // Uptime
        const uptime = os.uptime();

        // Métricas do banco de dados
        const dbSizeResult = await query(`
            SELECT
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
        `);

        // Conexões ativas
        const connectionsResult = await query('SHOW STATUS LIKE "Threads_connected"');
        const activeConnections = parseInt(connectionsResult[0]?.Value || 0);

        // Usuários online (últimos 5 minutos de atividade)
        const usersOnlineResult = await query(`
            SELECT COUNT(DISTINCT usuario_id) as total
            FROM system_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            AND usuario_id IS NOT NULL
        `);

        // Taxa de erro (últimos 5 minutos)
        const errorRateResult = await query(`
            SELECT
                (SUM(CASE WHEN tipo IN ('error', 'critical') THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(*), 0) * 100) as rate
            FROM system_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `);

        // Tempo médio de resposta (últimos 5 minutos)
        const avgResponseResult = await query(`
            SELECT AVG(JSON_EXTRACT(metadata, '$.responseTime')) as avg_time
            FROM system_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            AND metadata IS NOT NULL
        `);

        // Requisições por minuto (média dos últimos 5 minutos)
        const reqPerMinResult = await query(`
            SELECT COUNT(*) / 5 as rpm
            FROM system_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `);

        const metrics = {
            cpu_usage: parseFloat(cpuUsage),
            memory_usage: parseFloat(memoryUsage),
            memory_total: totalMemory,
            memory_used: usedMemory,
            memory_free: freeMemory,
            disk_usage: null, // Pode ser implementado posteriormente
            disk_total: null,
            disk_used: null,
            disk_free: null,
            active_connections: activeConnections,
            users_online: usersOnlineResult[0]?.total || 0,
            requests_per_minute: Math.round(reqPerMinResult[0]?.rpm || 0),
            avg_response_time: Math.round(avgResponseResult[0]?.avg_time || 0),
            error_rate: parseFloat((parseFloat(errorRateResult[0]?.rate) || 0).toFixed(2)),
            database_size_mb: parseFloat(dbSizeResult[0]?.size_mb || 0),
            uptime_seconds: uptime,
            load_average: parseFloat(loadAvg[0].toFixed(2))
        };

        return metrics;
    } catch (error) {
        logger.error('Erro ao coletar métricas do sistema:', error);
        throw error;
    }
}

/**
 * Salvar métricas no banco de dados
 * @param {Object} metrics - Métricas a salvar
 */
async function saveMetrics(metrics = null) {
    try {
        if (!metrics) {
            metrics = await collectSystemMetrics();
        }

        await query(`
            INSERT INTO system_metrics (
                cpu_usage,
                memory_usage,
                memory_total,
                memory_used,
                memory_free,
                disk_usage,
                disk_total,
                disk_used,
                disk_free,
                active_connections,
                users_online,
                requests_per_minute,
                avg_response_time,
                error_rate,
                database_size_mb,
                uptime_seconds,
                load_average
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            metrics.cpu_usage,
            metrics.memory_usage,
            metrics.memory_total,
            metrics.memory_used,
            metrics.memory_free,
            metrics.disk_usage,
            metrics.disk_total,
            metrics.disk_used,
            metrics.disk_free,
            metrics.active_connections,
            metrics.users_online,
            metrics.requests_per_minute,
            metrics.avg_response_time,
            metrics.error_rate,
            metrics.database_size_mb,
            metrics.uptime_seconds,
            metrics.load_average
        ]);

        logger.info('Métricas salvas no banco de dados');
    } catch (error) {
        logger.error('Erro ao salvar métricas:', error);
        throw error;
    }
}

/**
 * Buscar métricas históricas
 * @param {Object} filters - Filtros
 * @returns {Array} Métricas
 */
async function getMetrics(filters = {}) {
    try {
        const {
            period = '24h',
            limit = 100
        } = filters;

        let interval;
        switch (period) {
            case '1h':
                interval = '1 HOUR';
                break;
            case '24h':
                interval = '24 HOUR';
                break;
            case '7d':
                interval = '7 DAY';
                break;
            case '30d':
                interval = '30 DAY';
                break;
            default:
                interval = '24 HOUR';
        }

        const metrics = await query(`
            SELECT *
            FROM system_metrics
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
            ORDER BY created_at DESC
            LIMIT ?
        `, [limit]);

        return metrics;
    } catch (error) {
        logger.error('Erro ao buscar métricas:', error);
        throw error;
    }
}

/**
 * Buscar estatísticas agregadas
 * @returns {Object} Estatísticas
 */
async function getMetricsStats() {
    try {
        // Métricas atuais
        const current = await collectSystemMetrics();

        // Médias das últimas 24 horas
        const avg24hResult = await query(`
            SELECT
                AVG(cpu_usage) as avg_cpu,
                AVG(memory_usage) as avg_memory,
                AVG(users_online) as avg_users,
                MAX(users_online) as max_users,
                AVG(active_connections) as avg_connections,
                AVG(error_rate) as avg_error_rate,
                AVG(avg_response_time) as avg_response
            FROM system_metrics
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        // Picos (últimas 24 horas)
        const peaksResult = await query(`
            SELECT
                MAX(cpu_usage) as peak_cpu,
                MAX(memory_usage) as peak_memory,
                MAX(users_online) as peak_users,
                MAX(active_connections) as peak_connections
            FROM system_metrics
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        // Tendências (comparar últimas 24h com 24h anteriores)
        const trendResult = await query(`
            SELECT
                (SELECT AVG(cpu_usage) FROM system_metrics WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as cpu_now,
                (SELECT AVG(cpu_usage) FROM system_metrics WHERE created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR) AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)) as cpu_before,
                (SELECT AVG(memory_usage) FROM system_metrics WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as memory_now,
                (SELECT AVG(memory_usage) FROM system_metrics WHERE created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR) AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)) as memory_before
        `);

        const avg24h = avg24hResult[0] || {};
        const peaks = peaksResult[0] || {};
        const trend = trendResult[0] || {};

        return {
            current,
            averages: avg24h,
            peaks,
            trends: {
                cpu: trend.cpu_now && trend.cpu_before ?
                    ((trend.cpu_now - trend.cpu_before) / trend.cpu_before * 100).toFixed(2) : 0,
                memory: trend.memory_now && trend.memory_before ?
                    ((trend.memory_now - trend.memory_before) / trend.memory_before * 100).toFixed(2) : 0
            }
        };
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de métricas:', error);
        throw error;
    }
}

/**
 * Buscar informações do sistema
 * @returns {Object} Informações do sistema
 */
function getSystemInfo() {
    return {
        platform: os.platform(),
        architecture: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        nodeVersion: process.version,
        uptime: os.uptime()
    };
}

/**
 * Verificar saúde do sistema
 * @returns {Object} Status de saúde
 */
async function getHealthCheck() {
    try {
        const metrics = await collectSystemMetrics();

        const health = {
            status: 'healthy',
            checks: {
                database: { status: 'ok', message: 'Conexão ativa' },
                memory: { status: 'ok', value: metrics.memory_usage },
                cpu: { status: 'ok', value: metrics.cpu_usage },
                disk: { status: 'ok', value: metrics.database_size_mb }
            },
            timestamp: new Date()
        };

        // Verificar limites
        if (metrics.memory_usage > 90) {
            health.checks.memory.status = 'critical';
            health.checks.memory.message = 'Uso de memória crítico';
            health.status = 'critical';
        } else if (metrics.memory_usage > 75) {
            health.checks.memory.status = 'warning';
            health.checks.memory.message = 'Uso de memória alto';
            if (health.status === 'healthy') health.status = 'warning';
        }

        if (metrics.cpu_usage > 90) {
            health.checks.cpu.status = 'critical';
            health.checks.cpu.message = 'Uso de CPU crítico';
            health.status = 'critical';
        } else if (metrics.cpu_usage > 75) {
            health.checks.cpu.status = 'warning';
            health.checks.cpu.message = 'Uso de CPU alto';
            if (health.status === 'healthy') health.status = 'warning';
        }

        return health;
    } catch (error) {
        logger.error('Erro ao verificar saúde do sistema:', error);
        return {
            status: 'error',
            error: error.message,
            timestamp: new Date()
        };
    }
}

module.exports = {
    collectSystemMetrics,
    saveMetrics,
    getMetrics,
    getMetricsStats,
    getSystemInfo,
    getHealthCheck
};
