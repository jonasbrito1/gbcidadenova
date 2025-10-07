const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticateToken, authorize } = require('../middleware/auth');

// ========== ROTA PÚBLICA - Envio de formulário ==========

// Criar novo formulário (público - sem autenticação)
router.post('/publico', async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            nome,
            data_nascimento,
            telefone,
            email,
            endereco,
            cidade,
            estado,
            cep,
            responsavel_nome,
            responsavel_telefone,
            contato_emergencia_nome,
            contato_emergencia_telefone,
            contato_emergencia_parentesco,
            tipo_sanguineo,
            condicoes_medicas,
            medicamentos_uso,
            alergias,
            plano_saude,
            ja_treinou_jiu_jitsu,
            graduacao_atual,
            tempo_treino,
            plano_id,
            forma_pagamento_escolhida,
            responsavel
        } = req.body;

        // Verificar idade
        const idade = calcularIdade(data_nascimento);
        const precisaResponsavel = idade < 16;

        let responsavel_id = null;

        // Se precisa responsável e foi fornecido
        if (precisaResponsavel && responsavel) {
            const [resultResponsavel] = await connection.query(`
                INSERT INTO responsaveis (nome, telefone, email, parentesco)
                VALUES (?, ?, ?, ?)
            `, [
                responsavel.nome,
                responsavel.telefone,
                responsavel.email,
                responsavel.parentesco
            ]);

            responsavel_id = resultResponsavel.insertId;
        }

        // Inserir formulário
        const [result] = await connection.query(`
            INSERT INTO formularios_cadastro (
                nome, data_nascimento, telefone, email,
                endereco, cidade, estado, cep,
                responsavel_nome, responsavel_telefone,
                contato_emergencia_nome, contato_emergencia_telefone, contato_emergencia_parentesco,
                tipo_sanguineo, condicoes_medicas, medicamentos_uso, alergias, plano_saude,
                ja_treinou_jiu_jitsu, graduacao_atual, tempo_treino,
                responsavel_id, possui_responsavel,
                plano_id, forma_pagamento_escolhida
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nome, data_nascimento, telefone, email,
            endereco, cidade, estado, cep,
            responsavel_nome, responsavel_telefone,
            contato_emergencia_nome, contato_emergencia_telefone, contato_emergencia_parentesco,
            tipo_sanguineo, condicoes_medicas, medicamentos_uso, alergias, plano_saude,
            ja_treinou_jiu_jitsu || 'nao', graduacao_atual, tempo_treino,
            responsavel_id, precisaResponsavel,
            plano_id, forma_pagamento_escolhida || 'parcelado'
        ]);

        await connection.commit();

        res.status(201).json({
            message: 'Formulário enviado com sucesso! Aguarde a análise da equipe.',
            formulario_id: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar formulário:', error);
        res.status(500).json({ error: 'Erro ao enviar formulário' });
    } finally {
        connection.release();
    }
});

// ========== ROTAS PROTEGIDAS - Gestão de formulários ==========

router.use(authenticateToken);

// Listar formulários
router.get('/', authorize('admin', 'professor'), async (req, res) => {
    try {
        const { status, data_inicio, data_fim } = req.query;

        let query = `
            SELECT
                f.*,
                r.nome AS responsavel_legal_nome,
                r.telefone AS responsavel_legal_telefone,
                r.email AS responsavel_legal_email,
                u.nome AS analisado_por_nome
            FROM formularios_cadastro f
            LEFT JOIN responsaveis r ON f.responsavel_id = r.id
            LEFT JOIN usuarios u ON f.analisado_por = u.id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND f.status = ?';
            params.push(status);
        }

        if (data_inicio) {
            query += ' AND f.created_at >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND f.created_at <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY f.created_at DESC';

        const [formularios] = await db.query(query, params);

        res.json(formularios);
    } catch (error) {
        console.error('Erro ao buscar formulários:', error);
        res.status(500).json({ error: 'Erro ao buscar formulários' });
    }
});

// Buscar formulário por ID
router.get('/:id', authorize('admin', 'professor'), async (req, res) => {
    try {
        const [formularios] = await db.query(`
            SELECT
                f.*,
                r.nome AS responsavel_legal_nome,
                r.telefone AS responsavel_legal_telefone,
                r.email AS responsavel_legal_email,
                r.parentesco AS responsavel_legal_parentesco,
                u.nome AS analisado_por_nome
            FROM formularios_cadastro f
            LEFT JOIN responsaveis r ON f.responsavel_id = r.id
            LEFT JOIN usuarios u ON f.analisado_por = u.id
            WHERE f.id = ?
        `, [req.params.id]);

        if (formularios.length === 0) {
            return res.status(404).json({ error: 'Formulário não encontrado' });
        }

        res.json(formularios[0]);
    } catch (error) {
        console.error('Erro ao buscar formulário:', error);
        res.status(500).json({ error: 'Erro ao buscar formulário' });
    }
});

