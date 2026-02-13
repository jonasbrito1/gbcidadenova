const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

/**
 * ROTAS APRIMORADAS DE AUTENTICAÇÃO
 * - Primeiro acesso com redefinição obrigatória de senha
 * - Aceite de termos LGPD
 * - Recuperação de senha
 */

// ========================================
// PRIMEIRO ACESSO
// ========================================

/**
 * Verificar status de primeiro acesso
 * Retorna se usuário precisa alterar senha e aceitar LGPD
 */
router.get('/first-login-status', authenticateToken, async (req, res) => {
    try {
        const [user] = await query(
            'SELECT primeiro_acesso, lgpd_aceite FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({
            primeiro_acesso: Boolean(user.primeiro_acesso),
            lgpd_aceite: Boolean(user.lgpd_aceite),
            requires_password_change: Boolean(user.primeiro_acesso),
            requires_lgpd_consent: !Boolean(user.lgpd_aceite)
        });

    } catch (error) {
        logger.error('Erro ao verificar status de primeiro acesso:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * Redefinir senha no primeiro acesso
 */
router.post('/first-login/change-password', [
    authenticateToken,
    body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Nova senha deve ter pelo menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas e números')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Buscar usuário
        const [user] = await query(
            'SELECT senha, primeiro_acesso FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const isValid = await bcrypt.compare(currentPassword, user.senha);
        if (!isValid) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Verificar se nova senha é diferente da atual
        const isSamePassword = await bcrypt.compare(newPassword, user.senha);
        if (isSamePassword) {
            return res.status(400).json({ error: 'Nova senha deve ser diferente da senha atual' });
        }

        // Gerar hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Atualizar senha e marcar primeiro acesso como concluído
        await query(`
            UPDATE usuarios
            SET senha = ?,
                primeiro_acesso = FALSE,
                updated_at = NOW()
            WHERE id = ?
        `, [hashedPassword, req.user.id]);

        logger.info(`Senha alterada no primeiro acesso: ${req.user.email}`);

        res.json({
            message: 'Senha alterada com sucesso',
            primeiro_acesso_concluido: true
        });

    } catch (error) {
        logger.error('Erro ao alterar senha no primeiro acesso:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========================================
// ACEITE LGPD
// ========================================

/**
 * Registrar aceite dos termos LGPD
 */
router.post('/lgpd/accept', authenticateToken, async (req, res) => {
    try {
        const ipOrigem = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;

        await query(`
            UPDATE usuarios
            SET lgpd_aceite = TRUE,
                lgpd_aceite_data = NOW(),
                lgpd_aceite_ip = ?
            WHERE id = ?
        `, [ipOrigem, req.user.id]);

        logger.info(`Aceite LGPD registrado: ${req.user.email} de IP ${ipOrigem}`);

        res.json({
            message: 'Consentimento LGPD registrado com sucesso',
            lgpd_aceite: true,
            data_aceite: new Date()
        });

    } catch (error) {
        logger.error('Erro ao registrar aceite LGPD:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * Verificar status do aceite LGPD
 */
router.get('/lgpd/status', authenticateToken, async (req, res) => {
    try {
        const [user] = await query(
            'SELECT lgpd_aceite, lgpd_aceite_data, lgpd_aceite_ip FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({
            lgpd_aceite: Boolean(user.lgpd_aceite),
            data_aceite: user.lgpd_aceite_data,
            ip_aceite: user.lgpd_aceite_ip
        });

    } catch (error) {
        logger.error('Erro ao verificar status LGPD:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========================================
// RECUPERAÇÃO DE SENHA
// ========================================

/**
 * Solicitar reset de senha
 */
router.post('/password-reset/request', [
    body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Buscar usuário
        const [user] = await query(
            'SELECT id, nome, email FROM usuarios WHERE email = ? AND status = "ativo"',
            [email]
        );

        // Sempre retornar sucesso mesmo se usuário não existir (segurança)
        if (!user) {
            logger.warn(`Tentativa de reset para email não cadastrado: ${email}`);
            return res.json({
                message: 'Se o email existir, você receberá instruções para redefinir sua senha'
            });
        }

        // Gerar token de reset (válido por 1 hora)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Salvar token no banco - usando DATE_ADD do MySQL para evitar problemas de timezone
        await query(`
            UPDATE usuarios
            SET reset_token = ?,
                reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR)
            WHERE id = ?
        `, [hashedToken, user.id]);

        // Enviar email com link de reset
        await sendPasswordResetEmail({
            nome: user.nome,
            email: user.email,
            resetToken: resetToken, // Token não hasheado para o link
            usuarioId: user.id
        });

        logger.info(`Reset de senha solicitado: ${email}`);

        res.json({
            message: 'Se o email existir, você receberá instruções para redefinir sua senha'
        });

    } catch (error) {
        logger.error('Erro ao solicitar reset de senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * Verificar token de reset
 */
router.get('/password-reset/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Hash do token para comparação
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Buscar usuário com token válido
        const [user] = await query(`
            SELECT id, nome, email
            FROM usuarios
            WHERE reset_token = ?
              AND reset_token_expiry > NOW()
              AND status = 'ativo'
        `, [hashedToken]);

        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado' });
        }

        res.json({
            valid: true,
            email: user.email
        });

    } catch (error) {
        logger.error('Erro ao verificar token de reset:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * Resetar senha usando token
 */
router.post('/password-reset/confirm', [
    body('token').notEmpty().withMessage('Token é obrigatório'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Nova senha deve ter pelo menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas e números')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, newPassword } = req.body;

        // Hash do token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Buscar usuário
        const [user] = await query(`
            SELECT id, email
            FROM usuarios
            WHERE reset_token = ?
              AND reset_token_expiry > NOW()
              AND status = 'ativo'
        `, [hashedToken]);

        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado' });
        }

        // Gerar hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Atualizar senha e limpar token
        await query(`
            UPDATE usuarios
            SET senha = ?,
                reset_token = NULL,
                reset_token_expiry = NULL,
                updated_at = NOW()
            WHERE id = ?
        `, [hashedPassword, user.id]);

        logger.info(`Senha resetada com sucesso: ${user.email}`);

        res.json({
            message: 'Senha redefinida com sucesso. Você já pode fazer login.'
        });

    } catch (error) {
        logger.error('Erro ao resetar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========================================
// ALTERAR SENHA (usuário logado)
// ========================================

/**
 * Alterar senha (usuário já logado)
 */
router.post('/change-password', [
    authenticateToken,
    body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Nova senha deve ter pelo menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas e números')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Buscar senha atual
        const [user] = await query(
            'SELECT senha FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const isValid = await bcrypt.compare(currentPassword, user.senha);
        if (!isValid) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Verificar se nova senha é diferente
        const isSame = await bcrypt.compare(newPassword, user.senha);
        if (isSame) {
            return res.status(400).json({ error: 'Nova senha deve ser diferente da senha atual' });
        }

        // Gerar hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Atualizar senha
        await query(`
            UPDATE usuarios
            SET senha = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [hashedPassword, req.user.id]);

        logger.info(`Senha alterada: ${req.user.email}`);

        res.json({ message: 'Senha alterada com sucesso' });

    } catch (error) {
        logger.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
