const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configurar diretório de uploads
const uploadDir = path.join(__dirname, '../../uploads/profile-photos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer para upload de fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas (JPEG, PNG, GIF)'));
        }
    }
});

/**
 * GET /api/student-profile/me
 * Obter dados completos do perfil do aluno logado
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar dados do aluno
        const alunos = await query(`
            SELECT
                a.*,
                u.email,
                u.nome as usuario_nome,
                u.telefone as usuario_telefone,
                u.data_nascimento as usuario_data_nascimento,
                u.endereco as usuario_endereco,
                u.foto_url as usuario_foto_url,
                p.nome as plano_nome,
                p.valor_mensal as plano_valor,
                gs.nome as graduacao_atual_nome,
                gs.cor as graduacao_atual_cor,
                gs.ordem as graduacao_atual_ordem
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.usuario_id = ?
        `, [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Perfil de aluno não encontrado' });
        }

        const aluno = alunos[0];

        // Buscar graduações do aluno
        const graduacoes = await query(`
            SELECT
                g.*,
                gs.nome as graduacao_nome,
                gs.cor as graduacao_cor,
                gs.ordem as graduacao_ordem
            FROM graduacoes g
            INNER JOIN graduacoes_sistema gs ON g.graduacao_nova_id = gs.id
            WHERE g.aluno_id = ?
            ORDER BY g.data_graduacao DESC
        `, [aluno.id]);

        // Mapear campos do banco para os campos esperados pelo frontend
        const profileData = {
            // Campos de identificação
            id: aluno.id,
            matricula: aluno.matricula,
            usuario_id: aluno.usuario_id,
            email: aluno.email,
            usuario_foto_url: aluno.usuario_foto_url,

            // Dados pessoais (mapear para o que o frontend espera)
            nome_completo: aluno.usuario_nome,
            data_nascimento: aluno.usuario_data_nascimento,
            telefone: aluno.telefone || aluno.usuario_telefone || '',
            telefone_emergencia: aluno.telefone_emergencia || aluno.contato_emergencia || '',

            // Endereço completo (usar dados da tabela alunos se existirem, senão usar da tabela usuarios)
            endereco: aluno.rua ? `${aluno.rua}${aluno.numero ? ', ' + aluno.numero : ''}${aluno.complemento ? ' - ' + aluno.complemento : ''}` : aluno.usuario_endereco || '',
            rua: aluno.rua || '',
            numero: aluno.numero || '',
            complemento: aluno.complemento || '',
            bairro: aluno.bairro || '',
            cidade: aluno.cidade || '',
            estado: aluno.estado || '',
            cep: aluno.cep || '',

            // Dados do responsável
            responsavel_nome: aluno.responsavel_nome || aluno.nome_contato_emergencia || '',
            responsavel_telefone: aluno.responsavel_telefone || '',
            responsavel_parentesco: aluno.responsavel_parentesco || '',
            email_responsavel: aluno.email_responsavel || '',

            // Dados acadêmicos
            programa: aluno.programa,
            graduacao: aluno.graduacao,
            graduacao_atual_id: aluno.graduacao_atual_id,
            graduacao_atual_nome: aluno.graduacao_atual_nome,
            graduacao_atual_cor: aluno.graduacao_atual_cor,
            graduacao_atual_ordem: aluno.graduacao_atual_ordem,
            graus_faixa: aluno.graus_faixa,
            data_inicio: aluno.data_inicio,
            data_fim: aluno.data_fim,
            status: aluno.status,

            // Plano
            plano_id: aluno.plano_id,
            plano_nome: aluno.plano_nome,
            plano_valor: aluno.plano_valor,

            // Informações adicionais
            objetivo: aluno.objetivo || '',
            observacoes_medicas: aluno.observacoes_medicas,

            // Informações médicas detalhadas
            tipo_sanguineo: aluno.tipo_sanguineo,
            toma_medicamento: aluno.toma_medicamento,
            medicamentos_detalhes: aluno.medicamentos_detalhes,
            medicamentos_uso: aluno.medicamentos_detalhes || '',  // Alias para frontend
            historico_fraturas: aluno.historico_fraturas,
            fraturas_detalhes: aluno.fraturas_detalhes,
            tem_alergias: aluno.tem_alergias,
            alergias_detalhes: aluno.alergias_detalhes,
            alergias: aluno.alergias_detalhes || '',  // Alias para frontend
            condicoes_saude: aluno.observacoes_medicas || '',  // Alias para frontend

            // Informações médicas de emergência
            contato_emergencia_medica: aluno.contato_emergencia_medica || '',
            telefone_emergencia_medica: aluno.telefone_emergencia_medica || '',

            // Plano de saúde
            plano_saude: aluno.plano_saude || '',
            numero_plano_saude: aluno.numero_plano_saude || '',

            // Graduações históricas
            graduacoes
        };

        res.json(profileData);

    } catch (error) {
        logger.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * PUT /api/student-profile/me
 * Atualizar dados do perfil do aluno (exceto graduação)
 */
