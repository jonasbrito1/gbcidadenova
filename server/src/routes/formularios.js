const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticateToken, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');

// ========== FUNÇÕES AUXILIARES ==========

// Função para calcular idade
function calcularIdade(dataNascimento) {
    if (!dataNascimento) return null;

    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }

    return idade;
}

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
            tipo_sanguineo,
            condicoes_medicas,
            medicamentos_uso,
            alergias,
            ja_treinou_jiu_jitsu,
            graduacao_atual,
            tempo_treino,
            plano_id,
            forma_pagamento_escolhida,
            responsavel,
            // Novos campos do PublicRegistration
            email_responsavel,
            rua,
            numero,
            complemento,
            bairro,
            programa,
            graduacao,
            graus_faixa,
            data_inicio,
            nome_contato_emergencia,
            contato_emergencia,
            contato_emergencia_parentesco,
            toma_medicamento,
            medicamentos_detalhes,
            historico_fraturas,
            fraturas_detalhes,
            tem_alergias,
            alergias_detalhes,
            observacoes_medicas,
            lgpd_aceite_publico
        } = req.body;

        console.log('[FORMULARIO] Recebido formulário público:', {
            nome,
            email,
            telefone,
            plano_id,
            responsavel
        });

        // Validar campos obrigatórios básicos
        if (!nome || !email || !data_nascimento) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando: nome, email e data de nascimento são obrigatórios'
            });
        }

        // Verificar idade
        const idade = calcularIdade(data_nascimento);
        const precisaResponsavel = idade < 16;

        let responsavel_id = null;
        let email_responsavel_final = email_responsavel || null;

        // Se precisa responsável e foi fornecido
        if (precisaResponsavel && responsavel && responsavel.nome) {
            const [resultResponsavel] = await connection.query(`
                INSERT INTO responsaveis (nome, telefone, email, parentesco)
                VALUES (?, ?, ?, ?)
            `, [
                responsavel.nome,
                responsavel.telefone || null,
                responsavel.email || null,
                responsavel.parentesco || 'Responsável'
            ]);

            responsavel_id = resultResponsavel.insertId;
            email_responsavel_final = responsavel.email || email_responsavel;
        }

        // Construir endereço completo se os campos separados foram fornecidos
        const enderecoCompleto = rua
            ? `${rua}${numero ? ', ' + numero : ''}${complemento ? ' - ' + complemento : ''}`
            : endereco || '';

        // Preparar valores para inserção
        const contatoEmergenciaNome = nome_contato_emergencia || contato_emergencia_nome || 'Não informado';
        const contatoEmergenciaTel = contato_emergencia || contato_emergencia_telefone || 'Não informado';
        const contatoEmergenciaParentesco = contato_emergencia_parentesco || 'Não informado';

        const insertData = {
            nome: nome,
            data_nascimento: data_nascimento,
            telefone: telefone || '',
            email: email,
            endereco: enderecoCompleto || 'Não informado',
            cidade: cidade || 'Não informado',
            estado: estado || 'AM',
            cep: cep || '',
            rua: rua || '',
            numero: numero || '',
            complemento: complemento || '',
            bairro: bairro || '',
            // Campos de contato de emergência
            contato_emergencia_nome: contatoEmergenciaNome,
            contato_emergencia_telefone: contatoEmergenciaTel,
            contato_emergencia_parentesco: contatoEmergenciaParentesco,
            tipo_sanguineo: tipo_sanguineo || 'O+',
            // Programa e graduação
            programa: programa || 'Adultos',
            graduacao: graduacao || 'Branca',
            graus_faixa: graus_faixa || 0,
            // Informações médicas
            condicoes_medicas: condicoes_medicas || null,
            medicamentos_uso: medicamentos_uso || null,
            alergias: alergias || null,
            toma_medicamento: toma_medicamento ? 1 : 0,
            medicamentos_detalhes: medicamentos_detalhes || null,
            historico_fraturas: historico_fraturas ? 1 : 0,
            fraturas_detalhes: fraturas_detalhes || null,
            tem_alergias: tem_alergias ? 1 : 0,
            alergias_detalhes: alergias_detalhes || null,
            observacoes_medicas: observacoes_medicas || null,
            plano_saude: null,
            // Responsável
            responsavel_id: responsavel_id,
            email_responsavel: email_responsavel_final,
            possui_responsavel: precisaResponsavel ? 1 : 0,
            // Dados administrativos
            data_inicio: data_inicio || new Date().toISOString().split('T')[0],
            status: 'pendente',
            // LGPD
            lgpd_aceite_publico: lgpd_aceite_publico ? 1 : 0,
            lgpd_aceite_publico_data: lgpd_aceite_publico ? new Date() : null,
            lgpd_aceite_publico_ip: req.ip || req.connection.remoteAddress || '0.0.0.0',
            ip_origem: req.ip || req.connection.remoteAddress || '0.0.0.0'
        };

        // Inserir formulário
        const [result] = await connection.query(
            'INSERT INTO formularios_cadastro SET ?',
            [insertData]
        );

        await connection.commit();

        console.log('[FORMULARIO] Formulário inserido com sucesso. ID:', result.insertId);

        res.status(201).json({
            message: 'Formulário enviado com sucesso! Aguarde a análise da equipe.',
            formulario_id: result.insertId
        });
    } catch (error) {
        await connection.rollback();

        // Logs detalhados para diagnóstico
        console.error('[FORMULARIO] ====== ERRO DETALHADO ======');
        console.error('[FORMULARIO] Mensagem:', error.message);
        console.error('[FORMULARIO] Código:', error.code);
        console.error('[FORMULARIO] SQL State:', error.sqlState);
        console.error('[FORMULARIO] SQL:', error.sql);
        console.error('[FORMULARIO] Stack:', error.stack);
        console.error('[FORMULARIO] Dados recebidos:', {
            nome: req.body.nome,
            email: req.body.email,
            data_nascimento: req.body.data_nascimento,
            programa: req.body.programa,
            tem_responsavel: req.body.responsavel ? 'Sim' : 'Não'
        });
        console.error('[FORMULARIO] ============================');

        res.status(500).json({
            error: 'Erro ao enviar formulário. Por favor, tente novamente.',
            // Em desenvolvimento, incluir detalhes do erro
            ...(process.env.NODE_ENV === 'development' && {
                details: error.message,
                code: error.code
            })
        });
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

        const formularios = await db.query(query, params);

        console.log('[FORMULARIOS] Query executada:', query);
        console.log('[FORMULARIOS] Params:', params);
        console.log('[FORMULARIOS] Formulários encontrados:', formularios.length);
        console.log('[FORMULARIOS] Dados:', JSON.stringify(formularios).substring(0, 200));

        // Desabilitar cache para sempre retornar dados atualizados
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });

        res.json(formularios);
    } catch (error) {
        console.error('Erro ao buscar formulários:', error);
        res.status(500).json({ error: 'Erro ao buscar formulários' });
    }
});

