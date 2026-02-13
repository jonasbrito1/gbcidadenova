const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/first-login/change-password
 * Alterar senha no primeiro acesso
 */
router.post('/first-login/change-password', [
    authenticateToken,
    body('currentPassword').notEmpty().withMessage('Senha temporária é obrigatória'),
    body('newPassword').isLength({ min: 8 }).withMessage('Nova senha deve ter no mínimo 8 caracteres'),
    body('newPassword').matches(/[A-Z]/).withMessage('Nova senha deve conter pelo menos uma letra maiúscula'),
    body('newPassword').matches(/[a-z]/).withMessage('Nova senha deve conter pelo menos uma letra minúscula'),
    body('newPassword').matches(/\d/).withMessage('Nova senha deve conter pelo menos um número')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Buscar usuário
        const users = await query(
            'SELECT id, email, senha, primeiro_acesso FROM usuarios WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = users[0];

        // Verificar se é primeiro acesso
        if (!user.primeiro_acesso) {
            return res.status(400).json({ error: 'Esta funcionalidade é apenas para primeiro acesso' });
        }

        // Verificar senha temporária
        const isValidPassword = await bcrypt.compare(currentPassword, user.senha);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Senha temporária incorreta' });
        }

        // Validar que nova senha é diferente da temporária
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'A nova senha deve ser diferente da senha temporária' });
        }

        // Hash da nova senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Atualizar senha e marcar primeiro acesso como concluído
        await query(
            'UPDATE usuarios SET senha = ?, primeiro_acesso = FALSE, updated_at = NOW() WHERE id = ?',
            [hashedPassword, userId]
        );

        logger.info(`Primeiro acesso - Senha alterada: ${user.email}`);

        res.json({
            message: 'Senha alterada com sucesso',
            success: true
        });

    } catch (error) {
        logger.error('Erro ao alterar senha no primeiro acesso:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * POST /api/auth/lgpd/accept
 * Registrar aceite dos termos LGPD
 */
router.post('/lgpd/accept', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userIp = req.ip || req.connection.remoteAddress;

        // Buscar usuário
        const users = await query(
            'SELECT id, email, lgpd_aceite FROM usuarios WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = users[0];

        // Verificar se já aceitou
        if (user.lgpd_aceite) {
            return res.status(400).json({ error: 'Termos LGPD já foram aceitos anteriormente' });
        }

        // Registrar aceite com IP e data/hora
        await query(
            'UPDATE usuarios SET lgpd_aceite = TRUE, lgpd_aceite_data = NOW(), lgpd_aceite_ip = ?, updated_at = NOW() WHERE id = ?',
            [userIp, userId]
        );

        logger.info(`LGPD aceito por ${user.email} (IP: ${userIp})`);

        res.json({
            message: 'Consentimento LGPD registrado com sucesso',
            success: true
        });

    } catch (error) {
        logger.error('Erro ao registrar aceite LGPD:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/auth/first-access-status
 * Verificar status do primeiro acesso
 */
router.get('/first-access-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const users = await query(
            'SELECT id, primeiro_acesso, lgpd_aceite FROM usuarios WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = users[0];

        res.json({
            needsPasswordChange: Boolean(user.primeiro_acesso),
            needsLGPDAccept: !Boolean(user.lgpd_aceite)
        });

    } catch (error) {
        logger.error('Erro ao verificar status de primeiro acesso:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