router.put('/me', [
    authenticateToken,
    body('nome_completo').optional({ checkFalsy: true }).trim().isLength({ min: 3 }),
    body('data_nascimento').optional({ checkFalsy: true }).isISO8601(),
    body('telefone').optional({ checkFalsy: true }),
    body('telefone_emergencia').optional({ checkFalsy: true }),
    body('endereco').optional({ checkFalsy: true }),
    body('numero').optional({ checkFalsy: true }),
    body('complemento').optional({ checkFalsy: true }),
    body('bairro').optional({ checkFalsy: true }),
    body('cidade').optional({ checkFalsy: true }),
    body('estado').optional({ checkFalsy: true }),
    body('cep').optional({ checkFalsy: true }),
    body('responsavel_nome').optional({ checkFalsy: true }),
    body('responsavel_telefone').optional({ checkFalsy: true }),
    body('contato_emergencia_medica').optional({ checkFalsy: true }),
    body('telefone_emergencia_medica').optional({ checkFalsy: true }),
    body('plano_saude').optional({ checkFalsy: true }),
    body('numero_plano_saude').optional({ checkFalsy: true }),
    body('condicoes_saude').optional({ checkFalsy: true }),
    body('medicamentos_uso').optional({ checkFalsy: true }),
    body('tipo_sanguineo').optional({ checkFalsy: true }),
    body('alergias').optional({ checkFalsy: true }),
    body('responsavel_parentesco').optional({ checkFalsy: true }),
    body('email').optional({ checkFalsy: true }).isEmail(),
    body('objetivo').optional({ checkFalsy: true })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Erro de validação ao atualizar perfil:', errors.array());
            return res.status(400).json({
                error: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const {
            nome_completo,
            data_nascimento,
            email,
            telefone,
            telefone_emergencia,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep,
            responsavel_nome,
            responsavel_telefone,
            responsavel_parentesco,
            contato_emergencia_medica,
            telefone_emergencia_medica,
            plano_saude,
            numero_plano_saude,
            tipo_sanguineo,
            alergias,
            condicoes_saude,
            medicamentos_uso,
            objetivo
        } = req.body;

        // Buscar aluno
        const alunos = await query('SELECT id FROM alunos WHERE usuario_id = ?', [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Perfil não encontrado' });
        }

        const alunoId = alunos[0].id;

        // Atualizar dados do aluno (NÃO inclui graduação_atual - apenas professor/admin podem alterar)
        const updates = [];
        const values = [];

        // Atualizar nome, email, data_nascimento E telefone na tabela usuarios
        const userUpdates = [];
        const userValues = [];

        if (nome_completo !== undefined && nome_completo !== '') {
            userUpdates.push('nome = ?');
            userValues.push(nome_completo);
        }
        if (email !== undefined && email !== '') {
            userUpdates.push('email = ?');
            userValues.push(email);
        }
        if (data_nascimento !== undefined && data_nascimento !== '') {
            userUpdates.push('data_nascimento = ?');
            userValues.push(data_nascimento);
        }
        if (telefone !== undefined && telefone !== '') {
            userUpdates.push('telefone = ?');
            userValues.push(telefone);
        }

        if (userUpdates.length > 0) {
            userValues.push(userId);
            await query(
                `UPDATE usuarios SET ${userUpdates.join(', ')} WHERE id = ?`,
                userValues
            );
        }

        // Atualizar campos da tabela alunos
        if (telefone_emergencia !== undefined) {
            updates.push('contato_emergencia = ?');  // Campo 'telefone_emergencia' mapeado para 'contato_emergencia'
            values.push(telefone_emergencia);
        }
        if (endereco !== undefined) {
            updates.push('rua = ?');  // Campo 'endereco' mapeado para 'rua'
            values.push(endereco);
        }
        if (numero !== undefined) {
            updates.push('numero = ?');
            values.push(numero);
        }
        if (complemento !== undefined) {
            updates.push('complemento = ?');
            values.push(complemento);
        }
        if (bairro !== undefined) {
            updates.push('bairro = ?');
            values.push(bairro);
        }
        if (cidade !== undefined) {
            updates.push('cidade = ?');
            values.push(cidade);
        }
        if (estado !== undefined) {
            updates.push('estado = ?');
            values.push(estado);
        }
        if (cep !== undefined) {
            updates.push('cep = ?');
            values.push(cep);
        }
        if (responsavel_nome !== undefined) {
            updates.push('responsavel_nome = ?');
            values.push(responsavel_nome);
        }
        if (responsavel_telefone !== undefined) {
            updates.push('responsavel_telefone = ?');
            values.push(responsavel_telefone);
        }
        if (responsavel_parentesco !== undefined) {
            updates.push('responsavel_parentesco = ?');
            values.push(responsavel_parentesco);
        }
        if (contato_emergencia_medica !== undefined) {
            updates.push('contato_emergencia_medica = ?');
            values.push(contato_emergencia_medica);
        }
        if (telefone_emergencia_medica !== undefined) {
            updates.push('telefone_emergencia_medica = ?');
            values.push(telefone_emergencia_medica);
        }
        if (plano_saude !== undefined) {
            updates.push('plano_saude = ?');
            values.push(plano_saude);
        }
        if (numero_plano_saude !== undefined) {
            updates.push('numero_plano_saude = ?');
            values.push(numero_plano_saude);
        }
        if (tipo_sanguineo !== undefined) {
            updates.push('tipo_sanguineo = ?');
            values.push(tipo_sanguineo);
        }
        if (alergias !== undefined) {
            updates.push('alergias_detalhes = ?');  // Campo 'alergias' mapeado para 'alergias_detalhes'
            values.push(alergias);
        }
        if (condicoes_saude !== undefined) {
            updates.push('observacoes_medicas = ?');  // Campo 'condicoes_saude' mapeado para 'observacoes_medicas'
            values.push(condicoes_saude);
        }
        if (medicamentos_uso !== undefined) {
            updates.push('medicamentos_detalhes = ?');  // Campo 'medicamentos_uso' mapeado para 'medicamentos_detalhes'
            values.push(medicamentos_uso);
        }
        if (objetivo !== undefined) {
            updates.push('objetivo = ?');
            values.push(objetivo);
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(alunoId);

            const sqlQuery = `UPDATE alunos SET ${updates.join(', ')} WHERE id = ?`;

            // Log de debug
            logger.info('Executando UPDATE no perfil do aluno:', {
                alunoId,
                camposAtualizados: updates.length - 1, // -1 porque updated_at é automático
                sql: sqlQuery,
                values: values.slice(0, -1) // Não logar o ID no final
            });

            await query(sqlQuery, values);
        }

        logger.info(`Perfil atualizado pelo aluno: ${req.user.email}`);

        res.json({ message: 'Perfil atualizado com sucesso' });

    } catch (error) {
        logger.error('Erro ao atualizar perfil:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            email: req.user?.email
        });
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message // Adicionar mensagem de erro detalhada
        });
    }
});

