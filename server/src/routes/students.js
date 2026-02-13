const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher, selfOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { sendFirstAccessEmail } = require('../services/emailService');
const { configurarRecorrenciaParaAluno } = require('../services/paymentRecurrenceService');
const pool = require('../config/database');

const router = express.Router();

console.log('============================================================');
console.log('ARQUIVO STUDENTS.JS CARREGADO - VERSÃO ATUALIZADA 2025-12-26');
console.log('============================================================');

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
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
    body('telefone').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Telefone inválido'),
    body('data_nascimento').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Data de nascimento inválida'),
    body('endereco').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }).withMessage('Endereço muito longo'),
    body('graduacao').optional().isLength({ min: 1, max: 50 }).withMessage('Graduação inválida'),
    body('programa').isIn(['Adultos', 'Infantil', 'Juvenil', 'Master']).withMessage('Programa inválido'),
    body('data_inicio').isISO8601().withMessage('Data de início inválida'),
    body('plano_id').custom((value) => {
        // Aceitar null, undefined ou string vazia
        if (value === null || value === undefined || value === '') return true;
        // Se tiver valor, deve ser um inteiro válido
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error('ID do plano inválido');
        }
        return true;
    }),
    body('professor_responsavel').custom((value) => {
        // Aceitar null, undefined ou string vazia
        if (value === null || value === undefined || value === '') return true;
        // Se tiver valor, deve ser um inteiro válido
        if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error('ID do professor inválido');
        }
        return true;
    }),
    body('graus_faixa').optional().isInt({ min: 0, max: 12 }).withMessage('Graus da faixa inválido (0-12)'),
    body('contato_emergencia').optional({ nullable: true, checkFalsy: true }).isLength({ max: 200 }).withMessage('Contato de emergência muito longo'),
    body('observacoes_medicas').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Observações médicas muito longas'),
    body('status').optional().isIn(['ativo', 'inativo', 'trancado']).withMessage('Status inválido')
];