// Buscar formulário por ID
router.get('/:id', authorize('admin', 'professor'), async (req, res) => {
    try {
        console.log('[FORMULARIO] Buscando formulário ID:', req.params.id);

        const result = await db.query(`
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

        console.log('[FORMULARIO] Resultado completo:', result);
        console.log('[FORMULARIO] Tipo de result:', typeof result);
        console.log('[FORMULARIO] É array?:', Array.isArray(result));

        const formularios = Array.isArray(result) ? result : result[0];
        console.log('[FORMULARIO] Formularios:', formularios);
        console.log('[FORMULARIO] Length:', formularios ? formularios.length : 'undefined');

        if (!formularios || formularios.length === 0) {
            console.log('[FORMULARIO] Nenhum formulário encontrado');
            return res.status(404).json({ error: 'Formulário não encontrado' });
        }

        const formulario = formularios[0];
        console.log('[FORMULARIO] Retornando:', JSON.stringify(formulario).substring(0, 200));
        res.json(formulario);
    } catch (error) {
        console.error('[FORMULARIO] ====== ERRO ======');
        console.error('[FORMULARIO] Mensagem:', error.message);
        console.error('[FORMULARIO] Stack:', error.stack);
        console.error('[FORMULARIO] ====================');
        res.status(500).json({ error: 'Erro ao buscar formulário' });
    }
});

// Aprovar formulário e criar usuário/aluno
router.post('/:id/aprovar', authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            observacoes,
            bolsista,
            valor_base,
            valor_desconto = 0,
            valor_acrescimo = 0,
            quantidade_meses = 12,
            dia_vencimento,
            forma_pagamento
        } = req.body;
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

        // Validar dados obrigatórios
        if (!bolsista) {
            if (!valor_base || parseFloat(valor_base) <= 0) {
                throw new Error('Valor base da mensalidade é obrigatório');
            }

            const valorTotal = parseFloat(valor_base) - parseFloat(valor_desconto) + parseFloat(valor_acrescimo);
            if (valorTotal <= 0) {
                throw new Error('Valor total deve ser maior que zero');
            }

            if (parseFloat(valor_desconto) > parseFloat(valor_base)) {
                throw new Error('Desconto não pode ser maior que o valor base');
            }

            if (!quantidade_meses || parseInt(quantidade_meses) < 1) {
                throw new Error('Quantidade de meses deve ser pelo menos 1');
            }
        }

        if (!dia_vencimento || dia_vencimento < 1 || dia_vencimento > 28) {
            throw new Error('Dia de vencimento deve estar entre 1 e 28');
        }

        // Buscar plano padrão (ID 1) ou criar se não existir
        const [planos] = await connection.query('SELECT id FROM planos WHERE status = "ativo" ORDER BY id LIMIT 1');
        const plano_id = planos.length > 0 ? planos[0].id : 1;

        // Gerar senha aleatória
        const senhaTemporaria = gerarSenhaAleatoria();
        const hashedPassword = await bcrypt.hash(senhaTemporaria, 12);

        // Criar usuário
        const [resultUsuario] = await connection.query(`
            INSERT INTO usuarios (nome, email, senha, telefone, data_nascimento, endereco, tipo_usuario)
            VALUES (?, ?, ?, ?, ?, ?, 'aluno')
        `, [form.nome, form.email, hashedPassword, form.telefone, form.data_nascimento, form.endereco]);

        const usuario_id = resultUsuario.insertId;

        // Gerar matrícula
        const ano = new Date().getFullYear();
        const [ultimoAluno] = await connection.query('SELECT matricula FROM alunos ORDER BY id DESC LIMIT 1');
        let sequencial = 1;
        if (ultimoAluno.length > 0 && ultimoAluno[0].matricula) {
            const ultimaMatricula = ultimoAluno[0].matricula;
            const ultimoSequencial = parseInt(ultimaMatricula.substring(4));
            sequencial = ultimoSequencial + 1;
        }
        const matricula = `${ano}${String(sequencial).padStart(4, '0')}`;

        // Calcular valor efetivo da mensalidade
        const valorEfetivo = bolsista ? 0 : (parseFloat(valor_base) - parseFloat(valor_desconto) + parseFloat(valor_acrescimo));
        const quantidadeMesesInt = bolsista ? 0 : parseInt(quantidade_meses);

        // Criar aluno
        const [resultAluno] = await connection.query(`
            INSERT INTO alunos (
                usuario_id, matricula, graduacao, programa, data_inicio,
                plano_id, professor_responsavel, graus_faixa,
                contato_emergencia, observacoes_medicas, dia_vencimento,
                bolsista, valor_mensalidade_customizado, status
            )
            VALUES (?, ?, ?, ?, CURDATE(), ?, NULL, ?, ?, ?, ?, ?, ?, 'ativo')
        `, [
            usuario_id,
            matricula,
            form.graduacao || 'Branca',
            form.programa || 'Adultos',
            plano_id,
            form.graus_faixa || 0,
            JSON.stringify({
                nome: form.contato_emergencia_nome || form.nome_contato_emergencia,
                telefone: form.contato_emergencia_telefone || form.contato_emergencia,
                parentesco: form.contato_emergencia_parentesco || 'Contato de Emergência'
            }),
            form.observacoes_medicas || null,
            dia_vencimento,
            bolsista ? 1 : 0,
            valorEfetivo > 0 ? valorEfetivo : null
        ]);

        const aluno_id = resultAluno.insertId;

        // Criar contratação do plano
        const [resultContratacao] = await connection.query(`
            INSERT INTO contratacoes_planos (
                aluno_id, plano_id, data_inicio, status, forma_pagamento, valor_contratado
            ) VALUES (?, ?, CURDATE(), 'ativa', ?, ?)
        `, [aluno_id, plano_id, forma_pagamento || 'dinheiro', valorEfetivo]);

        const contratacao_id = resultContratacao.insertId;

        // Criar mensalidades com recorrência
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        let mensalidadesCriadas = 0;

        // Não criar mensalidades para alunos bolsistas
        if (!bolsista && valorEfetivo > 0 && quantidadeMesesInt > 0) {
            const valorBaseNum = parseFloat(valor_base);
            const valorDescontoNum = parseFloat(valor_desconto) || 0;
            const valorAcrescimoNum = parseFloat(valor_acrescimo) || 0;

            // Criar mensalidades (primeira PAGA, demais PENDENTES)
            for (let i = 0; i < quantidadeMesesInt; i++) {
                const mes = (mesAtual + i - 1) % 12 + 1;
                const ano = anoAtual + Math.floor((mesAtual + i - 1) / 12);
                const dataVenc = new Date(ano, mes - 1, parseInt(dia_vencimento));

                // Primeira mensalidade é PAGA (entrada), demais são PENDENTES
                const statusMensalidade = i === 0 ? 'pago' : 'pendente';
                const dataPagamento = i === 0 ? new Date() : null;
                const observacoesMensalidade = i === 0
                    ? 'Primeira mensalidade - Entrada do aluno (aprovação de formulário)'
                    : `Mensalidade ${i + 1} de ${quantidadeMesesInt} (aprovação de formulário)`;

                // Verificar se já existe mensalidade para este mês/ano
                const [existing] = await connection.query(`
                    SELECT id FROM mensalidades
                    WHERE aluno_id = ? AND mes_referencia = ? AND ano_referencia = ?
                `, [aluno_id, mes, ano]);

                if (existing.length === 0) {
                    await connection.query(`
                        INSERT INTO mensalidades (
                            aluno_id, plano_id, mes_referencia, ano_referencia,
                            valor_base, valor_desconto, valor_acrescimo, valor_total,
                            data_vencimento, status, data_pagamento, observacoes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        aluno_id,
                        plano_id,
                        mes,
                        ano,
                        valorBaseNum,
                        valorDescontoNum,
                        valorAcrescimoNum,
                        valorEfetivo,
                        dataVenc,
                        statusMensalidade,
                        dataPagamento,
                        observacoesMensalidade
                    ]);
                    mensalidadesCriadas++;
                }
            }
        }

        if (bolsista) {
            console.log(`[APROVACAO] Aluno ${aluno_id} cadastrado como BOLSISTA - Sem mensalidades`);
        } else {
            console.log(`[APROVACAO] Criadas ${mensalidadesCriadas} mensalidades para aluno ${aluno_id} - Valor: R$ ${valorEfetivo} (Base: R$ ${valor_base}, Desconto: R$ ${valor_desconto}, Acréscimo: R$ ${valor_acrescimo})`);
        }

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

        // Enviar email com credenciais
        try {
            console.log('[FORMULARIO] Enviando email de boas-vindas...');

            const emailResult = await emailService.sendFirstAccessEmail({
                nome: form.nome,
                email: form.email,
                senha: senhaTemporaria,
                tipo_usuario: 'aluno',
                matricula: matricula,
                usuarioId: usuario_id
            });

            if (emailResult.success) {
                console.log('[FORMULARIO] Email enviado com sucesso!');
            } else {
                console.error('[FORMULARIO] Falha ao enviar email:', emailResult.error);
            }

            // Se tiver email do responsável, enviar também para ele
            if (form.email_responsavel) {
                console.log('[FORMULARIO] Enviando email para responsável...');

                await emailService.sendFirstAccessEmail({
                    nome: `Responsável por ${form.nome}`,
                    email: form.email_responsavel,
                    senha: senhaTemporaria,
                    tipo_usuario: 'aluno',
                    matricula: matricula,
                    usuarioId: usuario_id
                });
            }
        } catch (emailError) {
            console.error('[FORMULARIO] Erro ao enviar email:', emailError);
            // Não falhar a aprovação por erro no email
        }

        res.json({
            message: bolsista
                ? 'Formulário aprovado! Aluno cadastrado como BOLSISTA (sem mensalidades). Email enviado com as credenciais.'
                : `Formulário aprovado com sucesso! ${mensalidadesCriadas} mensalidades criadas. Email enviado com as credenciais.`,
            usuario_id,
            aluno_id,
            contratacao_id,
            senha_temporaria: senhaTemporaria,
            bolsista,
            mensalidades_criadas: mensalidadesCriadas,
            valor_mensalidade: valorEfetivo
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

        const formularios = await db.query(
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