// Aprovar formulário e criar usuário/aluno
router.post('/:id/aprovar', authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { observacoes } = req.body;
        const formulario_id = req.params.id;

        // Buscar formulário
        const [formularios] = await connection.query(
            'SELECT * FROM formularios_cadastro WHERE id = ?',
            [formulario_id]
        );

        if (formularios.length === 0) {
            throw new Error('Formulário não encontrado');
        }

        const form = formularios[0];

        if (form.status !== 'pendente') {
            throw new Error('Formulário já foi analisado');
        }

        // Verificar se plano foi escolhido no formulário
        if (!form.plano_id) {
            throw new Error('Formulário não possui plano associado');
        }

        // Gerar senha aleatória
        const senhaTemporaria = gerarSenhaAleatoria();
        const hashedPassword = await bcrypt.hash(senhaTemporaria, 12);

        // Criar usuário
        const [resultUsuario] = await connection.query(`
            INSERT INTO usuarios (nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario)
            VALUES (?, ?, ?, ?, ?, ?, 'aluno')
        `, [form.nome, form.email, hashedPassword, form.telefone, form.data_nascimento, form.endereco]);

        const usuario_id = resultUsuario.insertId;

        // Criar aluno
        const [resultAluno] = await connection.query(`
            INSERT INTO alunos (
                usuario_id, nome, email, telefone, data_nascimento,
                endereco, plano_id, responsavel_id, tipo_sanguineo,
                condicoes_medicas, contato_emergencia, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
        `, [
            usuario_id,
            form.nome,
            form.email,
            form.telefone,
            form.data_nascimento,
            form.endereco,
            form.plano_id,
            form.responsavel_id,
            form.tipo_sanguineo,
            form.condicoes_medicas,
            JSON.stringify({
                nome: form.contato_emergencia_nome,
                telefone: form.contato_emergencia_telefone,
                parentesco: form.contato_emergencia_parentesco
            })
        ]);

        const aluno_id = resultAluno.insertId;

        // Criar contratação do plano e gerar mensalidades via stored procedure
        const [spResult] = await connection.query(`
            CALL sp_criar_contratacao_e_mensalidades(?, ?, ?, ?, ?, @contratacao_id)
        `, [
            aluno_id,
            form.plano_id,
            form.forma_pagamento_escolhida || 'parcelado',
            formulario_id,
            req.user.id
        ]);

        // Buscar o ID da contratação criada
        const [[{ contratacao_id }]] = await connection.query('SELECT @contratacao_id as contratacao_id');

        // Atualizar formulário
        await connection.query(`
            UPDATE formularios_cadastro
            SET status = 'aprovado',
                usuario_id = ?,
                aluno_id = ?,
                analisado_por = ?,
                data_analise = NOW(),
                observacoes_admin = ?
            WHERE id = ?
        `, [usuario_id, aluno_id, req.user.id, observacoes, formulario_id]);

        await connection.commit();

        // TODO: Enviar email com credenciais
        // Se tiver responsável, enviar também para o responsável

        res.json({
            message: 'Formulário aprovado, usuário criado e plano contratado com sucesso!',
            usuario_id,
            aluno_id,
            contratacao_id,
            senha_temporaria: senhaTemporaria
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao aprovar formulário:', error);
        res.status(500).json({ error: error.message || 'Erro ao aprovar formulário' });
    } finally {
        connection.release();
    }
});

// Rejeitar formulário
router.post('/:id/rejeitar', authorize('admin', 'professor'), async (req, res) => {
    try {
        const { observacoes } = req.body;

        const [formularios] = await db.query(
            'SELECT status FROM formularios_cadastro WHERE id = ?',
            [req.params.id]
        );

        if (formularios.length === 0) {
            return res.status(404).json({ error: 'Formulário não encontrado' });
        }

        if (formularios[0].status !== 'pendente') {
            return res.status(400).json({ error: 'Formulário já foi analisado' });
        }

        await db.query(`
            UPDATE formularios_cadastro
            SET status = 'rejeitado',
                analisado_por = ?,
                data_analise = NOW(),
                observacoes_admin = ?
            WHERE id = ?
        `, [req.user.id, observacoes, req.params.id]);

        res.json({ message: 'Formulário rejeitado' });
    } catch (error) {
        console.error('Erro ao rejeitar formulário:', error);
        res.status(500).json({ error: 'Erro ao rejeitar formulário' });
    }
});

// Funções auxiliares
function calcularIdade(dataNascimento) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }

    return idade;
}

function gerarSenhaAleatoria() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
}

module.exports = router;
