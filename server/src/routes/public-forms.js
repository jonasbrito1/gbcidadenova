const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();

// Validações para formulário público
const publicFormValidation = [
    // Consentimento LGPD (OBRIGATÓRIO)
    body('lgpd_aceite_publico').equals('true').withMessage('Você deve aceitar os termos LGPD para prosseguir'),

    // Dados pessoais
    body('nome').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('telefone').optional().isLength({ max: 20 }).withMessage('Telefone inválido'),
    body('data_nascimento').optional().isISO8601().withMessage('Data de nascimento inválida'),

    // Email do responsável
    body('email_responsavel').optional().isEmail().withMessage('Email do responsável inválido'),

    // Endereço
    body('cep').optional().isLength({ min: 8, max: 10 }).withMessage('CEP inválido'),
    body('rua').optional().isLength({ max: 255 }).withMessage('Rua muito longa'),
    body('numero').optional().isLength({ max: 20 }).withMessage('Número inválido'),
    body('complemento').optional().isLength({ max: 100 }).withMessage('Complemento muito longo'),
    body('bairro').optional().isLength({ max: 100 }).withMessage('Bairro muito longo'),
    body('cidade').optional().isLength({ max: 100 }).withMessage('Cidade muito longa'),
    body('estado').optional().isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres'),

    // Dados acadêmicos
    body('programa').isIn(['Adultos', 'Infantil', 'Juvenil', 'Master']).withMessage('Programa inválido'),
    body('data_inicio').isISO8601().withMessage('Data de início inválida'),

    // Contato de emergência
    body('nome_contato_emergencia').optional().isLength({ max: 255 }).withMessage('Nome muito longo'),
    body('contato_emergencia').optional().isLength({ max: 200 }).withMessage('Contato muito longo'),

    // Informações médicas
    body('tipo_sanguineo').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']).withMessage('Tipo sanguíneo inválido'),
    body('toma_medicamento').optional().isBoolean().withMessage('Campo deve ser boolean'),
    body('medicamentos_detalhes').optional().isLength({ max: 1000 }).withMessage('Texto muito longo'),
    body('historico_fraturas').optional().isBoolean().withMessage('Campo deve ser boolean'),
    body('fraturas_detalhes').optional().isLength({ max: 1000 }).withMessage('Texto muito longo'),
    body('tem_alergias').optional().isBoolean().withMessage('Campo deve ser boolean'),
    body('alergias_detalhes').optional().isLength({ max: 1000 }).withMessage('Texto muito longo'),
    body('observacoes_medicas').optional().isLength({ max: 1000 }).withMessage('Texto muito longo')
];