/**
 * POST /api/student-profile/upload-photo
 * Upload de foto de perfil
 */
router.post('/upload-photo', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
        }

        const userId = req.user.id;
        const photoPath = `/uploads/profile-photos/${req.file.filename}`;

        // Buscar foto antiga para deletar
        const users = await query('SELECT foto_url FROM usuarios WHERE id = ?', [userId]);
        const oldPhoto = users[0]?.foto_url;

        // Atualizar foto na tabela usuarios com path relativo (sem host)
        await query('UPDATE usuarios SET foto_url = ?, updated_at = NOW() WHERE id = ?', [photoPath, userId]);

        // Deletar foto antiga se existir e não for do Google
        if (oldPhoto && (oldPhoto.includes('/uploads/') || oldPhoto.startsWith('/uploads/'))) {
            // Extrair apenas o path relativo se for URL completo
            let relativePath = oldPhoto;
            if (oldPhoto.startsWith('http')) {
                try {
                    const url = new URL(oldPhoto);
                    relativePath = url.pathname;
                } catch (e) {
                    // Se não conseguir fazer parse, usar como está
                }
            }

            const oldPhotoPath = path.join(__dirname, '../..', relativePath);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        logger.info(`Foto de perfil atualizada: ${req.user.email}`);

        res.json({
            message: 'Foto atualizada com sucesso',
            foto_url: photoPath
        });

    } catch (error) {
        logger.error('Erro ao fazer upload de foto:', error);

        // Deletar arquivo se houver erro
        if (req.file) {
            const filePath = path.join(uploadDir, req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(500).json({ error: 'Erro ao fazer upload da foto' });
    }
});

