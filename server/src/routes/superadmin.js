const express = require('express');
const router = express.Router();
const { authenticateToken, superAdminOnly } = require('../middleware/auth');
const logService = require('../services/logService');
const securityService = require('../services/securityService');
const backupService = require('../services/backupService');
const monitoringService = require('../services/monitoringService');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Aplicar autenticação e autorização em todas as rotas
router.use(authenticateToken);
router.use(superAdminOnly);

// ============================================================================
// LOGS DO SISTEMA
// ============================================================================

/**
 * GET /api/superadmin/logs
 * Buscar logs com filtros
 */
router.get('/logs', async (req, res) => {
    try {
        const filters = {
            tipo: req.query.tipo,
            categoria: req.query.categoria,
            usuario_id: req.query.usuario_id,
            dataInicio: req.query.dataInicio,
            dataFim: req.query.dataFim,
            limit: req.query.limit || 100,
            offset: req.query.offset || 0,
            search: req.query.search
        };

        const result = await logService.getLogs(filters);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar logs:', error);
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
});

/**
 * GET /api/superadmin/logs/stats
 * Estatísticas de logs
 */
router.get('/logs/stats', async (req, res) => {
    try {
        const stats = await logService.getLogStats();
        res.json(stats);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de logs:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ============================================================================
// SEGURANÇA E EVENTOS
// ============================================================================

/**
 * GET /api/superadmin/security/events
 * Buscar eventos de segurança
 */
router.get('/security/events', async (req, res) => {
    try {
        const filters = {
            tipo: req.query.tipo,
            severidade: req.query.severidade,
            ip_address: req.query.ip_address,
            dataInicio: req.query.dataInicio,
            dataFim: req.query.dataFim,
            limit: req.query.limit || 100,
            offset: req.query.offset || 0
        };

        const result = await securityService.getSecurityEvents(filters);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar eventos de segurança:', error);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

/**
 * GET /api/superadmin/security/stats
 * Estatísticas de segurança
 */
router.get('/security/stats', async (req, res) => {
    try {
        const stats = await securityService.getSecurityStats();
        res.json(stats);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de segurança:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

/**
 * POST /api/superadmin/security/unblock-ip
 * Desbloquear IP manualmente
 */
router.post('/security/unblock-ip', async (req, res) => {
    try {
        const { ip_address } = req.body;

        if (!ip_address) {
            return res.status(400).json({ error: 'IP obrigatório' });
        }

        await securityService.unblockIP(ip_address);

        // Registrar ação no log
        await logService.createLog({
            tipo: 'security',
            categoria: 'security',
            usuario_id: req.user.id,
            acao: 'Desbloquear IP',
            descricao: `IP ${ip_address} desbloqueado manualmente`,
            ip_address: req.ip
        });

        res.json({ message: 'IP desbloqueado com sucesso' });
    } catch (error) {
        logger.error('Erro ao desbloquear IP:', error);
        res.status(500).json({ error: 'Erro ao desbloquear IP' });
    }
});

// ============================================================================
// BACKUPS
// ============================================================================

/**
 * GET /api/superadmin/backups
 * Listar backups
 */
router.get('/backups', async (req, res) => {
    try {
        const filters = {
            tipo: req.query.tipo,
            status: req.query.status,
            limit: req.query.limit || 50,
            offset: req.query.offset || 0
        };

        const result = await backupService.getBackups(filters);
        res.json(result);
    } catch (error) {
        logger.error('Erro ao buscar backups:', error);
        res.status(500).json({ error: 'Erro ao buscar backups' });
    }
});

/**
 * GET /api/superadmin/backups/stats
 * Estatísticas de backups
 */
router.get('/backups/stats', async (req, res) => {
    try {
        const stats = await backupService.getBackupStats();
        res.json(stats);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de backups:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

/**
 * POST /api/superadmin/backups/create
 * Criar backup manual
 */
router.post('/backups/create', async (req, res) => {
    try {
        const result = await backupService.createBackup(req.user.id, 'manual');

        // Registrar ação no log
        await logService.createLog({
            tipo: 'info',
            categoria: 'system',
            usuario_id: req.user.id,
            acao: 'Criar backup manual',
            descricao: `Backup criado: ${result.filename}`,
            ip_address: req.ip
        });

        res.json(result);
    } catch (error) {
        logger.error('Erro ao criar backup:', error);
        res.status(500).json({ error: 'Erro ao criar backup' });
    }
});

/**
 * GET /api/superadmin/backups/disk-space
 * Verificar espaço em disco
 */
router.get('/backups/disk-space', async (req, res) => {
    try {
        const diskSpace = await backupService.checkDiskSpace();
        res.json(diskSpace);
    } catch (error) {
        logger.error('Erro ao verificar espaço em disco:', error);
        res.status(500).json({ error: 'Erro ao verificar espaço em disco' });
    }
});

/**
 * POST /api/superadmin/backups/cleanup
 * Limpar backups antigos
 */
router.post('/backups/cleanup', async (req, res) => {
    try {
        const keepCount = parseInt(req.body.keepCount) || 10;
        const deletedBackups = await backupService.cleanOldBackups(keepCount);

        // Registrar ação no log
        await logService.createLog({
            tipo: 'warning',
            categoria: 'system',
            usuario_id: req.user.id,
            acao: 'Limpeza de backups',
            descricao: `${deletedBackups.length} backups antigos removidos`,
            ip_address: req.ip,
            metadata: JSON.stringify({ keepCount, deleted: deletedBackups.length })
        });

        res.json({
            message: `${deletedBackups.length} backups removidos`,
            deletedBackups
        });
    } catch (error) {
        logger.error('Erro ao limpar backups:', error);
        res.status(500).json({ error: 'Erro ao limpar backups' });
    }
});

/**
 * GET /api/superadmin/backups/:id/download
 * Download de backup
 */
router.get('/backups/:id/download', async (req, res) => {
    try {
        const backupId = parseInt(req.params.id);
        const filepath = await backupService.getBackupPath(backupId);

        // Registrar ação no log
        await logService.createLog({
            tipo: 'info',
            categoria: 'system',
            usuario_id: req.user.id,
            acao: 'Download backup',
            descricao: `Backup ID ${backupId} baixado`,
            ip_address: req.ip
        });

        res.download(filepath);
    } catch (error) {
        logger.error('Erro ao baixar backup:', error);
        res.status(500).json({ error: 'Erro ao baixar backup' });
    }
});

/**
 * DELETE /api/superadmin/backups/:id
 * Deletar backup
 */
router.delete('/backups/:id', async (req, res) => {
    try {
        const backupId = parseInt(req.params.id);
        await backupService.deleteBackup(backupId);

        // Registrar ação no log
        await logService.createLog({
            tipo: 'warning',
            categoria: 'system',
            usuario_id: req.user.id,
            acao: 'Deletar backup',
            descricao: `Backup ID ${backupId} deletado`,
            ip_address: req.ip
        });

        res.json({ message: 'Backup deletado com sucesso' });
    } catch (error) {
        logger.error('Erro ao deletar backup:', error);
        res.status(500).json({ error: 'Erro ao deletar backup' });
    }
});

/**
 * POST /api/superadmin/backups/:id/restore
 * Restaurar backup
 */
router.post('/backups/:id/restore', async (req, res) => {
    try {
        const backupId = parseInt(req.params.id);
        const result = await backupService.restoreBackup(backupId, req.user.id);

        // Registrar ação no log
        await logService.createLog({
            tipo: 'security',
            categoria: 'database',
            usuario_id: req.user.id,
            acao: 'Restaurar backup',
            descricao: `Backup ID ${backupId} restaurado com sucesso`,
            ip_address: req.ip,
            metadata: JSON.stringify(result)
        });

        res.json(result);
    } catch (error) {
        logger.error('Erro ao restaurar backup:', error);
        res.status(500).json({ error: error.message || 'Erro ao restaurar backup' });
    }
});

/**
 * GET /api/superadmin/backups/:id/validate
 * Validar integridade do backup
 */
router.get('/backups/:id/validate', async (req, res) => {
    try {
        const backupId = parseInt(req.params.id);
        const result = await backupService.validateBackup(backupId);

        res.json(result);
    } catch (error) {
        logger.error('Erro ao validar backup:', error);
        res.status(500).json({ error: 'Erro ao validar backup' });
    }
});

// ============================================================================
// MONITORAMENTO
// ============================================================================

/**
 * GET /api/superadmin/monitoring/current
 * Métricas atuais do sistema
 */
router.get('/monitoring/current', async (req, res) => {
    try {
        const metrics = await monitoringService.collectSystemMetrics();
        res.json(metrics);
    } catch (error) {
        logger.error('Erro ao coletar métricas:', error);
        res.status(500).json({ error: 'Erro ao coletar métricas' });
    }
});

/**
 * GET /api/superadmin/monitoring/metrics
 * Histórico de métricas
 */
router.get('/monitoring/metrics', async (req, res) => {
    try {
        const filters = {
            period: req.query.period || '24h',
            limit: req.query.limit || 100
        };

        const metrics = await monitoringService.getMetrics(filters);
        res.json(metrics);
    } catch (error) {
        logger.error('Erro ao buscar métricas:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
});

/**
 * GET /api/superadmin/monitoring/stats
 * Estatísticas de monitoramento
 */
router.get('/monitoring/stats', async (req, res) => {
    try {
        const stats = await monitoringService.getMetricsStats();
        res.json(stats);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de monitoramento:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

/**
 * GET /api/superadmin/monitoring/system-info
 * Informações do sistema
 */
router.get('/monitoring/system-info', async (req, res) => {
    try {
        const info = monitoringService.getSystemInfo();
        res.json(info);
    } catch (error) {
        logger.error('Erro ao buscar informações do sistema:', error);
        res.status(500).json({ error: 'Erro ao buscar informações' });
    }
});

/**
 * GET /api/superadmin/monitoring/health
 * Health check do sistema
 */
router.get('/monitoring/health', async (req, res) => {
    try {
        const health = await monitoringService.getHealthCheck();
        res.json(health);
    } catch (error) {
        logger.error('Erro ao verificar saúde do sistema:', error);
        res.status(500).json({ error: 'Erro ao verificar saúde' });
    }
});

// ============================================================================
// TERMOS DE USO (LGPD)
// ============================================================================

/**
 * GET /api/superadmin/terms/versions
 * Listar versões de termos
 */
router.get('/terms/versions', async (req, res) => {
    try {
        const versions = await query(`
            SELECT
                id,
                versao,
                titulo,
                tipo,
                ativo,
                obrigatorio,
                publicado_em,
                (SELECT COUNT(*) FROM terms_acceptance WHERE term_version_id = terms_versions.id) as total_aceites
            FROM terms_versions
            ORDER BY publicado_em DESC
        `);

        res.json(versions);
    } catch (error) {
        logger.error('Erro ao buscar versões de termos:', error);
        res.status(500).json({ error: 'Erro ao buscar versões' });
    }
});

/**
 * GET /api/superadmin/terms/acceptances
 * Listar aceites de termos
 */
router.get('/terms/acceptances', async (req, res) => {
    try {
        const { term_version_id, limit = 100, offset = 0 } = req.query;

        let sql = `
            SELECT
                ta.*,
                u.nome as usuario_nome,
                u.email as usuario_email,
                tv.versao,
                tv.titulo as termo_titulo
            FROM terms_acceptance ta
            JOIN usuarios u ON ta.usuario_id = u.id
            JOIN terms_versions tv ON ta.term_version_id = tv.id
            WHERE 1=1
        `;
        const params = [];

        if (term_version_id) {
            sql += ' AND ta.term_version_id = ?';
            params.push(term_version_id);
        }

        sql += ' ORDER BY ta.aceito_em DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const acceptances = await query(sql, params);

        // Contar total
        let countSql = 'SELECT COUNT(*) as total FROM terms_acceptance WHERE 1=1';
        const countParams = [];

        if (term_version_id) {
            countSql += ' AND term_version_id = ?';
            countParams.push(term_version_id);
        }

        const [countResult] = await query(countSql, countParams);

        res.json({
            acceptances,
            total: countResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('Erro ao buscar aceites de termos:', error);
        res.status(500).json({ error: 'Erro ao buscar aceites' });
    }
});

/**
 * GET /api/superadmin/terms/stats
 * Estatísticas de termos
 */
router.get('/terms/stats', async (req, res) => {
    try {
        const [stats] = await query(`
            SELECT
                (SELECT COUNT(*) FROM terms_versions WHERE ativo = 1) as versoes_ativas,
                (SELECT COUNT(*) FROM terms_acceptance) as total_aceites,
                (SELECT COUNT(DISTINCT usuario_id) FROM terms_acceptance) as usuarios_aceitaram,
                (SELECT COUNT(*) FROM usuarios WHERE status = 'ativo') as total_usuarios
        `);

        // Aceites por versão
        const byVersion = await query(`
            SELECT
                tv.versao,
                tv.titulo,
                COUNT(ta.id) as total_aceites
            FROM terms_versions tv
            LEFT JOIN terms_acceptance ta ON tv.id = ta.term_version_id
            GROUP BY tv.id, tv.versao, tv.titulo
            ORDER BY tv.publicado_em DESC
        `);

        res.json({
            ...stats,
            byVersion
        });
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de termos:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ============================================================================
// DASHBOARD GERAL
// ============================================================================

/**
 * GET /api/superadmin/dashboard
 * Dashboard completo do SuperAdmin
 */
router.get('/dashboard', async (req, res) => {
    try {
        const [dashboard] = {
            logs: await logService.getLogStats(),
            security: await securityService.getSecurityStats(),
            backups: await backupService.getBackupStats(),
            monitoring: await monitoringService.getMetricsStats(),
            system: monitoringService.getSystemInfo()
        };

        res.json(dashboard);
    } catch (error) {
        logger.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
});

module.exports = router;