// Função auxiliar para calcular idade
function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// ROTA PÚBLICA: Submeter formulário de cadastro
router.post('/submit', publicFormValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            nome, email, telefone, data_nascimento,
            email_responsavel,
            cep, rua, numero, complemento, bairro, cidade, estado,
            programa, graduacao, graus_faixa, data_inicio,
            nome_contato_emergencia, contato_emergencia,
            tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
            historico_fraturas, fraturas_detalhes,
            tem_alergias, alergias_detalhes, observacoes_medicas
        } = req.body;

        // Validar email do responsável para menores de idade
        if (data_nascimento) {
            const age = calculateAge(data_nascimento);
            if (age < 18 && !email_responsavel) {
                return res.status(400).json({
                    error: 'Email do responsável é obrigatório para menores de 18 anos'
                });
            }
        }

        // LÓGICA DE VALIDAÇÃO DE EMAIL:
        // - Se MENOR de idade:
        //   * Se email do aluno = email do responsável: PERMITIR (responsável usando seu email para o filho)
        //   * Se email do aluno ≠ email do responsável: verificar se já existe
        // - Se MAIOR de idade: email deve ser único

        // Verificar se é menor de idade
        const age = data_nascimento ? calculateAge(data_nascimento) : 18;
        const isMenor = age < 18;

        if (isMenor) {
            // Menor de idade: permitir se o email for igual ao do responsável
            const emailIgualResponsavel = email_responsavel && email === email_responsavel;

            if (!emailIgualResponsavel) {
                // Email do menor é diferente do responsável, verificar se já existe
                const [existingUser] = await query(
                    'SELECT id FROM usuarios WHERE email = ?',
                    [email]
                );

                if (existingUser) {
                    return res.status(400).json({
                        error: 'Este email já está cadastrado. Use um email diferente ou o email do responsável.'
                    });
                }

                const [existingForm] = await query(
                    'SELECT id FROM formularios_cadastro WHERE email = ? AND status = "pendente"',
                    [email]
                );

                if (existingForm) {
                    return res.status(400).json({
                        error: 'Já existe um formulário pendente para este email.'
                    });
                }
            }
            // Se email for igual ao do responsável, permitir (não verifica duplicação)
        } else {
            // Adulto: verificar se email já existe
            const [existingUser] = await query(
                'SELECT id FROM usuarios WHERE email = ?',
                [email]
            );

            if (existingUser) {
                return res.status(400).json({
                    error: 'Este email já está cadastrado no sistema.'
                });
            }

            const [existingForm] = await query(
                'SELECT id FROM formularios_cadastro WHERE email = ? AND status = "pendente"',
                [email]
            );

            if (existingForm) {
                return res.status(400).json({
                    error: 'Já existe um formulário pendente para este email.'
                });
            }
        }

        // Capturar IP e User-Agent
        const ipOrigem = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
        const userAgent = req.headers['user-agent'];

        // Inserir formulário
        const result = await query(`
            INSERT INTO formularios_cadastro (
                nome, email, telefone, data_nascimento, email_responsavel,
                cep, rua, numero, complemento, bairro, cidade, estado,
                programa, graduacao, graus_faixa, data_inicio,
                nome_contato_emergencia, contato_emergencia,
                tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
                historico_fraturas, fraturas_detalhes,
                tem_alergias, alergias_detalhes, observacoes_medicas,
                lgpd_aceite_publico, lgpd_aceite_publico_data, lgpd_aceite_publico_ip,
                status, ip_origem, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), ?, 'pendente', ?, ?)
        `, [
            nome, email, telefone || null, data_nascimento || null, email_responsavel || null,
            cep || null, rua || null, numero || null, complemento || null, bairro || null, cidade || null, estado || null,
            programa, graduacao || 'Branca', graus_faixa || 0, data_inicio,
            nome_contato_emergencia || null, contato_emergencia || null,
            tipo_sanguineo || null, toma_medicamento || false, medicamentos_detalhes || null,
            historico_fraturas || false, fraturas_detalhes || null,
            tem_alergias || false, alergias_detalhes || null, observacoes_medicas || null,
            ipOrigem, // IP do aceite LGPD
            ipOrigem, userAgent
        ]);

        logger.info(`Formulário público submetido: ${nome} (${email})`);

        res.status(201).json({
            message: 'Formulário enviado com sucesso! Aguarde a validação do professor.',
            formularioId: result.insertId
        });

    } catch (error) {
        logger.error('Erro ao submeter formulário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ROTAS PROTEGIDAS (Admin/Professor)
router.use(authenticateToken);

// Listar formulários pendentes
router.get('/pending', adminOrTeacher, async (req, res) => {
    try {
        const { status = 'pendente', page = 1, limit = 20 } = req.query;

        const offset = (page - 1) * limit;

        const forms = await query(`
            SELECT
                f.*,
                u.nome as validado_por_nome
            FROM formularios_cadastro f
            LEFT JOIN usuarios u ON f.validado_por = u.id
            WHERE f.status = ?
            ORDER BY f.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `, [status]);

        const [countResult] = await query(
            'SELECT COUNT(*) as total FROM formularios_cadastro WHERE status = ?',
            [status]
        );

        res.json({
            forms,
            total: countResult.total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult.total / limit)
        });

    } catch (error) {
        logger.error('Erro ao listar formulários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar formulário por ID
router.get('/:id', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;

        const [form] = await query(`
            SELECT
                f.*,
                u.nome as validado_por_nome
            FROM formularios_cadastro f
            LEFT JOIN usuarios u ON f.validado_por = u.id
            WHERE f.id = ?
        `, [id]);

        if (!form) {
            return res.status(404).json({ error: 'Formulário não encontrado' });
        }

        res.json(form);

    } catch (error) {
        logger.error('Erro ao buscar formulário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Aprovar formulário e criar aluno
router.post('/:id/approve', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const { observacoes_validacao } = req.body;

        // Buscar formulário
        const [form] = await query(
            'SELECT * FROM formularios_cadastro WHERE id = ? AND status = "pendente"',
            [id]
        );

        if (!form) {
            return res.status(404).json({ error: 'Formulário não encontrado ou já processado' });
        }

        // Verificar se email já existe
        const [existingUser] = await query(
            'SELECT id FROM usuarios WHERE email = ?',
            [form.email]
        );

        if (existingUser) {
            return res.status(400).json({ error: 'Email já está em uso no sistema' });
        }

        // Gerar senha padrão
        const defaultPassword = 'gb123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Usar transação para criar aluno e atualizar formulário
        const result = await transaction(async (connection) => {
            // 1. Criar usuário
            const [userResult] = await connection.execute(`
                INSERT INTO usuarios (
                    nome, email, senha, telefone, data_nascimento, tipo_usuario, primeiro_acesso
                ) VALUES (?, ?, ?, ?, ?, 'aluno', TRUE)
            `, [form.nome, form.email, hashedPassword, form.telefone, form.data_nascimento]);

            const userId = userResult.insertId;

            // 2. Gerar matrícula
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

            // 3. Criar aluno com dados do formulário
            const [studentResult] = await connection.execute(`
                INSERT INTO alunos (
                    usuario_id, matricula, graduacao, programa, data_inicio,
                    graus_faixa, status,
                    cep, rua, numero, complemento, bairro, cidade, estado,
                    email_responsavel,
                    nome_contato_emergencia, contato_emergencia,
                    tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
                    historico_fraturas, fraturas_detalhes,
                    tem_alergias, alergias_detalhes, observacoes_medicas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, matricula, form.graduacao || 'Branca', form.programa, form.data_inicio,
                form.graus_faixa || 0, 'ativo',
                form.cep, form.rua, form.numero, form.complemento, form.bairro, form.cidade, form.estado,
                form.email_responsavel,
                form.nome_contato_emergencia, form.contato_emergencia,
                form.tipo_sanguineo, form.toma_medicamento, form.medicamentos_detalhes,
                form.historico_fraturas, form.fraturas_detalhes,
                form.tem_alergias, form.alergias_detalhes, form.observacoes_medicas
            ]);

            // 4. Atualizar formulário como aprovado
            await connection.execute(`
                UPDATE formularios_cadastro
                SET status = 'aprovado',
                    aluno_id = ?,
                    validado_por = ?,
                    data_validacao = NOW(),
                    observacoes_validacao = ?
                WHERE id = ?
            `, [studentResult.insertId, req.user.id, observacoes_validacao || null, id]);

            return {
                studentId: studentResult.insertId,
                userId: userId,
                matricula
            };
        });

        logger.info(`Formulário aprovado e aluno criado: ${form.nome} (${result.matricula}) por ${req.user.email}`);

        // Enviar email de boas-vindas (assíncrono)
        sendWelcomeEmail({
            nome: form.nome,
            email: form.email,
            senha: defaultPassword,
            matricula: result.matricula,
            usuarioId: result.userId,
            alunoId: result.studentId
        }).catch(error => {
            logger.error('Erro ao enviar email de boas-vindas:', error);
        });

        res.json({
            message: 'Formulário aprovado e aluno criado com sucesso. Email enviado.',
            studentId: result.studentId,
            matricula: result.matricula
        });

    } catch (error) {
        logger.error('Erro ao aprovar formulário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rejeitar formulário
router.post('/:id/reject', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const { observacoes_validacao } = req.body;

        const result = await query(`
            UPDATE formularios_cadastro
            SET status = 'rejeitado',
                validado_por = ?,
                data_validacao = NOW(),
                observacoes_validacao = ?
            WHERE id = ? AND status = 'pendente'
        `, [req.user.id, observacoes_validacao || 'Formulário rejeitado', id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Formulário não encontrado ou já processado' });
        }

        logger.info(`Formulário rejeitado: ID ${id} por ${req.user.email}`);

        res.json({ message: 'Formulário rejeitado' });

    } catch (error) {
        logger.error('Erro ao rejeitar formulário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
