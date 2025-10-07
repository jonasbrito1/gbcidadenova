const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso requerido' });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuário atual
        const users = await query(
            'SELECT id, email, nome, tipo_usuario, status FROM usuarios WHERE id = ? AND status = ?',
            [decoded.userId, 'ativo']
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token inválido' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expirado' });
        }

        logger.error('Erro na autenticação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Middleware de autorização por tipo de usuário
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (!roles.includes(req.user.tipo_usuario)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        next();
    };
};

// Middleware para admin apenas
const adminOnly = authorize('admin');

// Middleware para admin e professor
const adminOrTeacher = authorize('admin', 'professor');

// Middleware para verificar se é o próprio usuário ou admin
const selfOrAdmin = async (req, res, next) => {
    try {
        const targetUserId = parseInt(req.params.id || req.params.userId);

        if (req.user.tipo_usuario === 'admin' || req.user.id === targetUserId) {
            return next();
        }

        // Se for aluno, verificar se está acessando seus próprios dados
        if (req.user.tipo_usuario === 'aluno') {
            const students = await query(
                'SELECT usuario_id FROM alunos WHERE usuario_id = ?',
                [req.user.id]
            );

            if (students.length > 0 && students[0].usuario_id === targetUserId) {
                return next();
            }
        }

        return res.status(403).json({ error: 'Acesso negado' });
    } catch (error) {
        logger.error('Erro na verificação de autorização:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    authenticateToken,
    authorize,
    adminOnly,
    adminOrTeacher,
    selfOrAdmin
};