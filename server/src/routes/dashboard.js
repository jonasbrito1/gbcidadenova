const express = require('express');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Dashboard principal (admin e professor)
router.get('/', adminOrTeacher, async (req, res) => {
    try {
        const { periodo = '30' } = req.query; // período em dias
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

        // Métricas gerais
        const [
            totalAlunos,
            alunosAtivos,
            totalProfessores,
            totalPagamentos,
            pagamentosVencidos,
            receitaTotal,
            aulasHoje
        ] = await Promise.all([
            // Total de alunos
            query('SELECT COUNT(*) as total FROM alunos'),

            // Alunos ativos
            query('SELECT COUNT(*) as total FROM alunos WHERE status = "ativo"'),

            // Total de professores
            query('SELECT COUNT(*) as total FROM professores WHERE status = "ativo"'),

            // Total de pagamentos do período
            query(`
                SELECT COUNT(*) as total
                FROM pagamentos
                WHERE created_at >= ?
            `, [dataInicio.toISOString().split('T')[0]]),

            // Pagamentos vencidos
            query(`
                SELECT COUNT(*) as total
                FROM pagamentos
                WHERE status IN ('pendente', 'atrasado') AND data_vencimento < CURDATE()
            `),

            // Receita total do período
            query(`
                SELECT COALESCE(SUM(valor_pago), 0) as total
                FROM pagamentos
                WHERE status = 'pago' AND data_pagamento >= ?
            `, [dataInicio.toISOString().split('T')[0]]),

            // Aulas hoje
            query(`
                SELECT COUNT(*) as total
                FROM frequencia
                WHERE data_aula = CURDATE()
            `)
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

        res.json({
            metricas: {
                totalAlunos: totalAlunos[0].total,
                alunosAtivos: alunosAtivos[0].total,
                totalProfessores: totalProfessores[0].total,
                totalPagamentos: totalPagamentos[0].total,
                pagamentosVencidos: pagamentosVencidos[0].total,
                receitaTotal: parseFloat(receitaTotal[0].total || 0),
                aulasHoje: aulasHoje[0].total
            },
            evolucaoAlunos,
            distribuicaoPrograma,
            topFrequencia,
            receitaMensal,
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

module.exports = router;