/**
 * GET /api/student-profile/dependentes
 * Listar todos os alunos/filhos vinculados ao responsável
 */
router.get('/dependentes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar email do usuário logado
        const [usuario] = await query('SELECT email FROM usuarios WHERE id = ?', [userId]);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const emailResponsavel = usuario.email;

        // Buscar todos os alunos onde:
        // 1. email_responsavel = email do usuário logado OU
        // 2. usuario_id = usuário logado (o próprio aluno)
        const dependentes = await query(`
            SELECT
                a.id,
                a.matricula,
                a.usuario_id,
                a.programa,
                a.graduacao,
                a.graus_faixa,
                a.data_inicio,
                a.status,
                a.email_responsavel,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento,
                u.foto_url,
                p.nome as plano_nome,
                p.valor_mensal as plano_valor,
                gs.nome as graduacao_atual_nome,
                gs.cor as graduacao_atual_cor,
                gs.ordem as graduacao_atual_ordem,
                CASE
                    WHEN a.usuario_id = ? THEN true
                    ELSE false
                END as eh_proprio_aluno
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.email_responsavel = ? OR a.usuario_id = ?
            ORDER BY
                CASE WHEN a.usuario_id = ? THEN 0 ELSE 1 END,
                u.nome
        `, [userId, emailResponsavel, userId, userId]);

        res.json({
            total: dependentes.length,
            dependentes
        });

    } catch (error) {
        logger.error('Erro ao buscar dependentes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-profile/dependente/:id
 * Obter dados completos de um dependente específico
 * Apenas se o usuário logado for o responsável
 */
router.get('/dependente/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dependenteId = req.params.id;

        // Buscar email do usuário logado
        const [usuario] = await query('SELECT email FROM usuarios WHERE id = ?', [userId]);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const emailResponsavel = usuario.email;

        // Verificar se o dependente pertence ao responsável
        const [aluno] = await query(`
            SELECT COUNT(*) as count
            FROM alunos
            WHERE id = ? AND (email_responsavel = ? OR usuario_id = ?)
        `, [dependenteId, emailResponsavel, userId]);

        if (aluno.count === 0) {
            return res.status(403).json({ error: 'Acesso negado a este dependente' });
        }

        // Buscar dados completos do dependente
        const [dependente] = await query(`
            SELECT
                a.*,
                u.email,
                u.nome as usuario_nome,
                u.telefone as usuario_telefone,
                u.data_nascimento as usuario_data_nascimento,
                u.endereco as usuario_endereco,
                u.foto_url as usuario_foto_url,
                p.nome as plano_nome,
                p.valor_mensal as plano_valor,
                gs.nome as graduacao_atual_nome,
                gs.cor as graduacao_atual_cor,
                gs.ordem as graduacao_atual_ordem
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN planos p ON a.plano_id = p.id
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.id = ?
        `, [dependenteId]);

        if (!dependente) {
            return res.status(404).json({ error: 'Dependente não encontrado' });
        }

        // Buscar graduações do dependente
        const graduacoes = await query(`
            SELECT
                g.*,
                gs.nome as graduacao_nome,
                gs.cor as graduacao_cor,
                gs.ordem as graduacao_ordem
            FROM graduacoes g
            INNER JOIN graduacoes_sistema gs ON g.graduacao_nova_id = gs.id
            WHERE g.aluno_id = ?
            ORDER BY g.data_graduacao DESC
        `, [dependenteId]);

        const profileData = {
            id: dependente.id,
            matricula: dependente.matricula,
            usuario_id: dependente.usuario_id,
            email: dependente.email,
            usuario_foto_url: dependente.usuario_foto_url,
            nome_completo: dependente.usuario_nome,
            data_nascimento: dependente.usuario_data_nascimento,
            telefone: dependente.telefone || dependente.usuario_telefone || '',
            telefone_emergencia: dependente.telefone_emergencia || dependente.contato_emergencia || '',
            endereco: dependente.rua ? `${dependente.rua}${dependente.numero ? ', ' + dependente.numero : ''}${dependente.complemento ? ' - ' + dependente.complemento : ''}` : dependente.usuario_endereco || '',
            rua: dependente.rua || '',
            numero: dependente.numero || '',
            complemento: dependente.complemento || '',
            bairro: dependente.bairro || '',
            cidade: dependente.cidade || '',
            estado: dependente.estado || '',
            cep: dependente.cep || '',
            responsavel_nome: dependente.responsavel_nome || dependente.nome_contato_emergencia || '',
            responsavel_telefone: dependente.responsavel_telefone || '',
            email_responsavel: dependente.email_responsavel || '',
            programa: dependente.programa,
            graduacao: dependente.graduacao,
            graduacao_atual_id: dependente.graduacao_atual_id,
            graduacao_atual_nome: dependente.graduacao_atual_nome,
            graduacao_atual_cor: dependente.graduacao_atual_cor,
            graduacao_atual_ordem: dependente.graduacao_atual_ordem,
            graus_faixa: dependente.graus_faixa,
            data_inicio: dependente.data_inicio,
            data_fim: dependente.data_fim,
            status: dependente.status,
            plano_id: dependente.plano_id,
            plano_nome: dependente.plano_nome,
            plano_valor: dependente.plano_valor,
            objetivo: dependente.objetivo || '',
            observacoes_medicas: dependente.observacoes_medicas,
            tipo_sanguineo: dependente.tipo_sanguineo,
            toma_medicamento: dependente.toma_medicamento,
            medicamentos_detalhes: dependente.medicamentos_detalhes,
            historico_fraturas: dependente.historico_fraturas,
            fraturas_detalhes: dependente.fraturas_detalhes,
            tem_alergias: dependente.tem_alergias,
            alergias_detalhes: dependente.alergias_detalhes,
            graduacoes
        };

        res.json(profileData);

    } catch (error) {
        logger.error('Erro ao buscar dependente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-profile/schedule
 * Consultar horários de aulas disponíveis
 */
router.get('/schedule', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar turmas do aluno
        const alunoTurmas = await query(`
            SELECT DISTINCT t.id, t.nome, t.dia_semana, t.horario_inicio, t.horario_fim,
                   t.programa,
                   p.nome as professor_nome
            FROM alunos a
            INNER JOIN alunos_turmas at ON a.id = at.aluno_id
            INNER JOIN turmas t ON at.turma_id = t.id
            LEFT JOIN professores prof ON t.professor_id = prof.id
            LEFT JOIN usuarios p ON prof.usuario_id = p.id
            WHERE a.usuario_id = ? AND t.status = 'ativo'
            ORDER BY
                FIELD(t.dia_semana, 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'),
                t.horario_inicio
        `, [userId]);

        // Buscar todas as turmas disponíveis para o programa do aluno
        const alunos = await query('SELECT id, programa FROM alunos WHERE usuario_id = ?', [userId]);

        let todasTurmas = [];
        if (alunos.length > 0) {
            todasTurmas = await query(`
                SELECT t.id, t.nome, t.dia_semana, t.horario_inicio, t.horario_fim,
                       t.programa,
                       p.nome as professor_nome,
                       (SELECT COUNT(*) FROM alunos_turmas WHERE turma_id = t.id) as total_alunos
                FROM turmas t
                LEFT JOIN professores prof ON t.professor_id = prof.id
                LEFT JOIN usuarios p ON prof.usuario_id = p.id
                WHERE t.status = 'ativo' AND t.programa = ?
                ORDER BY
                    FIELD(t.dia_semana, 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'),
                    t.horario_inicio
            `, [alunos[0].programa]);
        }

        res.json({
            minhas_turmas: alunoTurmas,
            todas_turmas: todasTurmas
        });

    } catch (error) {
        logger.error('Erro ao buscar horários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-profile/graduation-eligibility
 * Obter elegibilidade para próxima graduação
 */
router.get('/graduation-eligibility', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar dados do aluno
        const [aluno] = await query(`
            SELECT
                a.id,
                a.graduacao_atual_id,
                gs.nome as graduacao_atual_nome,
                gs.cor as graduacao_atual_cor,
                gs.ordem as graduacao_atual_ordem,
                gs.tempo_minimo_meses,
                gs.aulas_minimas,
                gs.frequencia_minima
            FROM alunos a
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.usuario_id = ?
        `, [userId]);

        if (!aluno) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        // Buscar data da última graduação
        const [ultimaGraduacao] = await query(`
            SELECT data_graduacao, graduacao_nova_id
            FROM graduacoes
            WHERE aluno_id = ? AND graduacao_nova_id = ?
            ORDER BY data_graduacao DESC
            LIMIT 1
        `, [aluno.id, aluno.graduacao_atual_id]);

        let mesesNaFaixa = 0;
        let diasNaFaixa = 0;
        let dataInicio = null;

        if (ultimaGraduacao) {
            dataInicio = new Date(ultimaGraduacao.data_graduacao);
            const hoje = new Date();
            const diffMs = hoje - dataInicio;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            diasNaFaixa = diffDays;
            mesesNaFaixa = Math.floor(diffDays / 30);
        }

        // Contar aulas presentes desde a última graduação
        const [frequenciaData] = await query(`
            SELECT
                COUNT(CASE WHEN f.presente = true THEN 1 END) as aulas_presentes,
                COUNT(*) as total_aulas,
                ROUND(
                    COUNT(CASE WHEN f.presente = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
                    1
                ) as percentual_frequencia
            FROM frequencias f
            WHERE f.aluno_id = ?
                ${ultimaGraduacao ? 'AND f.data_aula >= ?' : ''}
        `, ultimaGraduacao ? [aluno.id, ultimaGraduacao.data_graduacao] : [aluno.id]);

        const aulasPresentes = frequenciaData.aulas_presentes || 0;
        const percentualFrequencia = parseFloat(frequenciaData.percentual_frequencia) || 0;

        // Buscar próxima graduação
        const [proximaGraduacao] = await query(`
            SELECT
                id,
                nome,
                cor,
                ordem,
                tempo_minimo_meses,
                aulas_minimas,
                frequencia_minima
            FROM graduacoes_sistema
            WHERE ordem = ?
            LIMIT 1
        `, [aluno.graduacao_atual_ordem + 1]);

        // Calcular progresso
        const tempoMinimo = proximaGraduacao?.tempo_minimo_meses || aluno.tempo_minimo_meses || 12;
        const aulasMinimas = proximaGraduacao?.aulas_minimas || aluno.aulas_minimas || 96;
        const frequenciaMinima = proximaGraduacao?.frequencia_minima || aluno.frequencia_minima || 75;

        const progressoTempo = {
            current: mesesNaFaixa,
            required: tempoMinimo,
            percentage: Math.min(Math.round((mesesNaFaixa / tempoMinimo) * 100), 100)
        };

        const progressoAulas = {
            current: aulasPresentes,
            required: aulasMinimas,
            percentage: Math.min(Math.round((aulasPresentes / aulasMinimas) * 100), 100)
        };

        const progressoFrequencia = {
            current: percentualFrequencia,
            required: frequenciaMinima,
            percentage: Math.min(Math.round((percentualFrequencia / frequenciaMinima) * 100), 100)
        };

        // Verificar se é elegível
        const isEligible = (
            progressoTempo.percentage >= 100 &&
            progressoAulas.percentage >= 100 &&
            progressoFrequencia.percentage >= 100
        );

        // Calcular data estimada de elegibilidade
        let estimatedEligibilityDate = null;
        if (!isEligible && ultimaGraduacao) {
            const mesesRestantes = Math.max(0, tempoMinimo - mesesNaFaixa);
            const estimatedDate = new Date(dataInicio);
            estimatedDate.setMonth(estimatedDate.getMonth() + tempoMinimo);
            estimatedEligibilityDate = estimatedDate.toISOString().split('T')[0];
        }

        res.json({
            currentBelt: {
                id: aluno.graduacao_atual_id,
                name: aluno.graduacao_atual_nome,
                color: aluno.graduacao_atual_cor,
                achievedDate: dataInicio ? dataInicio.toISOString().split('T')[0] : null,
                timeInBelt: {
                    months: mesesNaFaixa,
                    days: diasNaFaixa
                }
            },
            nextBelt: proximaGraduacao ? {
                id: proximaGraduacao.id,
                name: proximaGraduacao.nome,
                color: proximaGraduacao.cor,
                requirements: {
                    minimumMonths: tempoMinimo,
                    minimumClasses: aulasMinimas,
                    minimumAttendance: frequenciaMinima
                }
            } : null,
            progress: {
                time: progressoTempo,
                classes: progressoAulas,
                attendance: progressoFrequencia
            },
            eligible: isEligible,
            estimatedEligibilityDate
        });

    } catch (error) {
        logger.error('Erro ao buscar elegibilidade de graduação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-profile/graduation-timeline
 * Obter timeline completa de graduações (passadas, atual, futuras)
 */
router.get('/graduation-timeline', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar dados do aluno
        const [aluno] = await query(`
            SELECT
                a.id,
                a.graduacao_atual_id
            FROM alunos a
            WHERE a.usuario_id = ?
        `, [userId]);

        if (!aluno) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        // Buscar graduação atual
        const [graduacaoAtual] = await query(`
            SELECT ordem
            FROM graduacoes_sistema
            WHERE id = ?
        `, [aluno.graduacao_atual_id]);

        const ordemAtual = graduacaoAtual?.ordem || 0;

        // Buscar todas as graduações do sistema com status
        const todasGraduacoes = await query(`
            SELECT
                gs.id,
                gs.nome,
                gs.cor,
                gs.ordem,
                gs.tempo_minimo_meses,
                g.data_graduacao,
                CASE
                    WHEN gs.id = ? THEN 'current'
                    WHEN gs.ordem < ? THEN 'completed'
                    WHEN gs.ordem = ? THEN 'next'
                    ELSE 'future'
                END as status
            FROM graduacoes_sistema gs
            LEFT JOIN graduacoes g ON g.graduacao_nova_id = gs.id AND g.aluno_id = ?
            ORDER BY gs.ordem ASC
        `, [aluno.graduacao_atual_id, ordemAtual, ordemAtual + 1, aluno.id]);

        // Calcular tempo na faixa atual e progresso para próxima
        let timeInBelt = null;
        let progressPercentage = null;

        const currentBelt = todasGraduacoes.find(g => g.status === 'current');
        if (currentBelt && currentBelt.data_graduacao) {
            const dataInicio = new Date(currentBelt.data_graduacao);
            const hoje = new Date();
            const diffMs = hoje - dataInicio;
            const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
            timeInBelt = diffMonths;

            // Calcular progresso para próxima faixa
            const nextBelt = todasGraduacoes.find(g => g.status === 'next');
            if (nextBelt && nextBelt.tempo_minimo_meses) {
                progressPercentage = Math.min(
                    Math.round((diffMonths / nextBelt.tempo_minimo_meses) * 100),
                    100
                );
            }
        }

        // Formatar resposta
        const allBelts = todasGraduacoes.map(g => ({
            id: g.id,
            name: g.nome,
            color: g.cor,
            order: g.ordem,
            status: g.status,
            achievedDate: g.data_graduacao ? new Date(g.data_graduacao).toISOString().split('T')[0] : null,
            timeInBelt: g.status === 'current' ? timeInBelt : undefined,
            progressPercentage: g.status === 'next' ? progressPercentage : undefined,
            requirements: g.status === 'next' || g.status === 'current' ? {
                minimumMonths: g.tempo_minimo_meses
            } : undefined
        }));

        res.json({
            allBelts
        });

    } catch (error) {
        logger.error('Erro ao buscar timeline de graduações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-profile/graduation-projection
 * Calcular projeção de elegibilidade baseada no ritmo atual de treino
 */
router.get('/graduation-projection', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar dados do aluno
        const [aluno] = await query(`
            SELECT
                a.id,
                a.graduacao_atual_id,
                gs.tempo_minimo_meses,
                gs.aulas_minimas,
                gs.frequencia_minima
            FROM alunos a
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.usuario_id = ?
        `, [userId]);

        if (!aluno) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        // Buscar data da última graduação
        const [ultimaGraduacao] = await query(`
            SELECT data_graduacao
            FROM graduacoes
            WHERE aluno_id = ? AND graduacao_nova_id = ?
            ORDER BY data_graduacao DESC
            LIMIT 1
        `, [aluno.id, aluno.graduacao_atual_id]);

        if (!ultimaGraduacao) {
            return res.json({
                projectedDate: null,
                confidence: 'low',
                message: 'Dados insuficientes para projeção'
            });
        }

        const dataInicio = new Date(ultimaGraduacao.data_graduacao);
        const hoje = new Date();

        // Calcular ritmo de treino dos últimos 3 meses
        const tresMesesAtras = new Date();
        tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

        const [dadosTreino] = await query(`
            SELECT
                COUNT(CASE WHEN f.presente = true THEN 1 END) as aulas_presentes_3m,
                COUNT(*) as total_aulas_3m,
                DATEDIFF(CURDATE(), ?) as dias_desde_graduacao
            FROM frequencias f
            WHERE f.aluno_id = ?
                AND f.data_aula >= ?
        `, [ultimaGraduacao.data_graduacao, aluno.id, tresMesesAtras]);

        const aulasPresentes3Meses = dadosTreino.aulas_presentes_3m || 0;
        const diasDesdeGraduacao = dadosTreino.dias_desde_graduacao || 0;
        const mesesDesdeGraduacao = Math.floor(diasDesdeGraduacao / 30);

        // Calcular média de aulas por semana
        const semanasEm3Meses = 12;
        const mediaAulasPorSemana = aulasPresentes3Meses / semanasEm3Meses;

        // Buscar próxima graduação
        const [proximaGrad] = await query(`
            SELECT gs.tempo_minimo_meses, gs.aulas_minimas, gs.frequencia_minima
            FROM graduacoes_sistema gs
            WHERE gs.ordem = (
                SELECT ordem + 1 FROM graduacoes_sistema WHERE id = ?
            )
        `, [aluno.graduacao_atual_id]);

        const tempoMinimo = proximaGrad?.tempo_minimo_meses || aluno.tempo_minimo_meses || 12;
        const aulasMinimas = proximaGrad?.aulas_minimas || aluno.aulas_minimas || 96;

        // Calcular frequência atual
        const [freqAtual] = await query(`
            SELECT
                ROUND(
                    COUNT(CASE WHEN f.presente = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
                    1
                ) as percentual_frequencia
            FROM frequencias f
            WHERE f.aluno_id = ?
                AND f.data_aula >= ?
        `, [aluno.id, ultimaGraduacao.data_graduacao]);

        const currentAttendanceRate = parseFloat(freqAtual.percentual_frequencia) || 0;

        // Projeção baseada no tempo mínimo
        const dataProjetada = new Date(dataInicio);
        dataProjetada.setMonth(dataProjetada.getMonth() + tempoMinimo);

        // Calcular nível de confiança
        let confidence = 'low';
        if (mediaAulasPorSemana >= 3 && currentAttendanceRate >= 75) {
            confidence = 'high';
        } else if (mediaAulasPorSemana >= 2 && currentAttendanceRate >= 65) {
            confidence = 'medium';
        }

        // Gerar sugestões
        const suggestions = [];

        if (mediaAulasPorSemana < 3) {
            const aulasAdicionais = Math.ceil(3 - mediaAulasPorSemana);
            suggestions.push(`Treine ${aulasAdicionais} aula(s) a mais por semana para acelerar seu progresso`);
        }

        if (currentAttendanceRate < 80) {
            suggestions.push('Mantenha frequência acima de 80% para garantir elegibilidade');
        }

        if (mesesDesdeGraduacao >= tempoMinimo * 0.8) {
            suggestions.push('Você está próximo do tempo mínimo! Continue treinando consistentemente');
        }

        res.json({
            projectedDate: dataProjetada.toISOString().split('T')[0],
            confidence,
            assumptions: {
                averageClassesPerWeek: parseFloat(mediaAulasPorSemana.toFixed(1)),
                currentAttendanceRate,
                monthsSinceLastGraduation: mesesDesdeGraduacao,
                minimumMonthsRequired: tempoMinimo
            },
            suggestions: suggestions.length > 0 ? suggestions : [
                'Continue treinando no ritmo atual para alcançar a próxima graduação'
            ]
        });

    } catch (error) {
        logger.error('Erro ao calcular projeção de graduação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
