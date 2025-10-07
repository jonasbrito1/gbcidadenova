const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher, selfOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Validações
const studentValidation = [
    body('usuario_id').isInt().withMessage('ID do usuário inválido'),
    body('graduacao').optional().isLength({ min: 1, max: 50 }).withMessage('Graduação inválida'),
    body('programa').isIn(['Adultos', 'Infantil', 'Juvenil', 'Master']).withMessage('Programa inválido'),
    body('data_inicio').isISO8601().withMessage('Data de início inválida'),
    body('plano_id').optional().isInt().withMessage('ID do plano inválido'),
    body('graus_faixa').optional().isInt({ min: 0, max: 9 }).withMessage('Graus da faixa inválido')
];

// Validações para criação completa de aluno (usuário + aluno)
const createStudentValidation = [
    body('nome').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('telefone').optional().isLength({ max: 20 }).withMessage('Telefone inválido'),
    body('data_nascimento').optional().isISO8601().withMessage('Data de nascimento inválida'),
    body('endereco').optional().isLength({ max: 500 }).withMessage('Endereço muito longo'),
    body('graduacao').optional().isLength({ min: 1, max: 50 }).withMessage('Graduação inválida'),
    body('programa').isIn(['Adultos', 'Infantil', 'Juvenil', 'Master']).withMessage('Programa inválido'),
    body('data_inicio').isISO8601().withMessage('Data de início inválida'),
    body('plano_id').optional().isInt().withMessage('ID do plano inválido'),
    body('professor_responsavel').optional().isInt().withMessage('ID do professor inválido'),
    body('graus_faixa').optional().isInt({ min: 0, max: 9 }).withMessage('Graus da faixa inválido'),
    body('contato_emergencia').optional().isLength({ max: 200 }).withMessage('Contato de emergência muito longo'),
    body('observacoes_medicas').optional().isLength({ max: 1000 }).withMessage('Observações médicas muito longas'),
    body('status').optional().isIn(['ativo', 'inativo', 'trancado']).withMessage('Status inválido')
];