// Validações para atualização completa de aluno (mais flexível)
const updateStudentValidation = [
    body('nome').optional().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('telefone').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Telefone inválido'),
    body('data_nascimento').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Data de nascimento inválida'),
    body('endereco').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }).withMessage('Endereço muito longo'),
    body('graduacao').optional({ nullable: true, checkFalsy: true }).isLength({ min: 1, max: 50 }).withMessage('Graduação inválida'),
    body('programa').optional().isIn(['Adultos', 'Infantil', 'Juvenil', 'Master']).withMessage('Programa inválido'),
    body('data_inicio').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Data de início inválida'),
    body('data_fim').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Data de fim inválida'),
    body('plano_id').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('ID do plano inválido'),
    body('professor_responsavel').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('ID do professor inválido'),
    body('graus_faixa').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 9 }).withMessage('Graus da faixa inválido'),
    body('contato_emergencia').optional({ nullable: true, checkFalsy: true }).isLength({ max: 200 }).withMessage('Contato de emergência muito longo'),
    body('observacoes_medicas').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }).withMessage('Observações médicas muito longas'),
    body('status').optional({ nullable: true, checkFalsy: true }).isIn(['ativo', 'inativo', 'trancado']).withMessage('Status inválido')
];

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
        // VERSÃO ATUALIZADA - 2025-12-26 - TESTE 001
        logger.info('========== VERSÃO ATUALIZADA DO CÓDIGO EXECUTANDO ==========');
        logger.info('Dados recebidos para criar aluno:', {
            nome: req.body.nome,
            email: req.body.email,
            data_nascimento: req.body.data_nascimento,
            data_inicio: req.body.data_inicio,
            programa: req.body.programa,
            plano_id: req.body.plano_id,
            professor_responsavel: req.body.professor_responsavel
        });

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Erros de validação ao criar aluno:', {
                errors: errors.array(),
                receivedData: req.body
            });
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            // Dados do usuário
            nome,
            email,
            telefone,
            data_nascimento,
            endereco,
            email_responsavel,
            // Dados do aluno
            graduacao = 'Branca',
            programa,
            data_inicio,
            plano_id,
            professor_responsavel,
            graus_faixa = 0,
            contato_emergencia,
            observacoes_medicas,
            status = 'ativo',
            // Dados financeiros
            bolsista,
            dia_vencimento,
            valor_mensalidade_customizado
        } = req.body;

        // Se email estiver vazio mas email_responsavel estiver preenchido, usar email_responsavel
        const emailFinal = (email && email.trim()) ? email.trim() : (email_responsavel ? email_responsavel.trim() : '');

        // Validar que pelo menos um email está presente
        if (!emailFinal) {
            return res.status(400).json({ error: 'Email é obrigatório (ou preencha o Email do Responsável)' });
        }

        // Função para calcular idade
        const calculateAge = (birthdate) => {
            if (!birthdate) return null;
            const today = new Date();
            const birth = new Date(birthdate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        };

        // Verificar se é menor de idade
        const age = calculateAge(data_nascimento);
        const isMenor = age !== null && age < 18;

        // LÓGICA DE VALIDAÇÃO DE EMAIL:
        // - Se MENOR de idade:
        //   * Se email do aluno = email do responsável: PERMITIR (responsável usando seu email para o filho)
        //   * Se email do aluno ≠ email do responsável: verificar se já existe
        // - Se MAIOR de idade: email deve ser único
        if (isMenor) {
            // Menor de idade: permitir se o email for igual ao do responsável
            const emailIgualResponsavel = email_responsavel && emailFinal === email_responsavel;

            if (!emailIgualResponsavel) {
                // Email do menor é diferente do responsável, verificar se já existe
                const existingUsers = await query(
                    'SELECT id FROM usuarios WHERE email = ?',
                    [emailFinal]
                );

                if (existingUsers.length > 0) {
                    return res.status(400).json({
                        error: 'Este email já está cadastrado. Use um email diferente ou o email do responsável.'
                    });
                }
            }
            // Se email for igual ao do responsável, permitir (não verifica duplicação)
        } else {
            // Adulto: verificar se email já existe
            const existingUsers = await query(
                'SELECT id FROM usuarios WHERE email = ?',
                [emailFinal]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    error: 'Este email já está cadastrado. Use um email diferente.'
                });
            }
        }

        // Gerar senha padrão
        const defaultPassword = 'gb123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Usar transação
        const result = await transaction(async (connection) => {
            let userId;

            // VERIFICAR SE DEVE REUTILIZAR USUÁRIO EXISTENTE
            // Se menor de idade e email igual ao do responsável, reutilizar usuario existente
            if (isMenor && email_responsavel && emailFinal.toLowerCase() === email_responsavel.toLowerCase()) {
                // Buscar usuario existente com este email
                const [existingUsers] = await connection.execute(
                    'SELECT id FROM usuarios WHERE email = ?',
                    [emailFinal]
                );

                if (existingUsers.length > 0) {
                    // Reutilizar usuario existente
                    userId = existingUsers[0].id;
                    logger.info(`Reutilizando usuario existente (ID: ${userId}) para menor de idade: ${nome}`);
                } else {
                    // Criar novo usuario (responsável ainda não tem conta)
                    const [userResult] = await connection.execute(`
                        INSERT INTO usuarios (
                            nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario
                        ) VALUES (?, ?, ?, ?, ?, ?, 'aluno')
                    `, [nome, emailFinal, hashedPassword, telefone || null, data_nascimento || null, endereco || null]);
                    userId = userResult.insertId;
                }
            } else {
                // Criar novo usuario (adulto ou menor com email diferente)
                const [userResult] = await connection.execute(`
                    INSERT INTO usuarios (
                        nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario
                    ) VALUES (?, ?, ?, ?, ?, ?, 'aluno')
                `, [nome, emailFinal, hashedPassword, telefone || null, data_nascimento || null, endereco || null]);
                userId = userResult.insertId;
            }

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

            // 3. Criar aluno com todos os campos
            const {
                cep, rua, numero, complemento, bairro, cidade, estado,
                nome_contato_emergencia,
                tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
                historico_fraturas, fraturas_detalhes,
                tem_alergias, alergias_detalhes
            } = req.body;

            // Helper para converter booleano
            const toBoolean = (val) => {
                if (val === true || val === 1 || val === '1' || val === 'true') return 1;
                return 0;
            };

            // Debug: log dos valores
            logger.info(`Criando aluno: ${nome}`, {
                toma_medicamento: toBoolean(toma_medicamento),
                historico_fraturas: toBoolean(historico_fraturas),
                tem_alergias: toBoolean(tem_alergias),
                bolsista: toBoolean(bolsista)
            });

            // Buscar graduacao_atual_id baseado no nome da graduação
            const graduacaoNome = graduacao || 'Branca';
            const [gradSistema] = await connection.execute(
                'SELECT id FROM graduacoes_sistema WHERE nome = ?',
                [graduacaoNome]
            );
            const graduacaoAtualId = gradSistema.length > 0 ? gradSistema[0].id : 1; // Default: Branca (id=1)

            const [studentResult] = await connection.execute(`
                INSERT INTO alunos (
                    usuario_id, matricula, graduacao, graduacao_atual_id, programa, data_inicio,
                    plano_id, professor_responsavel, graus_faixa,
                    contato_emergencia, observacoes_medicas, status,
                    email_responsavel,
                    cep, rua, numero, complemento, bairro, cidade, estado,
                    nome_contato_emergencia,
                    tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
                    historico_fraturas, fraturas_detalhes,
                    tem_alergias, alergias_detalhes,
                    dia_vencimento, bolsista, valor_mensalidade_customizado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                matricula,
                graduacaoNome,
                graduacaoAtualId,
                programa,
                data_inicio,
                plano_id || null,
                professor_responsavel || null,
                parseInt(graus_faixa) || 0,
                contato_emergencia || null,
                observacoes_medicas || null,
                status || 'ativo',
                email_responsavel || null,
                cep || null,
                rua || null,
                numero || null,
                complemento || null,
                bairro || null,
                cidade || null,
                estado || null,
                nome_contato_emergencia || null,
                tipo_sanguineo || null,
                toBoolean(toma_medicamento),
                medicamentos_detalhes || null,
                toBoolean(historico_fraturas),
                fraturas_detalhes || null,
                toBoolean(tem_alergias),
                alergias_detalhes || null,
                parseInt(dia_vencimento) || 5,
                toBoolean(bolsista),
                valor_mensalidade_customizado ? parseFloat(valor_mensalidade_customizado) : null
            ]);

            return {
                studentId: studentResult.insertId,
                userId: userId,
                matricula
            };
        });

        logger.info(`Aluno criado completamente: ${nome} (${result.matricula}) por ${req.user.email}`);

        // Enviar email de boas-vindas com credenciais de primeiro acesso
        try {
            await sendFirstAccessEmail({
                nome: nome,
                email: emailFinal,
                senha: defaultPassword,
                tipo_usuario: 'aluno',
                matricula: result.matricula,
                usuarioId: result.userId
            });
            logger.info(`Email de boas-vindas enviado para: ${emailFinal}`);
        } catch (emailError) {
            logger.error(`Erro ao enviar email de boas-vindas para ${emailFinal}:`, emailError);
            // Não falhar a criação do aluno se o email não for enviado
        }

        // Configurar recorrência e criar mensalidades
        try {
            const studentFinancialData = {
                plano_id: plano_id || null,
                bolsista: bolsista === true || bolsista === 1 || bolsista === '1' || bolsista === 'true',
                valor_mensalidade_customizado: valor_mensalidade_customizado,
                dia_vencimento: dia_vencimento || 5,
                data_inicio: data_inicio
            };

            // Configurar recorrência de pagamento
            await configurarRecorrenciaParaAluno(result.studentId, studentFinancialData);
            logger.info(`Recorrência de pagamento configurada para aluno ${result.studentId}`);

            // Se não for bolsista, criar primeira mensalidade como PAGA e segunda como PENDENTE
            if (!studentFinancialData.bolsista) {
                const connection = await pool.getConnection();

                try {
                    // Determinar valor da mensalidade
                    let valorMensalidade = 150.00; // Valor padrão

                    if (valor_mensalidade_customizado && parseFloat(valor_mensalidade_customizado) > 0) {
                        valorMensalidade = parseFloat(valor_mensalidade_customizado);
                    } else if (plano_id) {
                        const [planos] = await connection.query(
                            'SELECT valor_mensal FROM planos WHERE id = ? AND status = "ativo"',
                            [plano_id]
                        );
                        if (planos.length > 0 && planos[0].valor_mensal) {
                            valorMensalidade = parseFloat(planos[0].valor_mensal);
                        }
                    }

                    // Datas de referência
                    const hoje = new Date();
                    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
                    const diaVenc = studentFinancialData.dia_vencimento;

                    // Data de vencimento da primeira mensalidade (mês atual)
                    const vencimentoPrimeira = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
                    // Data de vencimento da segunda mensalidade (próximo mês)
                    const vencimentoSegunda = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVenc);

                    // 1ª Mensalidade: Mês atual, status PAGO, data_pagamento = hoje
                    await connection.query(`
                        INSERT INTO mensalidades (
                            aluno_id, plano_id, mes_referencia, ano_referencia,
                            valor_base, valor_desconto, valor_acrescimo, valor_total,
                            data_vencimento, data_pagamento, status, forma_pagamento, observacoes
                        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'pago', 'dinheiro', 'Primeira mensalidade (entrada) - paga no cadastro')
                    `, [
                        result.studentId,
                        plano_id || null,
                        mesAtual.getMonth() + 1,
                        mesAtual.getFullYear(),
                        valorMensalidade,
                        valorMensalidade,
                        vencimentoPrimeira.toISOString().split('T')[0],
                        hoje.toISOString().split('T')[0]
                    ]);

                    logger.info(`Primeira mensalidade criada como PAGA para aluno ${result.studentId}`);

                    // 2ª Mensalidade: Próximo mês, status PENDENTE
                    await connection.query(`
                        INSERT INTO mensalidades (
                            aluno_id, plano_id, mes_referencia, ano_referencia,
                            valor_base, valor_desconto, valor_acrescimo, valor_total,
                            data_vencimento, status, observacoes
                        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, 'pendente', 'Segunda mensalidade gerada automaticamente')
                    `, [
                        result.studentId,
                        plano_id || null,
                        proximoMes.getMonth() + 1,
                        proximoMes.getFullYear(),
                        valorMensalidade,
                        valorMensalidade,
                        vencimentoSegunda.toISOString().split('T')[0]
                    ]);

                    logger.info(`Segunda mensalidade criada como PENDENTE para aluno ${result.studentId}`);
                } finally {
                    connection.release();
                }
            }
        } catch (paymentError) {
            logger.error(`Erro ao configurar pagamentos para aluno ${result.studentId}:`, paymentError);
            // Não falhar a criação do aluno se houver erro nos pagamentos
        }

        // Buscar dados completos do aluno para retornar
        const students = await query(`
            SELECT
                a.*,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento,
                u.endereco
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.id = ?
        `, [result.studentId]);

        const createdStudent = students[0];

        logger.info('[DEBUG] Aluno criado, retornando dados:', {
            studentId: result.studentId,
            studentData: createdStudent ? 'OK' : 'NULL'
        });

        res.status(201).json({
            message: 'Aluno criado com sucesso',
            studentId: result.studentId,
            userId: result.userId,
            matricula: result.matricula,
            defaultPassword: defaultPassword,
            emailSent: true,
            student: createdStudent || null
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

        // Buscar graduacao_atual_id baseado no nome da graduação
        const graduacaoSistema = await query(
            'SELECT id FROM graduacoes_sistema WHERE nome = ?',
            [graduacao]
        );
        const graduacaoAtualId = graduacaoSistema.length > 0 ? graduacaoSistema[0].id : 1; // Default: Branca (id=1)

        // Inserir aluno
        const result = await query(`
            INSERT INTO alunos (
                usuario_id, matricula, graduacao, graduacao_atual_id, programa, data_inicio,
                plano_id, professor_responsavel, graus_faixa,
                contato_emergencia, observacoes_medicas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            usuario_id, matricula, graduacao, graduacaoAtualId, programa, data_inicio,
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
// Log ANTES de qualquer middleware para confirmar que rota está sendo chamada
router.put('/:id', (req, res, next) => {
    console.log('🔍 PUT /api/students/:id RECEBIDO - ANTES DOS MIDDLEWARE');
    console.log('🔍 ID:', req.params.id);
    console.log('🔍 Body keys:', Object.keys(req.body));
    console.log('🔍 User autenticado:', req.user ? 'SIM' : 'NÃO');
    next();
}, [adminOrTeacher, ...updateStudentValidation], async (req, res) => {
    console.log('====== PUT /api/students/:id CHAMADO (ENHANCED) ======');
    console.log('ID do aluno:', req.params.id);
    console.log('Usuário:', req.user ? { id: req.user.id, email: req.user.email, tipo: req.user.tipo_usuario } : 'NÃO AUTENTICADO');
    console.log('Body recebido (primeiros campos):', {
        nome: req.body.nome,
        email: req.body.email,
        graduacao: req.body.graduacao,
        plano_id: req.body.plano_id
    });

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Erro de validação:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        console.log('✅ Validação OK - prosseguindo');

        const { id } = req.params;
        const {
            // Dados do usuário
            nome,
            email,
            telefone,
            data_nascimento,
            // Dados do aluno
            graduacao,
            programa,
            data_inicio,
            data_fim,
            plano_id,
            professor_responsavel,
            graus_faixa,
            status,
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
            observacoes_medicas,
            // Financeiro
            dia_vencimento,
            bolsista,
            bolsa_observacao,
            valor_mensalidade_customizado
        } = req.body;

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

        // Sanitizar campos numéricos (converter strings vazias em null)
        const sanitizeNumeric = (value) => {
            if (value === '' || value === 'null' || value === null || value === undefined) return null;
            const num = parseInt(value);
            return isNaN(num) ? null : num;
        };

        // Garantir que plano_id sempre tenha um valor válido
        let planoIdFinal = sanitizeNumeric(plano_id);
        if (!planoIdFinal || planoIdFinal === '' || planoIdFinal === 'null') {
            // Tentar usar o plano atual do aluno
            planoIdFinal = currentStudent.plano_id;

            // Se ainda for null, buscar plano padrão
            if (!planoIdFinal) {
                const [planosPadrao] = await query('SELECT id FROM planos WHERE status = "ativo" ORDER BY id LIMIT 1');
                planoIdFinal = planosPadrao ? planosPadrao.id : 1;
            }
        }

        // Fazer merge dos dados: usar novo valor se fornecido, senão manter o atual
        const updatedUserData = {
            nome: nome !== undefined ? nome : currentUser.nome,
            email: email !== undefined ? email : currentUser.email,
            telefone: telefone !== undefined ? telefone : currentUser.telefone,
            data_nascimento: data_nascimento !== undefined ? data_nascimento : currentUser.data_nascimento
        };

        const updatedStudentData = {
            graduacao: graduacao !== undefined ? graduacao : currentStudent.graduacao,
            programa: programa !== undefined ? programa : currentStudent.programa,
            data_inicio: data_inicio !== undefined ? data_inicio : currentStudent.data_inicio,
            data_fim: data_fim !== undefined ? data_fim : currentStudent.data_fim,
            plano_id: planoIdFinal,
            professor_responsavel: professor_responsavel !== undefined ? sanitizeNumeric(professor_responsavel) : currentStudent.professor_responsavel,
            graus_faixa: graus_faixa !== undefined ? parseInt(graus_faixa) || 0 : currentStudent.graus_faixa,
            status: status !== undefined ? status : currentStudent.status,
            // Endereço
            cep: cep !== undefined ? cep : currentStudent.cep,
            rua: rua !== undefined ? rua : currentStudent.rua,
            numero: numero !== undefined ? numero : currentStudent.numero,
            complemento: complemento !== undefined ? complemento : currentStudent.complemento,
            bairro: bairro !== undefined ? bairro : currentStudent.bairro,
            cidade: cidade !== undefined ? cidade : currentStudent.cidade,
            estado: estado !== undefined ? estado : currentStudent.estado,
            // Email responsável
            email_responsavel: email_responsavel !== undefined ? email_responsavel : currentStudent.email_responsavel,
            // Contato emergência
            nome_contato_emergencia: nome_contato_emergencia !== undefined ? nome_contato_emergencia : currentStudent.nome_contato_emergencia,
            contato_emergencia: contato_emergencia !== undefined ? contato_emergencia : currentStudent.contato_emergencia,
            // Informações médicas
            tipo_sanguineo: tipo_sanguineo !== undefined ? tipo_sanguineo : currentStudent.tipo_sanguineo,
            toma_medicamento: toma_medicamento !== undefined ? (toma_medicamento === true || toma_medicamento === 1 || toma_medicamento === '1' || toma_medicamento === 'true') : currentStudent.toma_medicamento,
            medicamentos_detalhes: medicamentos_detalhes !== undefined ? medicamentos_detalhes : currentStudent.medicamentos_detalhes,
            historico_fraturas: historico_fraturas !== undefined ? (historico_fraturas === true || historico_fraturas === 1 || historico_fraturas === '1' || historico_fraturas === 'true') : currentStudent.historico_fraturas,
            fraturas_detalhes: fraturas_detalhes !== undefined ? fraturas_detalhes : currentStudent.fraturas_detalhes,
            tem_alergias: tem_alergias !== undefined ? (tem_alergias === true || tem_alergias === 1 || tem_alergias === '1' || tem_alergias === 'true') : currentStudent.tem_alergias,
            alergias_detalhes: alergias_detalhes !== undefined ? alergias_detalhes : currentStudent.alergias_detalhes,
            observacoes_medicas: observacoes_medicas !== undefined ? observacoes_medicas : currentStudent.observacoes_medicas,
            // Financeiro
            dia_vencimento: dia_vencimento !== undefined ? parseInt(dia_vencimento) || 1 : currentStudent.dia_vencimento,
            bolsista: bolsista !== undefined ? (bolsista === true || bolsista === 1 || bolsista === '1' || bolsista === 'true') : currentStudent.bolsista,
            bolsa_observacao: bolsa_observacao !== undefined ? bolsa_observacao : currentStudent.bolsa_observacao,
            valor_mensalidade_customizado: valor_mensalidade_customizado !== undefined && valor_mensalidade_customizado !== '' && valor_mensalidade_customizado !== null ? parseFloat(valor_mensalidade_customizado) : null
        };

        // Verificar se email já existe para outro usuário
        if (email !== undefined && email !== currentUser.email) {
            const existingUsers = await query(
                'SELECT id FROM usuarios WHERE email = ? AND id != ?',
                [updatedUserData.email, usuarioId]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'Email já está em uso por outro usuário' });
            }
        }

        // Buscar graduacao_atual_id baseado no nome da graduação
        const graduacaoSistema = await query(
            'SELECT id FROM graduacoes_sistema WHERE nome = ?',
            [updatedStudentData.graduacao]
        );
        const graduacaoAtualId = graduacaoSistema.length > 0 ? graduacaoSistema[0].id : currentStudent.graduacao_atual_id || 1;

        // Usar transação
        console.log('🔄 Iniciando transação...');
        console.log('📊 Dados do usuário a atualizar:', updatedUserData);
        console.log('📊 Dados do aluno a atualizar (resumo):', {
            graduacao: updatedStudentData.graduacao,
            plano_id: updatedStudentData.plano_id,
            status: updatedStudentData.status,
            professor_responsavel: updatedStudentData.professor_responsavel
        });

        await transaction(async (connection) => {
            // 1. Atualizar dados do usuário
            console.log('🔹 [TRANSACTION] Atualizando tabela usuarios, ID:', usuarioId);
            try {
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
                console.log('✅ [TRANSACTION] Tabela usuarios atualizada com sucesso');
            } catch (err) {
                console.error('❌ [TRANSACTION] ERRO ao atualizar usuarios:');
                console.error('   Message:', err.message);
                console.error('   Code:', err.code);
                console.error('   SQL:', err.sql);
                throw err;
            }

            // 2. Atualizar dados do aluno
            console.log('🔹 [TRANSACTION] Atualizando tabela alunos, ID:', id);
            try {
                await connection.execute(`
                UPDATE alunos
                SET graduacao = ?, graduacao_atual_id = ?, programa = ?, data_inicio = ?, data_fim = ?,
                    plano_id = ?, professor_responsavel = ?, graus_faixa = ?, status = ?,
                    cep = ?, rua = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?,
                    email_responsavel = ?,
                    nome_contato_emergencia = ?, contato_emergencia = ?,
                    tipo_sanguineo = ?, toma_medicamento = ?, medicamentos_detalhes = ?,
                    historico_fraturas = ?, fraturas_detalhes = ?,
                    tem_alergias = ?, alergias_detalhes = ?, observacoes_medicas = ?,
                    dia_vencimento = ?, bolsista = ?, bolsa_observacao = ?, valor_mensalidade_customizado = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                updatedStudentData.graduacao,
                graduacaoAtualId,
                updatedStudentData.programa,
                updatedStudentData.data_inicio,
                updatedStudentData.data_fim,
                updatedStudentData.plano_id,
                updatedStudentData.professor_responsavel,
                updatedStudentData.graus_faixa,
                updatedStudentData.status,
                // Endereço
                updatedStudentData.cep,
                updatedStudentData.rua,
                updatedStudentData.numero,
                updatedStudentData.complemento,
                updatedStudentData.bairro,
                updatedStudentData.cidade,
                updatedStudentData.estado,
                // Email responsável
                updatedStudentData.email_responsavel,
                // Contato emergência
                updatedStudentData.nome_contato_emergencia,
                updatedStudentData.contato_emergencia,
                // Informações médicas
                updatedStudentData.tipo_sanguineo,
                updatedStudentData.toma_medicamento,
                updatedStudentData.medicamentos_detalhes,
                updatedStudentData.historico_fraturas,
                updatedStudentData.fraturas_detalhes,
                updatedStudentData.tem_alergias,
                updatedStudentData.alergias_detalhes,
                updatedStudentData.observacoes_medicas,
                // Financeiro
                updatedStudentData.dia_vencimento,
                updatedStudentData.bolsista,
                updatedStudentData.bolsa_observacao,
                updatedStudentData.valor_mensalidade_customizado,
                id
            ]);
                console.log('✅ [TRANSACTION] Tabela alunos atualizada com sucesso');
            } catch (err) {
                console.error('❌ [TRANSACTION] ERRO ao atualizar alunos:');
                console.error('   Message:', err.message);
                console.error('   Code:', err.code);
                console.error('   SQL:', err.sql);
                console.error('   SQL State:', err.sqlState);
                console.error('   SQL Message:', err.sqlMessage);
                throw err;
            }

            console.log('✅ [TRANSACTION] Transação completada com sucesso');
        });

        console.log('✅ SUCESSO - Aluno atualizado completamente');
        logger.info(`Aluno atualizado completamente: ID ${id} por ${req.user.email}`);

        res.json({ message: 'Aluno atualizado com sucesso' });

    } catch (error) {
        logger.error('Erro ao atualizar aluno:', error);
        console.error('====== ERRO DETALHADO UPDATE ALUNO ======');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('SQL:', error.sql);
        console.error('Stack:', error.stack);
        console.error('==========================================');

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email já está em uso' });
        }
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(400).json({ error: `Campo inválido: ${error.message}` });
        }
        if (error.sqlMessage) {
            return res.status(400).json({ error: `Erro SQL: ${error.sqlMessage}` });
        }
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
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