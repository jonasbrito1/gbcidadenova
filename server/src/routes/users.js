const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOnly, selfOrAdmin } = require('../middleware/auth');
const { sendPasswordChangedEmail, sendFirstAccessEmail } = require('../services/emailService');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Validações
const userValidation = [
    body('nome').trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('telefone').optional({ nullable: true, checkFalsy: true }).isMobilePhone('pt-BR').withMessage('Telefone inválido'),
    body('tipo_usuario').isIn(['admin', 'professor', 'aluno']).withMessage('Tipo de usuário inválido'),
    body('status').optional().isIn(['ativo', 'inativo', 'suspenso']).withMessage('Status inválido')
];

// Validação para atualização (campos mais flexíveis)
const userUpdateValidation = [
    body('nome').trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('telefone').optional({ nullable: true, checkFalsy: true }).isMobilePhone('pt-BR').withMessage('Telefone inválido'),
    body('tipo_usuario').optional().isIn(['admin', 'professor', 'aluno']).withMessage('Tipo de usuário inválido'),
    body('status').optional().isIn(['ativo', 'inativo', 'suspenso']).withMessage('Status inválido'),
    body('senha').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
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
        const users = await query(`
            SELECT id, nome, email, telefone, data_nascimento, endereco,
                   tipo_usuario, status, created_at, ultimo_login
            FROM usuarios
            ${whereClause}
            ORDER BY nome
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `, params);

        // Contar total
        const countResult = await query(`
            SELECT COUNT(*) as total FROM usuarios ${whereClause}
        `, params);

        res.json({
            users,
            total: countResult[0]?.total || 0,
            page: parseInt(page),
            totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
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

        logger.info(`Buscando usuário ID: ${id}`);

        const users = await query(`
            SELECT
                u.id, u.nome, u.email, u.telefone, u.data_nascimento, u.endereco,
                u.tipo_usuario, u.status, u.created_at, u.ultimo_login,
                u.primeiro_acesso, u.lgpd_aceite,
                a.id as aluno_id, a.matricula, a.programa, a.graduacao, a.graus_faixa,
                a.data_inicio, a.data_fim, a.contato_emergencia, a.observacoes_medicas,
                a.plano_id, p.nome as plano_nome, p.valor_mensal,
                a.professor_responsavel, prof.nome as professor_responsavel_nome,
                a.cep, a.rua, a.numero, a.complemento, a.bairro, a.cidade, a.estado,
                a.email_responsavel, a.nome_contato_emergencia,
                a.tipo_sanguineo, a.toma_medicamento, a.medicamentos_detalhes,
                a.historico_fraturas, a.fraturas_detalhes,
                a.tem_alergias, a.alergias_detalhes,
                pr.especialidades as especialidade, pr.graduacao_id,
                g.nome as graduacao_professor
            FROM usuarios u
            LEFT JOIN alunos a ON u.id = a.usuario_id
            LEFT JOIN planos p ON a.plano_id = p.id
            LEFT JOIN professores prof_data ON a.professor_responsavel = prof_data.id
            LEFT JOIN usuarios prof ON prof_data.usuario_id = prof.id
            LEFT JOIN professores pr ON u.id = pr.usuario_id
            LEFT JOIN graduacoes_sistema g ON pr.graduacao_id = g.id
            WHERE u.id = ?
        `, [id]);

        if (users.length === 0) {
            logger.warn(`Usuário ID ${id} não encontrado`);
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        logger.info(`Usuário encontrado: ${users[0].nome} (${users[0].tipo_usuario})`);
        logger.debug('Dados do usuário:', JSON.stringify(users[0], null, 2));

        res.json(users[0]);

    } catch (error) {
        logger.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
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

        const {
            nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario,
            // Campos de aluno
            programa, graduacao, graus_faixa, plano_id, professor_responsavel,
            data_inicio, contato_emergencia, observacoes_medicas,
            // Campos de professor
            especialidade, graduacao_professor
        } = req.body;

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

        const usuarioId = result.insertId;
        let matricula = null;

        // Se for aluno, criar registro na tabela alunos
        if (tipo_usuario === 'aluno') {
            // Gerar matrícula (ano + sequencial)
            const ano = new Date().getFullYear();
            const ultimoAluno = await query('SELECT matricula FROM alunos ORDER BY id DESC LIMIT 1');
            let sequencial = 1;
            if (ultimoAluno.length > 0 && ultimoAluno[0].matricula) {
                const ultimaMatricula = ultimoAluno[0].matricula;
                const ultimoSequencial = parseInt(ultimaMatricula.substring(4));
                sequencial = ultimoSequencial + 1;
            }
            matricula = `${ano}${sequencial.toString().padStart(4, '0')}`;

            await query(`
                INSERT INTO alunos (
                    usuario_id, matricula, programa, graduacao, graus_faixa,
                    plano_id, professor_responsavel, data_inicio,
                    contato_emergencia, observacoes_medicas, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
            `, [
                usuarioId, matricula, programa || 'Adultos',
                graduacao || 'Branca', graus_faixa || 0,
                plano_id || null, professor_responsavel || null,
                data_inicio || new Date().toISOString().split('T')[0],
                contato_emergencia || null, observacoes_medicas || null
            ]);
        }

        // Se for professor, criar registro na tabela professores
        if (tipo_usuario === 'professor') {
            await query(`
                INSERT INTO professores (
                    usuario_id, nome, email, telefone, especialidade, graduacao, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'ativo')
            `, [
                usuarioId, nome, email, telefone,
                especialidade || null, graduacao_professor || 'Branca'
            ]);
        }

        logger.info(`Usuário criado: ${email} (${tipo_usuario}) por ${req.user.email}`);

        // Enviar email de primeiro acesso
        try {
            await sendFirstAccessEmail({
                nome,
                email,
                senha, // Enviar senha em texto plano no email
                tipo_usuario,
                matricula,
                usuarioId
            });
            logger.info(`Email de primeiro acesso enviado para: ${email}`);
        } catch (emailError) {
            logger.warn(`Falha ao enviar email de primeiro acesso: ${emailError.message}`);
            // Não falhar a requisição se o email não for enviado
        }

        res.status(201).json({
            message: 'Usuário criado com sucesso! Um email foi enviado com as credenciais de acesso.',
            userId: usuarioId,
            matricula
        });

    } catch (error) {
        logger.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar usuário
router.put('/:id', [selfOrAdmin, ...userUpdateValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const {
            nome, email, telefone, data_nascimento, endereco, tipo_usuario, status, senha,
            // Campos de aluno
            programa, graduacao, graus_faixa, plano_id, professor_responsavel, data_inicio,
            contato_emergencia, observacoes_medicas,
            // Campos de endereço detalhado
            cep, rua, numero, complemento, bairro, cidade, estado,
            // Campos de contato de emergência
            email_responsavel, nome_contato_emergencia,
            // Campos médicos
            tipo_sanguineo, toma_medicamento, medicamentos_detalhes,
            historico_fraturas, fraturas_detalhes, tem_alergias, alergias_detalhes,
            // Campos de professor
            especialidade, graduacao_professor
        } = req.body;

        // Verificar se usuário existe
        const existingUsers = await query('SELECT id, nome, email FROM usuarios WHERE id = ?', [id]);
        if (existingUsers.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar se email já está em uso por outro usuário
        const emailUsers = await query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
        if (emailUsers.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Converter data_nascimento para formato MySQL (YYYY-MM-DD)
        let dataNascimentoFormatada = data_nascimento;
        if (data_nascimento) {
            const date = new Date(data_nascimento);
            if (!isNaN(date.getTime())) {
                dataNascimentoFormatada = date.toISOString().split('T')[0]; // YYYY-MM-DD
            }
        }

        // Montar query de atualização
        let updateFields = ['nome = ?', 'email = ?', 'telefone = ?', 'data_nascimento = ?', 'endereco = ?'];
        let updateParams = [nome, email, telefone, dataNascimentoFormatada, endereco];

        // Variável para controlar se senha foi alterada
        let senhaAlterada = false;
        let senhaTextoPlano = null;

        // Se senha foi fornecida, fazer hash e adicionar à atualização
        if (senha && senha.trim() !== '') {
            senhaAlterada = true;
            senhaTextoPlano = senha.trim();
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(senhaTextoPlano, saltRounds);
            updateFields.push('senha = ?');
            updateParams.push(hashedPassword);
        }

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

        // Verificar se usuário é aluno e atualizar tabela de alunos
        const alunoCheck = await query('SELECT id FROM alunos WHERE usuario_id = ?', [id]);

        if (alunoCheck.length > 0) {
            // Usuário é aluno, atualizar dados na tabela alunos
            const alunoUpdateFields = [];
            const alunoUpdateParams = [];

            if (programa !== undefined) {
                alunoUpdateFields.push('programa = ?');
                alunoUpdateParams.push(programa);
            }
            if (graduacao !== undefined) {
                alunoUpdateFields.push('graduacao = ?');
                alunoUpdateParams.push(graduacao);
            }
            if (graus_faixa !== undefined) {
                alunoUpdateFields.push('graus_faixa = ?');
                alunoUpdateParams.push(parseInt(graus_faixa) || 0);
            }
            if (plano_id !== undefined) {
                alunoUpdateFields.push('plano_id = ?');
                alunoUpdateParams.push(plano_id || null);
            }
            if (professor_responsavel !== undefined) {
                alunoUpdateFields.push('professor_responsavel = ?');
                alunoUpdateParams.push(professor_responsavel || null);
            }
            if (data_inicio !== undefined) {
                alunoUpdateFields.push('data_inicio = ?');
                alunoUpdateParams.push(data_inicio);
            }
            if (contato_emergencia !== undefined) {
                alunoUpdateFields.push('contato_emergencia = ?');
                alunoUpdateParams.push(contato_emergencia);
            }
            if (observacoes_medicas !== undefined) {
                alunoUpdateFields.push('observacoes_medicas = ?');
                alunoUpdateParams.push(observacoes_medicas);
            }

            // Campos de endereço
            if (cep !== undefined) {
                alunoUpdateFields.push('cep = ?');
                alunoUpdateParams.push(cep);
            }
            if (rua !== undefined) {
                alunoUpdateFields.push('rua = ?');
                alunoUpdateParams.push(rua);
            }
            if (numero !== undefined) {
                alunoUpdateFields.push('numero = ?');
                alunoUpdateParams.push(numero);
            }
            if (complemento !== undefined) {
                alunoUpdateFields.push('complemento = ?');
                alunoUpdateParams.push(complemento);
            }
            if (bairro !== undefined) {
                alunoUpdateFields.push('bairro = ?');
                alunoUpdateParams.push(bairro);
            }
            if (cidade !== undefined) {
                alunoUpdateFields.push('cidade = ?');
                alunoUpdateParams.push(cidade);
            }
            if (estado !== undefined) {
                alunoUpdateFields.push('estado = ?');
                alunoUpdateParams.push(estado);
            }

            // Campos de contato de emergência
            if (email_responsavel !== undefined) {
                alunoUpdateFields.push('email_responsavel = ?');
                alunoUpdateParams.push(email_responsavel);
            }
            if (nome_contato_emergencia !== undefined) {
                alunoUpdateFields.push('nome_contato_emergencia = ?');
                alunoUpdateParams.push(nome_contato_emergencia);
            }

            // Campos médicos
            if (tipo_sanguineo !== undefined) {
                alunoUpdateFields.push('tipo_sanguineo = ?');
                alunoUpdateParams.push(tipo_sanguineo);
            }
            if (toma_medicamento !== undefined) {
                alunoUpdateFields.push('toma_medicamento = ?');
                alunoUpdateParams.push(toma_medicamento === '1' || toma_medicamento === true);
            }
            if (medicamentos_detalhes !== undefined) {
                alunoUpdateFields.push('medicamentos_detalhes = ?');
                alunoUpdateParams.push(medicamentos_detalhes);
            }
            if (historico_fraturas !== undefined) {
                alunoUpdateFields.push('historico_fraturas = ?');
                alunoUpdateParams.push(historico_fraturas === '1' || historico_fraturas === true);
            }
            if (fraturas_detalhes !== undefined) {
                alunoUpdateFields.push('fraturas_detalhes = ?');
                alunoUpdateParams.push(fraturas_detalhes);
            }
            if (tem_alergias !== undefined) {
                alunoUpdateFields.push('tem_alergias = ?');
                alunoUpdateParams.push(tem_alergias === '1' || tem_alergias === true);
            }
            if (alergias_detalhes !== undefined) {
                alunoUpdateFields.push('alergias_detalhes = ?');
                alunoUpdateParams.push(alergias_detalhes);
            }

            // Se houver campos para atualizar, executar o UPDATE
            if (alunoUpdateFields.length > 0) {
                alunoUpdateParams.push(id);
                await query(`
                    UPDATE alunos
                    SET ${alunoUpdateFields.join(', ')}, updated_at = NOW()
                    WHERE usuario_id = ?
                `, alunoUpdateParams);
                logger.info(`Dados de aluno atualizados para usuário ID: ${id}`);
            }
        }

        // Verificar se usuário é professor e atualizar tabela de professores
        const professorCheck = await query('SELECT id FROM professores WHERE usuario_id = ?', [id]);

        if (professorCheck.length > 0) {
            // Usuário é professor, atualizar dados na tabela professores
            const professorUpdateFields = [];
            const professorUpdateParams = [];

            if (especialidade !== undefined) {
                professorUpdateFields.push('especialidades = ?');
                professorUpdateParams.push(especialidade);
            }
            if (graduacao_professor !== undefined) {
                professorUpdateFields.push('graduacao_id = ?');
                // Se for string, tentar converter para ID da graduação
                if (typeof graduacao_professor === 'string') {
                    const gradResult = await query('SELECT id FROM graduacoes_sistema WHERE nome = ?', [graduacao_professor]);
                    professorUpdateParams.push(gradResult.length > 0 ? gradResult[0].id : null);
                } else {
                    professorUpdateParams.push(graduacao_professor);
                }
            }

            // Se houver campos para atualizar, executar o UPDATE
            if (professorUpdateFields.length > 0) {
                professorUpdateParams.push(id);
                await query(`
                    UPDATE professores
                    SET ${professorUpdateFields.join(', ')}, updated_at = NOW()
                    WHERE usuario_id = ?
                `, professorUpdateParams);
                logger.info(`Dados de professor atualizados para usuário ID: ${id}`);
            }
        }

        logger.info(`Usuário atualizado: ${email} por ${req.user.email}`);

        // Se a senha foi alterada, enviar email com a nova senha
        if (senhaAlterada) {
            try {
                await sendPasswordChangedEmail({
                    nome: existingUsers[0].nome,
                    email: existingUsers[0].email,
                    novaSenha: senhaTextoPlano,
                    alteradoPor: req.user.nome || req.user.email,
                    usuarioId: id
                });
                logger.info(`Email de senha alterada enviado para: ${existingUsers[0].email}`);
            } catch (emailError) {
                logger.warn(`Falha ao enviar email de senha alterada: ${emailError.message}`);
                // Não falhar a requisição se o email não for enviado
            }
        }

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
