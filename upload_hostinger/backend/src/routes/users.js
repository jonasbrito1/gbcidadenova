const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOnly, selfOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Validações
const userValidation = [
    body('nome').trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido'),
    body('tipo_usuario').isIn(['admin', 'professor', 'aluno']).withMessage('Tipo de usuário inválido'),
    body('status').optional().isIn(['ativo', 'inativo', 'suspenso']).withMessage('Status inválido')
];

// Listar usuários (admin apenas)
router.get('/', adminOnly, async (req, res) => {
    try {
        const { tipo, status, page = 1, limit = 20, search } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (tipo) {
            whereClause += ' AND tipo_usuario = ?';
            params.push(tipo);
        }

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            whereClause += ' AND (nome LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const limitNum = parseInt(limit);
        const offsetNum = parseInt((page - 1) * limit);

        // Buscar usuários
        const [users] = await query(`
            SELECT id, nome, email, telefone, data_nascimento, endereco,
                   tipo_usuario, status, created_at, ultimo_login
            FROM usuarios
            ${whereClause}
            ORDER BY nome
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `, params);

        // Contar total
        const [countResult] = await query(`
            SELECT COUNT(*) as total FROM usuarios ${whereClause}
        `, params);

        res.json({
            users,
            total: countResult.total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult.total / limit)
        });

    } catch (error) {
        logger.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar usuário por ID
router.get('/:id', selfOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const users = await query(`
            SELECT id, nome, email, telefone, data_nascimento, endereco,
                   tipo_usuario, status, created_at, ultimo_login
            FROM usuarios
            WHERE id = ?
        `, [id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json(users[0]);

    } catch (error) {
        logger.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar usuário (admin apenas)
router.post('/', [adminOnly, ...userValidation,
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario } = req.body;

        // Verificar se email já existe
        const existingUsers = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Hash da senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        // Inserir usuário
        const result = await query(`
            INSERT INTO usuarios (nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [nome, email, hashedPassword, telefone, data_nascimento, endereco, tipo_usuario]);

        logger.info(`Usuário criado: ${email} por ${req.user.email}`);

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            userId: result.insertId
        });

    } catch (error) {
        logger.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar usuário
router.put('/:id', [selfOrAdmin, ...userValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { nome, email, telefone, data_nascimento, endereco, tipo_usuario, status } = req.body;

        // Verificar se usuário existe
        const existingUsers = await query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (existingUsers.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar se email já está em uso por outro usuário
        const emailUsers = await query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
        if (emailUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Montar query de atualização
        let updateFields = ['nome = ?', 'email = ?', 'telefone = ?', 'data_nascimento = ?', 'endereco = ?'];
        let updateParams = [nome, email, telefone, data_nascimento, endereco];

        // Apenas admin pode alterar tipo de usuário e status
        if (req.user.tipo_usuario === 'admin') {
            updateFields.push('tipo_usuario = ?', 'status = ?');
            updateParams.push(tipo_usuario, status || 'ativo');
        }

        updateParams.push(id);

        await query(`
            UPDATE usuarios
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = ?
        `, updateParams);

        logger.info(`Usuário atualizado: ${email} por ${req.user.email}`);

        res.json({ message: 'Usuário atualizado com sucesso' });

    } catch (error) {
        logger.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar usuário (admin apenas)
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se usuário existe
        const users = await query('SELECT email FROM usuarios WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar se não é o próprio usuário admin
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
        }

        await query('DELETE FROM usuarios WHERE id = ?', [id]);

        logger.info(`Usuário deletado: ${users[0].email} por ${req.user.email}`);

        res.json({ message: 'Usuário deletado com sucesso' });

    } catch (error) {
        logger.error('Erro ao deletar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;