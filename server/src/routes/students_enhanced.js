const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher, selfOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('../services/emailService');
const { configurarRecorrenciaParaAluno } = require('../services/paymentRecurrenceService');

const router = express.Router();

/**
 * Gera senha aleatória segura
 * Formato: GB + 2 letras maiúsculas + 4 dígitos + 2 caracteres especiais
 * Exemplo: GBXy7@2K!9
 */
function generateRandomPassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%&*';

    const getRandomChar = (chars) => chars[crypto.randomInt(0, chars.length)];

    return 'GB' +
        getRandomChar(uppercase) +
        getRandomChar(uppercase) +
        getRandomChar(numbers) +
        getRandomChar(special) +
        getRandomChar(numbers) +
        getRandomChar(uppercase) +
        getRandomChar(special) +
        getRandomChar(numbers);
}

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// ==================== OPERAÇÕES EM MASSA ====================
// IMPORTANTE: Estas rotas devem vir ANTES das rotas com /:id para evitar conflitos

// Alterar status em massa
router.post('/bulk-update-status', adminOrTeacher, async (req, res) => {
    try {
        const { ids, status } = req.body;

        // Validações
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs dos alunos são obrigatórios' });
        }

        if (!['ativo', 'inativo', 'trancado'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        // Atualizar status em massa
        const placeholders = ids.map(() => '?').join(',');
        const result = await query(`
            UPDATE alunos
            SET status = ?, updated_at = NOW()
            WHERE id IN (${placeholders})
        `, [status, ...ids]);

        logger.info(`Status alterado em massa para ${status} em ${result.affectedRows} aluno(s) por ${req.user.email}`);

        res.json({
            message: 'Status alterado com sucesso',
            processados: result.affectedRows
        });

    } catch (error) {
        logger.error('Erro ao alterar status em massa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Alterar graduação em massa
router.post('/bulk-update-graduacao', adminOrTeacher, async (req, res) => {
    try {
        const { ids, graduacao, graus_faixa } = req.body;

        // Validações
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs dos alunos são obrigatórios' });
        }

        if (!graduacao || graduacao.trim() === '') {
            return res.status(400).json({ error: 'Graduação é obrigatória' });
        }

        // Buscar ID da graduação na tabela graduacoes_sistema
        let graduacaoId = null;
        const graduacaoSistema = await query(`
            SELECT id FROM graduacoes_sistema
            WHERE nome = ?
            LIMIT 1
        `, [graduacao]);

        if (graduacaoSistema.length > 0) {
            graduacaoId = graduacaoSistema[0].id;
        } else {
            logger.warn(`⚠️ Graduação "${graduacao}" NÃO encontrada na tabela graduacoes_sistema!`);
        }

        // Atualizar graduação, graus e graduacao_atual_id em massa
        const placeholders = ids.map(() => '?').join(',');
        const grausFaixaValue = graus_faixa !== undefined ? parseInt(graus_faixa) || 0 : 0;

        const result = await query(`
            UPDATE alunos
            SET graduacao = ?,
                graus_faixa = ?,
                graduacao_atual_id = ?,
                updated_at = NOW()
            WHERE id IN (${placeholders})
        `, [graduacao, grausFaixaValue, graduacaoId, ...ids]);

        logger.info(`Graduação alterada em massa para ${graduacao} (graus: ${grausFaixaValue}) em ${result.affectedRows} aluno(s) por ${req.user.email}`);

        res.json({
            message: 'Graduação alterada com sucesso',
            processados: result.affectedRows
        });

    } catch (error) {
        logger.error('Erro ao alterar graduação em massa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir alunos em massa
router.post('/bulk-delete', adminOrTeacher, async (req, res) => {
    try {
        const { ids } = req.body;

        // Validações
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs dos alunos são obrigatórios' });
        }

        // Excluir em massa usando transação
        await transaction(async (connection) => {
            const placeholders = ids.map(() => '?').join(',');

            // 1. Buscar usuario_ids dos alunos
            const [alunos] = await connection.execute(`
                SELECT id, usuario_id FROM alunos WHERE id IN (${placeholders})
            `, ids);

            const usuarioIds = alunos.map(a => a.usuario_id);

            // 2. Excluir dados relacionados (graduações, frequências, mensalidades)
            await connection.execute(`DELETE FROM graduacoes WHERE aluno_id IN (${placeholders})`, ids);
            await connection.execute(`DELETE FROM frequencia WHERE aluno_id IN (${placeholders})`, ids);
            await connection.execute(`DELETE FROM mensalidades WHERE aluno_id IN (${placeholders})`, ids);
            await connection.execute(`DELETE FROM recorrencias_pagamento WHERE aluno_id IN (${placeholders})`, ids);

            // 3. Excluir alunos
            await connection.execute(`DELETE FROM alunos WHERE id IN (${placeholders})`, ids);

            // 4. Excluir usuários associados
            if (usuarioIds.length > 0) {
                const userPlaceholders = usuarioIds.map(() => '?').join(',');
                await connection.execute(`DELETE FROM usuarios WHERE id IN (${userPlaceholders})`, usuarioIds);
            }
        });

        logger.info(`${ids.length} aluno(s) excluído(s) em massa por ${req.user.email}`);

        res.json({
            message: 'Alunos excluídos com sucesso',
            processados: ids.length
        });

    } catch (error) {
        logger.error('Erro ao excluir alunos em massa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== FIM OPERAÇÕES EM MASSA ====================

// Validações para criação completa de aluno (aprimorado)
const createStudentValidation = [
    // Dados pessoais
    body('nome').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('telefone').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Telefone inválido'),
    body('data_nascimento').optional({ checkFalsy: true }).isISO8601().withMessage('Data de nascimento inválida'),

    // Email do responsável (obrigatório para menores)
    body('email_responsavel')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Email do responsável inválido'),

    // Endereço completo
    body('cep').optional({ checkFalsy: true }).isLength({ min: 8, max: 10 }).withMessage('CEP inválido'),
    body('rua').optional({ checkFalsy: true }).isLength({ max: 255 }).withMessage('Rua muito longa'),
    body('numero').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Número inválido'),
    body('complemento').optional({ checkFalsy: true }).isLength({ max: 100 }).withMessage('Complemento muito longo'),
    body('bairro').optional({ checkFalsy: true }).isLength({ max: 100 }).withMessage('Bairro muito longo'),
    body('cidade').optional({ checkFalsy: true }).isLength({ max: 100 }).withMessage('Cidade muito longa'),
    body('estado').optional({ checkFalsy: true }).isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres'),

    // Dados acadêmicos
    body('graduacao').optional({ checkFalsy: true }).isLength({ min: 1, max: 50 }).withMessage('Graduação inválida'),
    body('programa').isIn(['Adultos', 'Infantil', 'Juvenil', 'Master']).withMessage('Programa inválido'),
    body('data_inicio').isISO8601().withMessage('Data de início inválida'),
    body('plano_id').optional({ checkFalsy: true }).isInt().withMessage('ID do plano inválido'),
    body('graus_faixa').optional({ checkFalsy: true }).isInt({ min: 0, max: 9 }).withMessage('Graus da faixa inválido'),

    // Contato de emergência
    body('nome_contato_emergencia').optional({ checkFalsy: true }).isLength({ max: 255 }).withMessage('Nome de contato muito longo'),
    body('contato_emergencia').optional({ checkFalsy: true }).isLength({ max: 200 }).withMessage('Contato de emergência muito longo'),

    // Informações médicas
    body('tipo_sanguineo').optional({ checkFalsy: true }).isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']).withMessage('Tipo sanguíneo inválido'),
    body('toma_medicamento').optional({ checkFalsy: true }).isBoolean().withMessage('Campo toma_medicamento deve ser boolean'),
    body('medicamentos_detalhes').optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage('Detalhes de medicamentos muito longos'),
    body('historico_fraturas').optional({ checkFalsy: true }).isBoolean().withMessage('Campo historico_fraturas deve ser boolean'),
    body('fraturas_detalhes').optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage('Detalhes de fraturas muito longos'),
    body('tem_alergias').optional({ checkFalsy: true }).isBoolean().withMessage('Campo tem_alergias deve ser boolean'),
    body('alergias_detalhes').optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage('Detalhes de alergias muito longos'),
    body('observacoes_medicas').optional({ checkFalsy: true }).isLength({ max: 1000 }).withMessage('Observações médicas muito longas'),

    body('status').optional({ checkFalsy: true }).isIn(['ativo', 'inativo', 'trancado']).withMessage('Status inválido')
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

// Listar graduações disponíveis (sistema) - DEVE VIR ANTES DE /:id
router.get('/graduacoes-sistema', async (req, res) => {
    try {
        const graduacoes = await query(`
            SELECT id, nome, cor, ordem, tempo_minimo_meses, aulas_minimas, descricao
            FROM graduacoes_sistema
            ORDER BY ordem ASC
        `);

        res.json(graduacoes);

    } catch (error) {
        logger.error('Erro ao buscar graduações do sistema:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar alunos (rota existente mantida)
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

        // Buscar alunos com informações completas
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
                a.bolsista,
                a.bolsa_observacao,
                a.cep,
                a.rua,
                a.numero,
                a.bairro,
                a.cidade,
                a.estado,
                a.email_responsavel,
                a.tipo_sanguineo,
                u.id as usuario_id,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento,
                p.nome as plano_nome,
                p.valor_mensal
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
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

// Buscar aluno por ID (aprimorado)
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
                u.status as usuario_status,
                u.primeiro_acesso,
                u.lgpd_aceite,
                u.lgpd_aceite_data,
                u.foto_url,
                p.nome as plano_nome,
                p.valor_mensal,
                p.descricao as plano_descricao
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
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

// Criar aluno completo (APRIMORADO com novos campos e email)
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

            // Endereço completo
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado,

            // Email do responsável
            email_responsavel,

            // Dados do aluno
            graduacao = 'Branca',
            programa,
            data_inicio,
            plano_id,
            graus_faixa = 0,

            // Bolsista
            bolsista = false,
            bolsa_observacao,

            // Contato de emergência
            nome_contato_emergencia,
            contato_emergencia,

            // Informações médicas
            tipo_sanguineo,
            toma_medicamento = false,
            medicamentos_detalhes,
            historico_fraturas = false,
            fraturas_detalhes,
            tem_alergias = false,
            alergias_detalhes,
            observacoes_medicas,

            status = 'ativo'
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

        // Verificar se email já existe
        const existingUsers = await query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Gerar senha aleatória única para cada aluno
        const randomPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        // Usar transação
        const result = await transaction(async (connection) => {
            // 1. Criar usuário
            const [userResult] = await connection.execute(`
                INSERT INTO usuarios (
                    nome, email, senha, telefone, data_nascimento, tipo_usuario, status, primeiro_acesso
                ) VALUES (?, ?, ?, ?, ?, 'aluno', 'ativo', TRUE)
            `, [nome, email, hashedPassword, telefone || null, data_nascimento || null]);

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

            // 2.5. Buscar graduacao_atual_id baseado no nome da graduação
            const [gradSistema] = await connection.execute(
                'SELECT id FROM graduacoes_sistema WHERE nome = ?',
                [graduacao]
            );
            const graduacaoAtualId = gradSistema.length > 0 ? gradSistema[0].id : 1; // Default: Branca (id=1)

            // 3. Criar aluno com TODOS os novos campos
            const [studentResult] = await connection.execute(`
                INSERT INTO alunos (
                    usuario_id, matricula, graduacao, graduacao_atual_id, programa, data_inicio,
                    plano_id, graus_faixa, status,
                    bolsista, bolsa_observacao,
                    cep, rua, numero, complemento, bairro, cidade, estado,
                    email_responsavel,
                    nome_contato_emergencia, contato_emergencia,
                    tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
                    historico_fraturas, fraturas_detalhes,
                    tem_alergias, alergias_detalhes, observacoes_medicas
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId, matricula, graduacao, graduacaoAtualId, programa, data_inicio,
                bolsista ? null : (plano_id || null), graus_faixa, status,
                bolsista ? 1 : 0, bolsa_observacao || null,
                cep || null, rua || null, numero || null, complemento || null,
                bairro || null, cidade || null, estado || null,
                email_responsavel || null,
                nome_contato_emergencia || null, contato_emergencia || null,
                tipo_sanguineo || null, toma_medicamento, medicamentos_detalhes || null,
                historico_fraturas, fraturas_detalhes || null,
                tem_alergias, alergias_detalhes || null, observacoes_medicas || null
            ]);

            return {
                studentId: studentResult.insertId,
                userId: userId,
                matricula
            };
        });

        logger.info(`Aluno criado completamente: ${nome} (${result.matricula}) por ${req.user.email}`);

        // Enviar email de boas-vindas (assíncrono, não bloquear resposta)
        sendWelcomeEmail({
            nome,
            email,
            senha: randomPassword,
            matricula: result.matricula,
            usuarioId: result.userId,
            alunoId: result.studentId
        }).catch(error => {
            logger.error('Erro ao enviar email de boas-vindas:', error);
            // Não falhar a criação do aluno se o email falhar
        });

        // Configurar recorrência de pagamento (assíncrono, não bloquear resposta)
        configurarRecorrenciaParaAluno(result.studentId, req.body).catch(error => {
            logger.error('Erro ao configurar recorrência de pagamento:', error);
            // Não falhar a criação do aluno se a recorrência falhar
        });

        // Buscar dados completos do aluno criado para retornar ao frontend
        const students = await query(`
            SELECT
                a.*,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.id = ?
        `, [result.studentId]);

        const createdStudent = students[0];

        res.status(201).json({
            message: 'Aluno criado com sucesso',
            studentId: result.studentId,
            userId: result.userId,
            matricula: result.matricula,
            senhaTemporaria: randomPassword, // Retornar senha para o admin poder informar manualmente
            emailEnviado: false, // Será atualizado se o email for enviado com sucesso
            student: createdStudent || null // CRÍTICO: Incluir dados completos do aluno para o frontend
        });

    } catch (error) {
        logger.error('Erro ao criar aluno completo:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email já está em uso' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar aluno completo (APRIMORADO)
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

            // Endereço
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado,

            // Email do responsável
            email_responsavel,

            // Dados do aluno
            graduacao,
            programa,
            data_inicio,
            data_fim,
            plano_id,
            graus_faixa,
            status,

            // Bolsista
            bolsista = false,
            bolsa_observacao,

            // Valor customizado de mensalidade
            valor_mensalidade_customizado,

            // Contato de emergência
            nome_contato_emergencia,
            contato_emergencia,

            // Informações médicas
            tipo_sanguineo,
            toma_medicamento,
            medicamentos_detalhes,
            historico_fraturas,
            fraturas_detalhes,
            tem_alergias,
            alergias_detalhes,
            observacoes_medicas
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

        // Verificar se aluno existe e buscar usuario_id
        const students = await query('SELECT usuario_id FROM alunos WHERE id = ?', [id]);
        if (students.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const usuarioId = students[0].usuario_id;

        // Buscar dados atuais do usuário e aluno para merge
        const [currentUser] = await query('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
        const [currentStudent] = await query('SELECT * FROM alunos WHERE id = ?', [id]);

        if (!currentUser || !currentStudent) {
            return res.status(404).json({ error: 'Dados do aluno não encontrados' });
        }

        // Fazer merge dos dados: usar novo valor se fornecido, senão manter o atual
        const updatedUserData = {
            nome: nome !== undefined ? nome : currentUser.nome,
            email: email !== undefined ? email : currentUser.email,
            telefone: telefone !== undefined ? telefone : currentUser.telefone,
            data_nascimento: data_nascimento !== undefined ? data_nascimento : currentUser.data_nascimento
        };

        // Log para debug do valor customizado
        logger.info(`[UPDATE STUDENT ${id}] Valor recebido: "${valor_mensalidade_customizado}", Tipo: ${typeof valor_mensalidade_customizado}, Valor atual no banco: "${currentStudent.valor_mensalidade_customizado}"`);

        const updatedStudentData = {
            graduacao: graduacao !== undefined ? graduacao : currentStudent.graduacao,
            programa: programa !== undefined ? programa : currentStudent.programa,
            data_inicio: data_inicio !== undefined ? data_inicio : currentStudent.data_inicio,
            data_fim: data_fim !== undefined ? data_fim : currentStudent.data_fim,
            plano_id: plano_id !== undefined ? plano_id : currentStudent.plano_id,
            graus_faixa: graus_faixa !== undefined ? graus_faixa : currentStudent.graus_faixa,
            status: status !== undefined ? status : currentStudent.status,
            bolsista: bolsista !== undefined ? bolsista : currentStudent.bolsista,
            bolsa_observacao: bolsa_observacao !== undefined ? bolsa_observacao : currentStudent.bolsa_observacao,
            valor_mensalidade_customizado: valor_mensalidade_customizado !== undefined ? (valor_mensalidade_customizado === '' || valor_mensalidade_customizado === null ? null : valor_mensalidade_customizado) : currentStudent.valor_mensalidade_customizado,
            cep: cep !== undefined ? cep : currentStudent.cep,
            rua: rua !== undefined ? rua : currentStudent.rua,
            numero: numero !== undefined ? numero : currentStudent.numero,
            complemento: complemento !== undefined ? complemento : currentStudent.complemento,
            bairro: bairro !== undefined ? bairro : currentStudent.bairro,
            cidade: cidade !== undefined ? cidade : currentStudent.cidade,
            estado: estado !== undefined ? estado : currentStudent.estado,
            email_responsavel: email_responsavel !== undefined ? email_responsavel : currentStudent.email_responsavel,
            nome_contato_emergencia: nome_contato_emergencia !== undefined ? nome_contato_emergencia : currentStudent.nome_contato_emergencia,
            contato_emergencia: contato_emergencia !== undefined ? contato_emergencia : currentStudent.contato_emergencia,
            tipo_sanguineo: tipo_sanguineo !== undefined ? tipo_sanguineo : currentStudent.tipo_sanguineo,
            toma_medicamento: toma_medicamento !== undefined ? toma_medicamento : currentStudent.toma_medicamento,
            medicamentos_detalhes: medicamentos_detalhes !== undefined ? medicamentos_detalhes : currentStudent.medicamentos_detalhes,
            historico_fraturas: historico_fraturas !== undefined ? historico_fraturas : currentStudent.historico_fraturas,
            fraturas_detalhes: fraturas_detalhes !== undefined ? fraturas_detalhes : currentStudent.fraturas_detalhes,
            tem_alergias: tem_alergias !== undefined ? tem_alergias : currentStudent.tem_alergias,
            alergias_detalhes: alergias_detalhes !== undefined ? alergias_detalhes : currentStudent.alergias_detalhes,
            observacoes_medicas: observacoes_medicas !== undefined ? observacoes_medicas : currentStudent.observacoes_medicas
        };

        // Verificar se email já existe para outro usuário
        const existingUsers = await query(
            'SELECT id FROM usuarios WHERE email = ? AND id != ?',
            [updatedUserData.email, usuarioId]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso por outro usuário' });
        }

        // Usar transação
        await transaction(async (connection) => {
            // 1. Atualizar dados do usuário
            await connection.execute(`
                UPDATE usuarios
                SET nome = ?, email = ?, telefone = ?, data_nascimento = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                updatedUserData.nome,
                updatedUserData.email,
                updatedUserData.telefone,
                updatedUserData.data_nascimento,
                usuarioId
            ]);

            // 1.5. Buscar graduacao_atual_id baseado no nome da graduação
            const [gradSistema] = await connection.execute(
                'SELECT id FROM graduacoes_sistema WHERE nome = ?',
                [updatedStudentData.graduacao]
            );
            const graduacaoAtualId = gradSistema.length > 0 ? gradSistema[0].id : 1;

            // 2. Atualizar dados do aluno (com TODOS os novos campos)
            await connection.execute(`
                UPDATE alunos
                SET graduacao = ?, graduacao_atual_id = ?, programa = ?, data_inicio = ?, data_fim = ?,
                    plano_id = ?, graus_faixa = ?, status = ?,
                    bolsista = ?, bolsa_observacao = ?, valor_mensalidade_customizado = ?,
                    cep = ?, rua = ?, numero = ?, complemento = ?,
                    bairro = ?, cidade = ?, estado = ?,
                    email_responsavel = ?,
                    nome_contato_emergencia = ?, contato_emergencia = ?,
                    tipo_sanguineo = ?, toma_medicamento = ?, medicamentos_detalhes = ?,
                    historico_fraturas = ?, fraturas_detalhes = ?,
                    tem_alergias = ?, alergias_detalhes = ?, observacoes_medicas = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                updatedStudentData.graduacao,
                graduacaoAtualId,
                updatedStudentData.programa,
                updatedStudentData.data_inicio,
                updatedStudentData.data_fim,
                updatedStudentData.bolsista ? null : (updatedStudentData.plano_id || null),
                updatedStudentData.graus_faixa || null,
                updatedStudentData.status || 'ativo',
                updatedStudentData.bolsista ? 1 : 0,
                updatedStudentData.bolsa_observacao || null,
                updatedStudentData.valor_mensalidade_customizado || null,
                updatedStudentData.cep || null,
                updatedStudentData.rua || null,
                updatedStudentData.numero || null,
                updatedStudentData.complemento || null,
                updatedStudentData.bairro || null,
                updatedStudentData.cidade || null,
                updatedStudentData.estado || null,
                updatedStudentData.email_responsavel || null,
                updatedStudentData.nome_contato_emergencia || null,
                updatedStudentData.contato_emergencia || null,
                updatedStudentData.tipo_sanguineo || null,
                updatedStudentData.toma_medicamento !== undefined ? updatedStudentData.toma_medicamento : null,
                updatedStudentData.medicamentos_detalhes || null,
                updatedStudentData.historico_fraturas !== undefined ? updatedStudentData.historico_fraturas : null,
                updatedStudentData.fraturas_detalhes || null,
                updatedStudentData.tem_alergias !== undefined ? updatedStudentData.tem_alergias : null,
                updatedStudentData.alergias_detalhes || null,
                updatedStudentData.observacoes_medicas || null,
                id
            ]);
        });

        logger.info(`Aluno atualizado completamente: ID ${id} por ${req.user.email}`);

        // Configurar/atualizar recorrência de pagamento (assíncrono, não bloquear resposta)
        configurarRecorrenciaParaAluno(id, req.body).catch(error => {
            logger.error('Erro ao configurar/atualizar recorrência de pagamento:', error);
            // Não falhar a atualização do aluno se a recorrência falhar
        });

        res.json({ message: 'Aluno atualizado com sucesso' });

    } catch (error) {
        logger.error('Erro ao atualizar aluno:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email já está em uso' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Alternar status do aluno (inativar/ativar)
router.patch('/:id/status', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ativo', 'inativo', 'trancado'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        // Verificar se aluno existe
        const students = await query('SELECT a.*, u.nome FROM alunos a JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?', [id]);
        if (students.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        // Atualizar status
        await query('UPDATE alunos SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);

        logger.info(`Status do aluno ${students[0].nome} alterado para ${status} por ${req.user.email}`);

        res.json({
            message: `Aluno ${status === 'ativo' ? 'ativado' : status === 'inativo' ? 'inativado' : 'trancado'} com sucesso`,
            status
        });

    } catch (error) {
        logger.error('Erro ao alterar status do aluno:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir aluno permanentemente (SOMENTE ADMIN)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se é admin
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Somente administradores podem excluir alunos.' });
        }

        // Verificar se aluno existe
        const students = await query(
            'SELECT a.*, u.nome FROM alunos a JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?',
            [id]
        );

        if (students.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const student = students[0];
        const usuarioId = student.usuario_id;

        // Usar transação para excluir aluno e usuário
        await transaction(async (connection) => {
            // 1. Excluir registros relacionados
            await connection.execute('DELETE FROM graduacoes WHERE aluno_id = ?', [id]);
            await connection.execute('DELETE FROM alunos_turmas WHERE aluno_id = ?', [id]);
            await connection.execute('DELETE FROM frequencia WHERE aluno_id = ?', [id]);
            await connection.execute('DELETE FROM pagamentos WHERE aluno_id = ?', [id]);
            await connection.execute('DELETE FROM recorrencias_pagamento WHERE aluno_id = ?', [id]);

            // 2. Excluir aluno
            await connection.execute('DELETE FROM alunos WHERE id = ?', [id]);

            // 3. Excluir usuário
            await connection.execute('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
        });

        logger.info(`Aluno ${student.nome} (ID: ${id}) excluído permanentemente por ${req.user.email}`);

        res.json({ message: 'Aluno excluído permanentemente com sucesso' });

    } catch (error) {
        logger.error('Erro ao excluir aluno:', error);
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
                gs_anterior.nome as graduacao_anterior,
                gs_anterior.cor as cor_anterior,
                gs_nova.nome as graduacao_nova,
                gs_nova.cor as cor_nova,
                prof_user.nome as professor_avaliador_nome
            FROM historico_graduacoes g
            LEFT JOIN graduacoes_sistema gs_anterior ON g.graduacao_anterior_id = gs_anterior.id
            LEFT JOIN graduacoes_sistema gs_nova ON g.graduacao_nova_id = gs_nova.id
            LEFT JOIN professores prof ON g.aprovado_por_id = prof.id
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

// Verificar elegibilidade para graduação baseada em frequência
router.get('/:id/elegibilidade-graduacao', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const { periodoMeses = 6 } = req.query; // Período padrão de 6 meses

        // Buscar aluno
        const [aluno] = await query(`
            SELECT a.*, u.nome, gs.nome as graduacao_atual, gs.ordem, gs.tempo_minimo_meses, gs.cor as cor_graduacao
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.id = ?
        `, [id]);

        if (!aluno) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        // Calcular data de início do período
        const dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - parseInt(periodoMeses));

        // Buscar estatísticas de frequência (usando data_aula e apenas validadas)
        const stats = await query(`
            SELECT
                COUNT(*) as total_aulas,
                SUM(CASE WHEN f.presente = 1 AND f.status_validacao = 'validado' THEN 1 ELSE 0 END) as aulas_presentes,
                ROUND(COALESCE(SUM(CASE WHEN f.presente = 1 AND f.status_validacao = 'validado' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 0), 2) as percentual_presenca
            FROM frequencia f
            WHERE f.aluno_id = ?
            AND f.data_aula >= ?
        `, [id, dataInicio.toISOString().split('T')[0]]);

        const statsData = stats[0] || { total_aulas: 0, aulas_presentes: 0, percentual_presenca: 0 };

        // Buscar última graduação registrada
        const ultimaGraduacao = await query(`
            SELECT data_graduacao
            FROM historico_graduacoes
            WHERE aluno_id = ?
            ORDER BY data_graduacao DESC
            LIMIT 1
        `, [id]);

        // Buscar próxima graduação
        const proximaGraduacao = await query(`
            SELECT id, nome, cor, ordem, tempo_minimo_meses, aulas_minimas
            FROM graduacoes_sistema
            WHERE ordem > ?
            ORDER BY ordem ASC
            LIMIT 1
        `, [aluno.ordem || 0]);

        // Calcular tempo desde última graduação ou data de início
        let dataReferencia = aluno.data_ultima_graduacao || aluno.data_inicio;
        let mesesDesdeUltimaGraduacao = 0;

        if (ultimaGraduacao && ultimaGraduacao.length > 0) {
            dataReferencia = ultimaGraduacao[0].data_graduacao;
        }

        if (dataReferencia) {
            const dataRef = new Date(dataReferencia);
            const agora = new Date();
            mesesDesdeUltimaGraduacao = Math.floor((agora - dataRef) / (1000 * 60 * 60 * 24 * 30));
        }

        // Verificar elegibilidade
        let elegivel = false;
        let motivos = [];
        let requisitosAtendidos = { tempo: false, frequencia: false, aulas: false };

        if (!proximaGraduacao || proximaGraduacao.length === 0) {
            motivos.push('Aluno ja possui a graduacao maxima');
        } else {
            const graduacao = proximaGraduacao[0];
            const tempoMinimo = graduacao.tempo_minimo_meses || 6;
            const frequenciaMinima = 75; // Padrão GB: 2x/semana mínimo
            const aulasMinimas = graduacao.aulas_minimas || 48; // Usar valor da tabela ou padrão GB

            // Verificar tempo mínimo
            if (mesesDesdeUltimaGraduacao >= tempoMinimo) {
                requisitosAtendidos.tempo = true;
            } else {
                motivos.push(`Tempo minimo: ${tempoMinimo} meses (atual: ${mesesDesdeUltimaGraduacao} meses)`);
            }

            // Verificar frequência mínima
            if ((statsData.percentual_presenca || 0) >= frequenciaMinima) {
                requisitosAtendidos.frequencia = true;
            } else {
                motivos.push(`Frequencia minima: ${frequenciaMinima}% (atual: ${statsData.percentual_presenca || 0}%)`);
            }

            // Verificar aulas mínimas
            if ((statsData.aulas_presentes || 0) >= aulasMinimas) {
                requisitosAtendidos.aulas = true;
            } else {
                motivos.push(`Aulas minimas: ${aulasMinimas} (atual: ${statsData.aulas_presentes || 0})`);
            }

            // Se passou em todos os critérios
            if (requisitosAtendidos.tempo && requisitosAtendidos.frequencia && requisitosAtendidos.aulas) {
                elegivel = true;
                motivos = ['Aluno elegivel para graduacao!'];
            }
        }

        res.json({
            aluno: {
                id: aluno.id,
                nome: aluno.nome,
                graduacao_atual: aluno.graduacao_atual,
                cor_graduacao: aluno.cor_graduacao,
                graus_faixa: aluno.graus_faixa || 0
            },
            proxima_graduacao: proximaGraduacao && proximaGraduacao.length > 0 ? proximaGraduacao[0] : null,
            frequencia: {
                total_aulas: statsData.total_aulas || 0,
                aulas_presentes: statsData.aulas_presentes || 0,
                percentual: statsData.percentual_presenca || 0,
                periodo_meses: parseInt(periodoMeses)
            },
            tempo: {
                meses_desde_ultima_graduacao: mesesDesdeUltimaGraduacao,
                data_ultima_graduacao: ultimaGraduacao && ultimaGraduacao.length > 0 ? ultimaGraduacao[0].data_graduacao : dataReferencia
            },
            elegivel,
            requisitos_atendidos: requisitosAtendidos,
            motivos
        });

    } catch (error) {
        logger.error('Erro ao verificar elegibilidade:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar apenas os graus da faixa (sem mudar de faixa)
router.put('/:id/graus', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const { graus_faixa } = req.body;

        // Validar graus (0 a 4 para a maioria das faixas)
        const grausNum = parseInt(graus_faixa);
        if (isNaN(grausNum) || grausNum < 0 || grausNum > 9) {
            return res.status(400).json({ error: 'Graus deve ser um numero entre 0 e 9' });
        }

        // Buscar aluno
        const [aluno] = await query(`
            SELECT a.*, u.nome, gs.nome as graduacao_nome
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.id = ?
        `, [id]);

        if (!aluno) {
            return res.status(404).json({ error: 'Aluno nao encontrado' });
        }

        // Atualizar graus
        await query('UPDATE alunos SET graus_faixa = ?, updated_at = NOW() WHERE id = ?', [grausNum, id]);

        logger.info(`Graus atualizados para ${grausNum} - Aluno: ${aluno.nome} (${aluno.graduacao_nome}) por ${req.user.email}`);

        res.json({
            success: true,
            message: `Graus atualizados para ${grausNum}`,
            aluno: {
                id: aluno.id,
                nome: aluno.nome,
                graduacao: aluno.graduacao_nome,
                graus_faixa: grausNum
            }
        });

    } catch (error) {
        logger.error('Erro ao atualizar graus:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registrar nova graduação (mudança de faixa)
router.post('/:id/graduacoes', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            graduacao_nova_id,
            data_graduacao,
            observacoes,
            frequencia_percentual,
            total_aulas_periodo,
            aulas_presentes
        } = req.body;

        // Validações
        if (!graduacao_nova_id) {
            return res.status(400).json({ error: 'Graduacao nova e obrigatoria' });
        }

        // Buscar aluno e graduação atual
        const [aluno] = await query(`
            SELECT a.*, u.nome, gs.nome as graduacao_nome, a.graduacao_atual_id
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.id = ?
        `, [id]);

        if (!aluno) {
            return res.status(404).json({ error: 'Aluno nao encontrado' });
        }

        // Buscar professor vinculado ao usuário logado (se for professor)
        let professorId = null;
        if (req.user.tipo_usuario === 'professor') {
            const professores = await query('SELECT id FROM professores WHERE usuario_id = ?', [req.user.id]);
            if (professores && professores.length > 0) {
                professorId = professores[0].id;
            }
        }

        // Buscar nome da nova graduação
        const [novaGrad] = await query('SELECT nome, cor FROM graduacoes_sistema WHERE id = ?', [graduacao_nova_id]);

        // Registrar graduação no histórico
        const result = await query(`
            INSERT INTO historico_graduacoes (
                aluno_id,
                graduacao_anterior_id,
                graduacao_nova_id,
                data_graduacao,
                aprovado_por_id,
                frequencia_percent,
                aulas_realizadas,
                observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            aluno.graduacao_atual_id,
            graduacao_nova_id,
            data_graduacao || new Date().toISOString().split('T')[0],
            professorId,
            frequencia_percentual || 0,
            aulas_presentes || 0,
            observacoes
        ]);

        // Atualizar graduação do aluno (graduacao_atual_id, graduacao texto, zerar graus, atualizar data)
        await query(`
            UPDATE alunos
            SET graduacao_atual_id = ?,
                graduacao = ?,
                graus_faixa = 0,
                data_ultima_graduacao = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [graduacao_nova_id, novaGrad?.nome || '', data_graduacao || new Date().toISOString().split('T')[0], id]);

        logger.info(`Graduação registrada para aluno ${aluno.nome} por ${req.user.email}`);

        res.status(201).json({
            message: 'Graduação registrada com sucesso',
            graduacao_id: result.insertId
        });

    } catch (error) {
        logger.error('Erro ao registrar graduação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