// Listar alunos
router.get('/', adminOrTeacher, async (req, res) => {
    try {
        const { programa, status, graduacao, page = 1, limit = 20, search } = req.query;

        let whereClause = 'WHERE u.tipo_usuario = "aluno"';
        const params = [];

        if (programa) {
            whereClause += ' AND a.programa = ?';
            params.push(programa);
        }

        if (status) {
            whereClause += ' AND a.status = ?';
            params.push(status);
        }

        if (graduacao) {
            whereClause += ' AND a.graduacao = ?';
            params.push(graduacao);
        }

        if (search) {
            whereClause += ' AND (u.nome LIKE ? OR u.email LIKE ? OR a.matricula LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const offset = (page - 1) * limit;

        // Buscar alunos com informações do usuário
        const students = await query(`
            SELECT
                a.id,
                a.matricula,
                a.graduacao,
                a.graus_faixa,
                a.programa,
                a.data_inicio,
                a.data_fim,
                a.status,
                a.observacoes_medicas,
                u.id as usuario_id,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento,
                u.endereco,
                p.nome as plano_nome,
                p.valor_mensal,
                prof.id as professor_id,
                prof_user.nome as professor_nome
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
            LEFT JOIN professores prof ON a.professor_responsavel = prof.id
            LEFT JOIN usuarios prof_user ON prof.usuario_id = prof_user.id
            ${whereClause}
            ORDER BY u.nome
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `, params);

        // Contar total
        const [countResult] = await query(`
            SELECT COUNT(*) as total
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            ${whereClause}
        `, params);

        res.json({
            students,
            total: countResult.total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult.total / limit)
        });

    } catch (error) {
        logger.error('Erro ao buscar alunos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar aluno por ID
router.get('/:id', selfOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const students = await query(`
            SELECT
                a.*,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento,
                u.endereco,
                u.status as usuario_status,
                p.nome as plano_nome,
                p.valor_mensal,
                p.descricao as plano_descricao,
                prof_user.nome as professor_nome
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
            LEFT JOIN professores prof ON a.professor_responsavel = prof.id
            LEFT JOIN usuarios prof_user ON prof.usuario_id = prof_user.id
            WHERE a.id = ?
        `, [id]);

        if (students.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        res.json(students[0]);

    } catch (error) {
        logger.error('Erro ao buscar aluno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar aluno completo (usuário + aluno) - Nova rota
router.post('/create', [adminOrTeacher, ...createStudentValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            // Dados do usuário
            nome,
            email,
            telefone,
            data_nascimento,
            endereco,
            // Dados do aluno
            graduacao = 'Branca',
            programa,
            data_inicio,
            plano_id,
            professor_responsavel,
            graus_faixa = 0,
            contato_emergencia,
            observacoes_medicas,
            status = 'ativo'
        } = req.body;

        // Verificar se email já existe
        const existingUsers = await query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Gerar senha padrão
        const defaultPassword = 'gb123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Usar transação
        const result = await transaction(async (connection) => {
            // 1. Criar usuário
            const [userResult] = await connection.execute(`
                INSERT INTO usuarios (
                    nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario
                ) VALUES (?, ?, ?, ?, ?, ?, 'aluno')
            `, [nome, email, hashedPassword, telefone || null, data_nascimento || null, endereco || null]);

            const userId = userResult.insertId;

            // 2. Gerar matrícula única
            const year = new Date().getFullYear();
            const [lastMatricula] = await connection.execute(
                'SELECT matricula FROM alunos WHERE matricula LIKE ? ORDER BY matricula DESC LIMIT 1',
                [`${year}%`]
            );

            let numeroSequencial = 1;
            if (lastMatricula.length > 0) {
                const ultimoNumero = parseInt(lastMatricula[0].matricula.substring(4));
                numeroSequencial = ultimoNumero + 1;
            }

            const matricula = `${year}${numeroSequencial.toString().padStart(4, '0')}`;

            // 3. Criar aluno
            const [studentResult] = await connection.execute(`
                INSERT INTO alunos (
                    usuario_id, matricula, graduacao, programa, data_inicio,
                    plano_id, professor_responsavel, graus_faixa,
                    contato_emergencia, observacoes_medicas, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, matricula, graduacao, programa, data_inicio,
                plano_id || null, professor_responsavel || null, graus_faixa,
                contato_emergencia || null, observacoes_medicas || null, status
            ]);

            return {
                studentId: studentResult.insertId,
                userId: userId,
                matricula
            };
        });

        logger.info(`Aluno criado completamente: ${nome} (${result.matricula}) por ${req.user.email}`);

        res.status(201).json({
            message: 'Aluno criado com sucesso',
            studentId: result.studentId,
            userId: result.userId,
            matricula: result.matricula,
            defaultPassword: defaultPassword
        });

    } catch (error) {
        logger.error('Erro ao criar aluno completo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email já está em uso' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar aluno (para usuário existente)
router.post('/', [adminOrTeacher, ...studentValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            usuario_id,
            graduacao = 'Branca',
            programa,
            data_inicio,
            plano_id,
            professor_responsavel,
            graus_faixa = 0,
            contato_emergencia,
            observacoes_medicas
        } = req.body;

        // Verificar se usuário existe e é do tipo aluno
        const users = await query(
            'SELECT id, nome FROM usuarios WHERE id = ? AND tipo_usuario = "aluno"',
            [usuario_id]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Usuário não encontrado ou não é do tipo aluno' });
        }

        // Verificar se já existe aluno para este usuário
        const existingStudents = await query(
            'SELECT id FROM alunos WHERE usuario_id = ?',
            [usuario_id]
        );

        if (existingStudents.length > 0) {
            return res.status(400).json({ error: 'Já existe um aluno para este usuário' });
        }

        // Gerar matrícula única
        const year = new Date().getFullYear();
        const lastMatricula = await query(
            'SELECT matricula FROM alunos WHERE matricula LIKE ? ORDER BY matricula DESC LIMIT 1',
            [`${year}%`]
        );

        let numeroSequencial = 1;
        if (lastMatricula.length > 0) {
            const ultimoNumero = parseInt(lastMatricula[0].matricula.substring(4));
            numeroSequencial = ultimoNumero + 1;
        }

        const matricula = `${year}${numeroSequencial.toString().padStart(4, '0')}`;

        // Inserir aluno
        const result = await query(`
            INSERT INTO alunos (
                usuario_id, matricula, graduacao, programa, data_inicio,
                plano_id, professor_responsavel, graus_faixa,
                contato_emergencia, observacoes_medicas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            usuario_id, matricula, graduacao, programa, data_inicio,
            plano_id, professor_responsavel, graus_faixa,
            contato_emergencia, observacoes_medicas
        ]);

        logger.info(`Aluno criado: ${users[0].nome} (${matricula}) por ${req.user.email}`);

        res.status(201).json({
            message: 'Aluno criado com sucesso',
            studentId: result.insertId,
            matricula
        });

    } catch (error) {
        logger.error('Erro ao criar aluno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar aluno completo (usuário + aluno)
router.put('/:id', [adminOrTeacher, ...createStudentValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
            // Dados do usuário
            nome,
            email,
            telefone,
            data_nascimento,
            endereco,
            // Dados do aluno
            graduacao,
            programa,
            data_inicio,
            data_fim,
            plano_id,
            professor_responsavel,
            graus_faixa,
            contato_emergencia,
            observacoes_medicas,
            status
        } = req.body;

        // Verificar se aluno existe e buscar usuario_id
        const students = await query('SELECT usuario_id FROM alunos WHERE id = ?', [id]);
        if (students.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const usuarioId = students[0].usuario_id;

        // Verificar se email já existe para outro usuário
        const existingUsers = await query(
            'SELECT id FROM usuarios WHERE email = ? AND id != ?',
            [email, usuarioId]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso por outro usuário' });
        }

        // Usar transação
        await transaction(async (connection) => {
            // 1. Atualizar dados do usuário
            await connection.execute(`
                UPDATE usuarios
                SET nome = ?, email = ?, telefone = ?, data_nascimento = ?, endereco = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [nome, email, telefone, data_nascimento, endereco, usuarioId]);

            // 2. Atualizar dados do aluno
            await connection.execute(`
                UPDATE alunos
                SET graduacao = ?, programa = ?, data_inicio = ?, data_fim = ?,
                    plano_id = ?, professor_responsavel = ?, graus_faixa = ?,
                    contato_emergencia = ?, observacoes_medicas = ?, status = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                graduacao, programa, data_inicio, data_fim,
                plano_id, professor_responsavel, graus_faixa,
                contato_emergencia, observacoes_medicas, status || 'ativo',
                id
            ]);
        });

        logger.info(`Aluno atualizado completamente: ID ${id} por ${req.user.email}`);

        res.json({ message: 'Aluno atualizado com sucesso' });

    } catch (error) {
        logger.error('Erro ao atualizar aluno:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email já está em uso' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar histórico de graduações do aluno
router.get('/:id/graduacoes', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;

        const graduacoes = await query(`
            SELECT
                g.*,
                prof_user.nome as professor_avaliador_nome
            FROM graduacoes g
            LEFT JOIN professores prof ON g.professor_avaliador_id = prof.id
            LEFT JOIN usuarios prof_user ON prof.usuario_id = prof_user.id
            WHERE g.aluno_id = ?
            ORDER BY g.data_graduacao DESC
        `, [id]);

        res.json(graduacoes);

    } catch (error) {
        logger.error('Erro ao buscar graduações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;