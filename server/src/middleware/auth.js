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
        logger.info(`[AUTH DEBUG] Token decoded: ${JSON.stringify(decoded)}`);

        // Buscar usuário atual
        const users = await query(
            'SELECT id, email, nome, tipo_usuario, status, primeiro_acesso, lgpd_aceite, foto_url FROM usuarios WHERE id = ? AND status = ?',
            [decoded.userId, 'ativo']
        );
        logger.info(`[AUTH DEBUG] Users found: ${users.length}`);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
        }

        req.user = users[0];
        logger.info(`[AUTH DEBUG] req.user set: id=${req.user.id}, email=${req.user.email}`);
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
            logger.error('Authorize: Usuário não autenticado');
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        logger.info(`Authorize: Verificando roles. User tipo: ${req.user.tipo_usuario}, Roles permitidos: ${roles.join(', ')}`);

        // SuperAdmin tem acesso a TUDO exceto rotas exclusivas de aluno
        if (req.user.tipo_usuario === 'superadmin') {
            // Se a rota é APENAS para alunos (não inclui admin/professor/superadmin), bloquear
            if (roles.length === 1 && roles[0] === 'aluno') {
                logger.error(`Authorize: SuperAdmin bloqueado em rota exclusiva de aluno`);
                return res.status(403).json({ error: 'Acesso negado' });
            }
            // Caso contrário, SuperAdmin tem acesso
            logger.info(`Authorize: SuperAdmin tem acesso permitido`);
            return next();
        }

        // Para outros usuários, verificar normalmente
        if (!roles.includes(req.user.tipo_usuario)) {
            logger.error(`Authorize: Acesso negado. User tipo: ${req.user.tipo_usuario}, Roles permitidos: ${roles.join(', ')}`);
            return res.status(403).json({ error: 'Acesso negado' });
        }

        logger.info(`Authorize: Acesso permitido para ${req.user.tipo_usuario}`);
        next();
    };
};

// Middleware para admin apenas
const adminOnly = authorize('admin');

// Middleware para superadmin apenas
const superAdminOnly = authorize('superadmin');

// Middleware para admin ou superadmin
const adminOrSuperAdmin = authorize('admin', 'superadmin');

// Middleware para admin e professor
const adminOrTeacher = authorize('admin', 'professor');

// Middleware para verificar se é o próprio usuário ou admin
const selfOrAdmin = async (req, res, next) => {
    try {
        const targetUserId = parseInt(req.params.id || req.params.userId);

        if (req.user.tipo_usuario === 'admin' || req.user.tipo_usuario === 'superadmin' || req.user.id === targetUserId) {
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
    superAdminOnly,
    adminOrSuperAdmin,
    adminOrTeacher,
    selfOrAdmin
};