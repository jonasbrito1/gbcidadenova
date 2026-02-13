const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Serviço de segurança e monitoramento de ameaças
 * Gerencia eventos de segurança, bloqueios de IP e detecção de ataques
 */

/**
 * Registrar evento de segurança
 * @param {Object} eventData - Dados do evento
 */
async function logSecurityEvent(eventData) {
    try {
        const {
            tipo,
            severidade = 'media',
            usuario_id = null,
            email_tentativa = null,
            ip_address,
            user_agent = null,
            descricao = null,
            acao_tomada = null,
            bloqueado = false,
            bloqueio_ate = null,
            metadata = null
        } = eventData;

        await query(`
            INSERT INTO security_events (
                tipo,
                severidade,
                usuario_id,
                email_tentativa,
                ip_address,
                user_agent,
                descricao,
                acao_tomada,
                bloqueado,
                bloqueio_ate,
                metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tipo,
            severidade,
            usuario_id,
            email_tentativa,
            ip_address,
            user_agent,
            descricao,
            acao_tomada,
            bloqueado,
            bloqueio_ate,
            metadata ? JSON.stringify(metadata) : null
        ]);

        logger.info(`Evento de segurança registrado: ${tipo} - ${severidade}`);
    } catch (error) {
        logger.error('Erro ao registrar evento de segurança:', error);
        throw error;
    }
}

/**
 * Buscar eventos de segurança com filtros
 * @param {Object} filters - Filtros de busca
 * @returns {Array} Lista de eventos
 */
async function getSecurityEvents(filters = {}) {
    try {
        const {
            tipo,
            severidade,
            ip_address,
            dataInicio,
            dataFim,
            limit = 100,
            offset = 0
        } = filters;

        let sql = `
            SELECT
                s.*,
                u.nome as usuario_nome,
                u.email as usuario_email
            FROM security_events s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            sql += ' AND s.tipo = ?';
            params.push(tipo);
        }

        if (severidade) {
            sql += ' AND s.severidade = ?';
            params.push(severidade);
        }

        if (ip_address) {
            sql += ' AND s.ip_address = ?';
            params.push(ip_address);
        }

        if (dataInicio) {
            sql += ' AND s.created_at >= ?';
            params.push(dataInicio);
        }

        if (dataFim) {
            sql += ' AND s.created_at <= ?';
            params.push(dataFim);
        }

        // Valores LIMIT e OFFSET devem ser interpolados diretamente (MySQL não aceita ? para LIMIT/OFFSET)
        const limitNum = parseInt(limit, 10) || 100;
        const offsetNum = parseInt(offset, 10) || 0;
        sql += ` ORDER BY s.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const events = await query(sql, params);

        // Contar total
        let countSql = 'SELECT COUNT(*) as total FROM security_events s WHERE 1=1';
        const countParams = [];

        if (tipo) {
            countSql += ' AND s.tipo = ?';
            countParams.push(tipo);
        }

        if (severidade) {
            countSql += ' AND s.severidade = ?';
            countParams.push(severidade);
        }

        if (ip_address) {
            countSql += ' AND s.ip_address = ?';
            countParams.push(ip_address);
        }

        if (dataInicio) {
            countSql += ' AND s.created_at >= ?';
            countParams.push(dataInicio);
        }

        if (dataFim) {
            countSql += ' AND s.created_at <= ?';
            countParams.push(dataFim);
        }

        const countResult = await query(countSql, countParams);

        return {
            events,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
    } catch (error) {
        logger.error('Erro ao buscar eventos de segurança:', error);
        throw error;
    }
}

/**
 * Buscar estatísticas de segurança
 * @returns {Object} Estatísticas
 */
async function getSecurityStats() {
    try {
        const statsResult = await query(`
            SELECT
                COUNT(*) as total_eventos,
                SUM(CASE WHEN tipo = 'login_failed' THEN 1 ELSE 0 END) as login_failed,
                SUM(CASE WHEN tipo = 'brute_force' THEN 1 ELSE 0 END) as brute_force,
                SUM(CASE WHEN tipo = 'suspicious_activity' THEN 1 ELSE 0 END) as suspicious,
                SUM(CASE WHEN severidade = 'critica' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN bloqueado = 1 THEN 1 ELSE 0 END) as ips_blocked,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last_24h,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last_7d
            FROM security_events
        `);
        const stats = statsResult[0];

        // IPs bloqueados atualmente
        const blockedIPs = await query(`
            SELECT
                ip_address,
                COUNT(*) as tentativas,
                MAX(created_at) as ultima_tentativa,
                MAX(bloqueio_ate) as bloqueado_ate
            FROM security_events
            WHERE bloqueado = 1
            AND (bloqueio_ate IS NULL OR bloqueio_ate > NOW())
            GROUP BY ip_address
            ORDER BY tentativas DESC
            LIMIT 10
        `);

        // IPs suspeitos (muitas tentativas falhas)
        const suspiciousIPs = await query(`
            SELECT
                ip_address,
                COUNT(*) as tentativas_falhas,
                MAX(created_at) as ultima_tentativa
            FROM security_events
            WHERE tipo IN ('login_failed', 'unauthorized_access')
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY ip_address
            HAVING tentativas_falhas >= 5
            ORDER BY tentativas_falhas DESC
            LIMIT 10
        `);

        // Eventos críticos recentes
        const criticalEvents = await query(`
            SELECT
                tipo,
                severidade,
                ip_address,
                descricao,
                created_at
            FROM security_events
            WHERE severidade = 'critica'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY created_at DESC
            LIMIT 10
        `);

        return {
            ...stats,
            blockedIPs,
            suspiciousIPs,
            criticalEvents
        };
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de segurança:', error);
        throw error;
    }
}

/**
 * Verificar tentativas de login falhadas e detectar brute force
 * @param {string} ip_address - IP a verificar
 * @param {string} email - Email da tentativa
 * @returns {Object} Status da verificação
 */
async function checkBruteForce(ip_address, email = null) {
    try {
        // Verificar tentativas nas últimas 15 minutos
        const attemptsResult = await query(`
            SELECT COUNT(*) as tentativas
            FROM security_events
            WHERE ip_address = ?
            AND tipo = 'login_failed'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        `, [ip_address]);

        const tentativas = attemptsResult[0].tentativas || 0;

        // Se mais de 5 tentativas, bloquear
        if (tentativas >= 5) {
            const bloqueio_ate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

            await logSecurityEvent({
                tipo: 'brute_force',
                severidade: 'alta',
                email_tentativa: email,
                ip_address,
                descricao: `Brute force detectado: ${tentativas} tentativas em 15 minutos`,
                acao_tomada: 'IP bloqueado por 30 minutos',
                bloqueado: true,
                bloqueio_ate
            });

            return {
                blocked: true,
                tentativas,
                bloqueio_ate
            };
        }

        return {
            blocked: false,
            tentativas
        };
    } catch (error) {
        logger.error('Erro ao verificar brute force:', error);
        throw error;
    }
}

/**
 * Verificar se IP está bloqueado
 * @param {string} ip_address - IP a verificar
 * @returns {boolean} Se está bloqueado
 */
async function isIPBlocked(ip_address) {
    try {
        const blocks = await query(`
            SELECT bloqueio_ate
            FROM security_events
            WHERE ip_address = ?
            AND bloqueado = 1
            AND (bloqueio_ate IS NULL OR bloqueio_ate > NOW())
            ORDER BY created_at DESC
            LIMIT 1
        `, [ip_address]);

        return blocks.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar bloqueio de IP:', error);
        throw error;
    }
}

/**
 * Desbloquear IP manualmente
 * @param {string} ip_address - IP a desbloquear
 */
async function unblockIP(ip_address) {
    try {
        await query(`
            UPDATE security_events
            SET bloqueado = 0,
                bloqueio_ate = NULL,
                acao_tomada = CONCAT(IFNULL(acao_tomada, ''), ' | Desbloqueado manualmente')
            WHERE ip_address = ?
            AND bloqueado = 1
        `, [ip_address]);

        logger.info(`IP desbloqueado: ${ip_address}`);
    } catch (error) {
        logger.error('Erro ao desbloquear IP:', error);
        throw error;
    }
}

module.exports = {
    logSecurityEvent,
    getSecurityEvents,
    getSecurityStats,
    checkBruteForce,
    isIPBlocked,
    unblockIP
};
