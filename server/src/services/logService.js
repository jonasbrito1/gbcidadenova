const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Serviço de gerenciamento de logs do sistema
 * Permite visualizar, filtrar e exportar logs
 */


/**
 * Buscar logs com filtros
 * @param {Object} filters - Filtros de busca
 * @returns {Array} Lista de logs
 */
async function getLogs(filters = {}) {
    try {
        let {
            tipo,
            categoria,
            usuario_id,
            dataInicio,
            dataFim,
            limit = 100,
            offset = 0,
            search
        } = filters;

        // Filtrar strings vazias
        tipo = tipo && tipo.trim() !== '' ? tipo : null;
        categoria = categoria && categoria.trim() !== '' ? categoria : null;
        usuario_id = usuario_id && usuario_id.toString().trim() !== '' ? usuario_id : null;
        dataInicio = dataInicio && dataInicio.trim() !== '' ? dataInicio : null;
        dataFim = dataFim && dataFim.trim() !== '' ? dataFim : null;
        search = search && search.trim() !== '' ? search : null;

        let sql = `
            SELECT
                l.*,
                u.nome as usuario_nome,
                u.email as usuario_email
            FROM system_logs l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            sql += ' AND l.tipo = ?';
            params.push(tipo);
        }

        if (categoria) {
            sql += ' AND l.categoria = ?';
            params.push(categoria);
        }

        if (usuario_id) {
            sql += ' AND l.usuario_id = ?';
            params.push(usuario_id);
        }

        if (dataInicio) {
            sql += ' AND DATE(l.created_at) >= ?';
            params.push(dataInicio);
        }

        if (dataFim) {
            sql += ' AND DATE(l.created_at) <= ?';
            params.push(dataFim);
        }

        if (search) {
            sql += ' AND (l.acao LIKE ? OR l.descricao LIKE ? OR l.request_url LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Valores LIMIT e OFFSET devem ser interpolados diretamente (MySQL não aceita ? para LIMIT/OFFSET)
        const limitNum = parseInt(limit, 10) || 100;
        const offsetNum = parseInt(offset, 10) || 0;
        sql += ` ORDER BY l.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const logs = await query(sql, params);

        // Contar total para paginação
        let countSql = 'SELECT COUNT(*) as total FROM system_logs l WHERE 1=1';
        const countParams = [];

        if (tipo) {
            countSql += ' AND l.tipo = ?';
            countParams.push(tipo);
        }

        if (categoria) {
            countSql += ' AND l.categoria = ?';
            countParams.push(categoria);
        }

        if (usuario_id) {
            countSql += ' AND l.usuario_id = ?';
            countParams.push(usuario_id);
        }

        if (dataInicio) {
            countSql += ' AND l.created_at >= ?';
            countParams.push(dataInicio);
        }

        if (dataFim) {
            countSql += ' AND l.created_at <= ?';
            countParams.push(dataFim);
        }

        if (search) {
            countSql += ' AND (l.acao LIKE ? OR l.descricao LIKE ? OR l.request_url LIKE ?)';
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern, searchPattern);
        }

        const countResult = await query(countSql, countParams);

        return {
            logs,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
    } catch (error) {
        logger.error('Erro ao buscar logs:', error);
        throw error;
    }
}

/**
 * Buscar estatísticas de logs
 * @returns {Object} Estatísticas
 */
async function getLogStats() {
    try {
        const statsResult = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN tipo = 'error' THEN 1 ELSE 0 END) as errors,
                SUM(CASE WHEN tipo = 'warning' THEN 1 ELSE 0 END) as warnings,
                SUM(CASE WHEN tipo = 'critical' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN tipo = 'security' THEN 1 ELSE 0 END) as security,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last_24h,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last_7d
            FROM system_logs
        `);
        const stats = statsResult[0];

        // Top 5 usuários com mais ações
        const topUsers = await query(`
            SELECT
                u.id,
                u.nome,
                u.email,
                COUNT(*) as total_acoes
            FROM system_logs l
            JOIN usuarios u ON l.usuario_id = u.id
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY u.id, u.nome, u.email
            ORDER BY total_acoes DESC
            LIMIT 5
        `);

        // Logs por categoria (últimos 7 dias)
        const byCategory = await query(`
            SELECT
                categoria,
                COUNT(*) as total
            FROM system_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY categoria
            ORDER BY total DESC
        `);

        return {
            ...stats,
            topUsers,
            byCategory
        };
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de logs:', error);
        throw error;
    }
}

/**
 * Criar log manualmente
 * @param {Object} logData - Dados do log
 */
async function createLog(logData) {
    try {
        const {
            tipo = 'info',
            categoria = 'system',
            usuario_id = null,
            acao,
            descricao = null,
            ip_address = null,
            metadata = null
        } = logData;

        await query(`
            INSERT INTO system_logs (
                tipo,
                categoria,
                usuario_id,
                acao,
                descricao,
                ip_address,
                metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            tipo,
            categoria,
            usuario_id,
            acao,
            descricao,
            ip_address,
            metadata ? JSON.stringify(metadata) : null
        ]);

        logger.info(`Log criado: ${tipo} - ${acao}`);
    } catch (error) {
        logger.error('Erro ao criar log:', error);
        throw error;
    }
}

/**
 * Deletar logs antigos (utilitário)
 * @param {number} days - Número de dias a manter
 */
async function deleteOldLogs(days = 90) {
    try {
        const result = await query(`
            DELETE FROM system_logs
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [days]);

        logger.info(`${result.affectedRows} logs antigos deletados (>${days} dias)`);
        return result.affectedRows;
    } catch (error) {
        logger.error('Erro ao deletar logs antigos:', error);
        throw error;
    }
}

module.exports = {
    getLogs,
    getLogStats,
    createLog,
    deleteOldLogs
};
