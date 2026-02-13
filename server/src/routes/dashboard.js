const express = require('express');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher } = require('../middleware/auth');
const { sendBirthdayEmail } = require('../services/emailService');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Dashboard principal (admin e professor)
router.get('/', adminOrTeacher, async (req, res) => {
    try {
        const { periodo = '30' } = req.query; // período em dias
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        // Obter mês e ano atuais para as queries
        const agora = new Date();
        const mesAtual = agora.getMonth() + 1;
        const anoAtual = agora.getFullYear();

        // Métricas gerais
        const [
            totalAlunos,
            alunosAtivos,
            totalProfessores,
            totalPagamentos,
            pagamentosPendentes,
            pagamentosVencidos,
            receitaTotal,
            aulasHoje,
            taxaPresenca
        ] = await Promise.all([
            // Total de alunos
            query('SELECT COUNT(*) as total FROM alunos'),

            // Alunos ativos
            query('SELECT COUNT(*) as total FROM alunos WHERE status = "ativo"'),

            // Total de professores ativos
            query('SELECT COUNT(*) as total FROM professores WHERE status = "ativo"'),

            // Total de mensalidades PAGAS no mês atual (usa data_pagamento)
            query(`
                SELECT COUNT(*) as total
                FROM mensalidades
                WHERE status = 'pago'
                  AND data_pagamento IS NOT NULL
                  AND MONTH(data_pagamento) = ?
                  AND YEAR(data_pagamento) = ?
            `, [mesAtual, anoAtual]),

            // Mensalidades pendentes (não vencidas)
            query(`
                SELECT COUNT(*) as total
                FROM mensalidades
                WHERE status = 'pendente'
                  AND data_vencimento >= CURDATE()
            `),

            // Mensalidades vencidas (atrasadas)
            query(`
                SELECT COUNT(*) as total
                FROM mensalidades
                WHERE status IN ('pendente', 'atrasado')
                  AND data_vencimento < CURDATE()
            `),

            // Receita total recebida no mês atual (usa data_pagamento e valor_total)
            query(`
                SELECT COALESCE(SUM(valor_total), 0) as total
                FROM mensalidades
                WHERE status = 'pago'
                  AND data_pagamento IS NOT NULL
                  AND MONTH(data_pagamento) = ?
                  AND YEAR(data_pagamento) = ?
            `, [mesAtual, anoAtual]),

            // Aulas programadas para hoje (de turmas)
            query(`
                SELECT COUNT(*) as total
                FROM turmas
                WHERE status = 'ativo'
                  AND dia_semana = CASE DAYOFWEEK(CURDATE())
                      WHEN 1 THEN 'domingo'
                      WHEN 2 THEN 'segunda'
                      WHEN 3 THEN 'terca'
                      WHEN 4 THEN 'quarta'
                      WHEN 5 THEN 'quinta'
                      WHEN 6 THEN 'sexta'
                      WHEN 7 THEN 'sabado'
                  END
            `),

            // Taxa de presença média mensal (mês atual)
            query(`
                SELECT
                    COALESCE(
                        ROUND(
                            (COUNT(CASE WHEN presente = 1 THEN 1 END) * 100.0) /
                            NULLIF(COUNT(*), 0),
                            1
                        ),
                        0
                    ) as taxa
                FROM frequencia
                WHERE MONTH(data_aula) = ?
                  AND YEAR(data_aula) = ?
            `, [mesAtual, anoAtual])
        ]);

        // Evolução de alunos (últimos 6 meses)
        const evolucaoAlunos = await query(`
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') as mes,
                COUNT(*) as novos_alunos
            FROM alunos
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY mes
        `);

        // Distribuição por programa
        const distribuicaoPrograma = await query(`
            SELECT
                programa,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos
            FROM alunos
            GROUP BY programa
        `);

        // Top 5 alunos com mais frequência no período
        const topFrequencia = await query(`
            SELECT
                u.nome,
                a.matricula,
                COUNT(f.id) as total_aulas
            FROM frequencia f
            JOIN alunos a ON f.aluno_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE f.data_aula >= ? AND f.presente = 1
            GROUP BY f.aluno_id, u.nome, a.matricula
            ORDER BY total_aulas DESC
            LIMIT 5
        `, [dataInicio.toISOString().split('T')[0]]);

        // Receita por mês (últimos 6 meses)
        const receitaMensal = await query(`
            SELECT
                DATE_FORMAT(data_pagamento, '%Y-%m') as mes,
                COALESCE(SUM(valor_pago), 0) as receita
            FROM pagamentos
            WHERE status = 'pago' AND data_pagamento >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(data_pagamento, '%Y-%m')
            ORDER BY mes
        `);

        // Distribuição por graduação/faixa (ordenada)
        const distribuicaoGraduacao = await query(`
            SELECT
                TRIM(graduacao) as graduacao,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
                CASE TRIM(graduacao)
                    WHEN 'Branca' THEN 1
                    WHEN 'Cinza' THEN 2
                    WHEN 'Amarela' THEN 3
                    WHEN 'Laranja' THEN 4
                    WHEN 'Verde' THEN 5
                    WHEN 'Azul' THEN 6
                    WHEN 'Roxa' THEN 7
                    WHEN 'Marrom' THEN 8
                    WHEN 'Preta' THEN 9
                    ELSE 10
                END as ordem_graduacao
            FROM alunos
            WHERE graduacao IS NOT NULL
                AND TRIM(graduacao) != ''
                AND TRIM(graduacao) != 'null'
            GROUP BY TRIM(graduacao), ordem_graduacao
            ORDER BY ordem_graduacao
        `);

        res.json({
            metricas: {
                totalAlunos: totalAlunos[0].total,
                alunosAtivos: alunosAtivos[0].total,
                totalProfessores: totalProfessores[0].total,
                totalPagamentos: totalPagamentos[0].total,
                pagamentosPendentes: pagamentosPendentes[0].total,
                pagamentosVencidos: pagamentosVencidos[0].total,
                receitaTotal: parseFloat(receitaTotal[0].total || 0),
                aulasHoje: aulasHoje[0].total,
                taxaPresenca: parseFloat(taxaPresenca[0].taxa || 0)
            },
            evolucaoAlunos,
            distribuicaoPrograma,
            topFrequencia,
            receitaMensal,
            distribuicaoGraduacao,
            periodo: parseInt(periodo)
        });

    } catch (error) {
        logger.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Métricas financeiras detalhadas
router.get('/financeiro', adminOrTeacher, async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const agora = new Date();
        const mesAtual = mes || (agora.getMonth() + 1);
        const anoAtual = ano || agora.getFullYear();

        // Receita do mês
        const [receitaMes] = await query(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'pago' THEN valor_pago ELSE 0 END), 0) as receita_paga,
                COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as receita_pendente,
                COALESCE(SUM(CASE WHEN status = 'atrasado' THEN valor ELSE 0 END), 0) as receita_atrasada,
                COUNT(CASE WHEN status = 'pago' THEN 1 END) as pagamentos_realizados,
                COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pagamentos_pendentes,
                COUNT(CASE WHEN status = 'atrasado' THEN 1 END) as pagamentos_atrasados
            FROM pagamentos
            WHERE MONTH(mes_referencia) = ? AND YEAR(mes_referencia) = ?
        `, [mesAtual, anoAtual]);

        // Comparação com mês anterior
        const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
        const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

        const [receitaMesAnterior] = await query(`
            SELECT COALESCE(SUM(valor_pago), 0) as receita
            FROM pagamentos
            WHERE status = 'pago' AND MONTH(mes_referencia) = ? AND YEAR(mes_referencia) = ?
        `, [mesAnterior, anoAnterior]);

        // Pagamentos por forma de pagamento
        const formasPagamento = await query(`
            SELECT
                forma_pagamento,
                COUNT(*) as quantidade,
                COALESCE(SUM(valor_pago), 0) as valor_total
            FROM pagamentos
            WHERE status = 'pago' AND MONTH(data_pagamento) = ? AND YEAR(data_pagamento) = ?
            GROUP BY forma_pagamento
        `, [mesAtual, anoAtual]);

        // Inadimplência por programa
        const inadimplenciaPorPrograma = await query(`
            SELECT
                a.programa,
                COUNT(p.id) as total_pendentes,
                COALESCE(SUM(p.valor), 0) as valor_pendente
            FROM pagamentos p
            JOIN alunos a ON p.aluno_id = a.id
            WHERE p.status IN ('pendente', 'atrasado')
            GROUP BY a.programa
        `);

        const receitaAtual = parseFloat(receitaMes.receita_paga || 0);
        const receitaAnterior = parseFloat(receitaMesAnterior.receita || 0);
        const crescimento = receitaAnterior > 0
            ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100
            : 0;

        res.json({
            resumo: {
                ...receitaMes,
                crescimento_percentual: parseFloat(crescimento.toFixed(2))
            },
            formasPagamento,
            inadimplenciaPorPrograma,
            mes: parseInt(mesAtual),
            ano: parseInt(anoAtual)
        });

    } catch (error) {
        logger.error('Erro ao buscar métricas financeiras:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Alertas e notificações
router.get('/alertas', adminOrTeacher, async (req, res) => {
    try {
        // Pagamentos vencidos hoje
        const vencimentosHoje = await query(`
            SELECT
                p.id,
                p.valor,
                u.nome as aluno_nome,
                u.telefone,
                a.matricula
            FROM pagamentos p
            JOIN alunos a ON p.aluno_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE p.data_vencimento = CURDATE() AND p.status = 'pendente'
            ORDER BY u.nome
        `);

        // Pagamentos em atraso
        const pagamentosAtrasados = await query(`
            SELECT
                p.id,
                p.valor,
                p.data_vencimento,
                DATEDIFF(CURDATE(), p.data_vencimento) as dias_atraso,
                u.nome as aluno_nome,
                u.telefone,
                a.matricula
            FROM pagamentos p
            JOIN alunos a ON p.aluno_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE p.data_vencimento < CURDATE() AND p.status IN ('pendente', 'atrasado')
            ORDER BY p.data_vencimento
            LIMIT 10
        `);

        // Alunos inativos há mais de 7 dias
        const alunosInativos = await query(`
            SELECT
                u.nome,
                a.matricula,
                MAX(f.data_aula) as ultima_aula,
                DATEDIFF(CURDATE(), MAX(f.data_aula)) as dias_inativo
            FROM alunos a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN frequencia f ON a.id = f.aluno_id AND f.presente = 1
            WHERE a.status = 'ativo'
            GROUP BY a.id, u.nome, a.matricula
            HAVING MAX(f.data_aula) IS NULL OR DATEDIFF(CURDATE(), MAX(f.data_aula)) > 7
            ORDER BY dias_inativo DESC
            LIMIT 10
        `);

        res.json({
            vencimentosHoje,
            pagamentosAtrasados,
            alunosInativos
        });

    } catch (error) {
        logger.error('Erro ao buscar alertas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Aniversariantes
router.get('/aniversariantes', adminOrTeacher, async (req, res) => {
    try {
        const { filtro = 'mes', mes } = req.query;
        const hoje = new Date();
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth() + 1;

        let whereClause = '';
        let params = [];

        switch (filtro) {
            case 'hoje':
                whereClause = 'DAY(u.data_nascimento) = ? AND MONTH(u.data_nascimento) = ?';
                params = [diaHoje, mesHoje];
                break;

            case 'semana':
                const proximoDia = new Date(hoje);
                proximoDia.setDate(proximoDia.getDate() + 7);
                const diaProximo = proximoDia.getDate();
                const mesProximo = proximoDia.getMonth() + 1;

                if (mesHoje === mesProximo) {
                    // Mesma semana no mesmo mês
                    whereClause = 'MONTH(u.data_nascimento) = ? AND DAY(u.data_nascimento) BETWEEN ? AND ?';
                    params = [mesHoje, diaHoje, diaProximo];
                } else {
                    // Semana atravessa dois meses
                    whereClause = `(
                        (MONTH(u.data_nascimento) = ? AND DAY(u.data_nascimento) >= ?) OR
                        (MONTH(u.data_nascimento) = ? AND DAY(u.data_nascimento) <= ?)
                    )`;
                    params = [mesHoje, diaHoje, mesProximo, diaProximo];
                }
                break;

            case 'mes_especifico':
                if (mes) {
                    whereClause = 'MONTH(u.data_nascimento) = ?';
                    params = [parseInt(mes)];
                } else {
                    whereClause = 'MONTH(u.data_nascimento) = ?';
                    params = [mesHoje];
                }
                break;

            case 'mes':
            default:
                whereClause = 'MONTH(u.data_nascimento) = ?';
                params = [mesHoje];
                break;
        }

        logger.info(`Buscando aniversariantes - Filtro: ${filtro}, Mês: ${mes || mesHoje}, Params: ${JSON.stringify(params)}`);

        const aniversariantes = await query(`
            SELECT
                a.id,
                u.nome,
                u.data_nascimento,
                u.telefone,
                u.email,
                a.programa,
                a.graduacao,
                DAY(u.data_nascimento) as dia_aniversario,
                MONTH(u.data_nascimento) as mes_aniversario,
                YEAR(CURDATE()) - YEAR(u.data_nascimento) -
                    CASE
                        WHEN MONTH(CURDATE()) < MONTH(u.data_nascimento) OR
                             (MONTH(CURDATE()) = MONTH(u.data_nascimento) AND DAY(CURDATE()) < DAY(u.data_nascimento))
                        THEN 1
                        ELSE 0
                    END as idade_atual,
                DATEDIFF(
                    DATE_ADD(
                        DATE_FORMAT(u.data_nascimento, CONCAT(YEAR(CURDATE()), '-%m-%d')),
                        INTERVAL IF(DATE_FORMAT(u.data_nascimento, CONCAT(YEAR(CURDATE()), '-%m-%d')) < CURDATE(), 1, 0) YEAR
                    ),
                    CURDATE()
                ) as dias_ate_aniversario,
                -- Status de envio (email e whatsapp no ano atual)
                IF(EXISTS(
                    SELECT 1 FROM mensagens_aniversario_enviadas
                    WHERE aluno_id = a.id
                      AND ano_aniversario = YEAR(CURDATE())
                      AND tipo_mensagem = 'email'
                ), 1, 0) as email_enviado_ano_atual,
                IF(EXISTS(
                    SELECT 1 FROM mensagens_aniversario_enviadas
                    WHERE aluno_id = a.id
                      AND ano_aniversario = YEAR(CURDATE())
                      AND tipo_mensagem IN ('whatsapp', 'manual')
                ), 1, 0) as whatsapp_enviado_ano_atual,
                (SELECT data_envio FROM mensagens_aniversario_enviadas
                 WHERE aluno_id = a.id
                   AND ano_aniversario = YEAR(CURDATE())
                 ORDER BY data_envio DESC LIMIT 1) as data_ultimo_envio
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.data_nascimento IS NOT NULL
                AND u.data_nascimento > '1900-01-01'
                AND u.data_nascimento < '2100-01-01'
                AND ${whereClause}
            ORDER BY dias_ate_aniversario ASC, u.nome ASC
        `, params);

        logger.info(`Encontrados ${aniversariantes.length} aniversariantes`);

        res.json({
            aniversariantes,
            filtro,
            mes: mes || mesHoje,
            total: aniversariantes.length
        });

    } catch (error) {
        logger.error('Erro ao buscar aniversariantes:', error);
        res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
    }
});

// Enviar email de aniversário
router.post('/enviar-email-aniversario', adminOrTeacher, async (req, res) => {
    try {
        const { alunoId, nome, email } = req.body;

        // Validar dados
        if (!alunoId || !nome || !email) {
            return res.status(400).json({
                error: 'Dados incompletos',
                message: 'ID do aluno, nome e email são obrigatórios'
            });
        }

        logger.info(`Enviando email de aniversário para ${nome} (${email})`);

        // Verificar se já foi enviado email no ano atual
        const anoAtual = new Date().getFullYear();
        const [jaEnviado] = await query(`
            SELECT id FROM mensagens_aniversario_enviadas
            WHERE aluno_id = ? AND ano_aniversario = ? AND tipo_mensagem = 'email'
        `, [alunoId, anoAtual]);

        if (jaEnviado) {
            return res.status(400).json({
                success: false,
                error: 'Email já enviado',
                message: `Já foi enviado email de aniversário para ${nome} neste ano (${anoAtual}).`
            });
        }

        // Enviar email
        const result = await sendBirthdayEmail({
            nome,
            email,
            alunoId
        });

        if (result.success) {
            // Registrar envio no banco de dados
            try {
                await query(`
                    INSERT INTO mensagens_aniversario_enviadas
                    (aluno_id, ano_aniversario, tipo_mensagem, enviado_por)
                    VALUES (?, ?, 'email', ?)
                `, [alunoId, anoAtual, req.user.id]);

                logger.info(`Email de aniversário registrado para aluno ID ${alunoId}`);
            } catch (regError) {
                logger.error('Erro ao registrar envio de email:', regError);
                // Email foi enviado, mas falhou ao registrar - não bloqueia resposta
            }

            res.json({
                success: true,
                message: 'Email enviado com sucesso',
                messageId: result.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Falha ao enviar email',
                message: result.error
            });
        }

    } catch (error) {
        logger.error('Erro ao enviar email de aniversário:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Validar mensagem de aniversário enviada (para WhatsApp ou validação manual)
router.post('/validar-mensagem-aniversario', adminOrTeacher, async (req, res) => {
    try {
        const { alunoId, tipo = 'manual', observacoes } = req.body;

        // Validar dados
        if (!alunoId) {
            return res.status(400).json({
                error: 'Dados incompletos',
                message: 'ID do aluno é obrigatório'
            });
        }

        // Validar tipo de mensagem
        const tiposValidos = ['whatsapp', 'manual'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo inválido',
                message: 'Tipo deve ser "whatsapp" ou "manual"'
            });
        }

        const anoAtual = new Date().getFullYear();

        // Verificar se já foi validado no ano atual
        const [jaValidado] = await query(`
            SELECT id FROM mensagens_aniversario_enviadas
            WHERE aluno_id = ? AND ano_aniversario = ? AND tipo_mensagem IN ('whatsapp', 'manual')
        `, [alunoId, anoAtual]);

        if (jaValidado) {
            return res.status(400).json({
                success: false,
                error: 'Mensagem já validada',
                message: `Mensagem de aniversário já foi validada para este aluno neste ano (${anoAtual}).`
            });
        }

        // Buscar nome do aluno para log
        const [aluno] = await query(`
            SELECT u.nome
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.id = ?
        `, [alunoId]);

        if (!aluno) {
            return res.status(404).json({
                error: 'Aluno não encontrado',
                message: 'Aluno não encontrado no sistema'
            });
        }

        // Registrar validação
        await query(`
            INSERT INTO mensagens_aniversario_enviadas
            (aluno_id, ano_aniversario, tipo_mensagem, enviado_por, observacoes)
            VALUES (?, ?, ?, ?, ?)
        `, [alunoId, anoAtual, tipo, req.user.id, observacoes || null]);

        logger.info(`Mensagem de aniversário validada: ${tipo} - Aluno: ${aluno.nome} (ID: ${alunoId}), Responsável: ${req.user.nome}`);

        res.json({
            success: true,
            message: 'Mensagem validada com sucesso',
            aluno: aluno.nome,
            tipo,
            ano: anoAtual
        });

    } catch (error) {
        logger.error('Erro ao validar mensagem de aniversário:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

module.exports = router;
