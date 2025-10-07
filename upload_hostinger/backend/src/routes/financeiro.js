const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

// ========== BANDEIRAS DE PAGAMENTO ==========

// Listar bandeiras
router.get('/bandeiras', authenticateToken, async (req, res) => {
    try {
        const [bandeiras] = await db.query('SELECT * FROM bandeiras_pagamento WHERE ativo = TRUE ORDER BY nome');
        res.json(bandeiras);
    } catch (error) {
        console.error('Erro ao buscar bandeiras:', error);
        res.status(500).json({ error: 'Erro ao buscar bandeiras' });
    }
});

// Criar bandeira
router.post('/bandeiras', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const { nome, tipo, taxa_percentual, taxa_fixa } = req.body;
        const [result] = await db.query(
            'INSERT INTO bandeiras_pagamento (nome, tipo, taxa_percentual, taxa_fixa) VALUES (?, ?, ?, ?)',
            [nome, tipo, taxa_percentual || 0, taxa_fixa || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Bandeira criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar bandeira:', error);
        res.status(500).json({ error: 'Erro ao criar bandeira' });
    }
});

// ========== MENSALIDADES ==========

// Listar mensalidades
router.get('/mensalidades', authenticateToken, async (req, res) => {
    try {
        const { status, aluno_id, mes, ano } = req.query;

        let query = `
            SELECT
                m.*,
                a.nome AS aluno_nome,
                a.email AS aluno_email,
                p.nome AS plano_nome,
                COUNT(DISTINCT pd.id) AS total_pagamentos,
                COALESCE(SUM(pd.valor_pago), 0) AS total_pago
            FROM mensalidades m
            INNER JOIN alunos a ON m.aluno_id = a.id
            LEFT JOIN planos p ON m.plano_id = p.id
            LEFT JOIN pagamentos_detalhes pd ON m.id = pd.mensalidade_id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND m.status = ?';
            params.push(status);
        }

        if (aluno_id) {
            query += ' AND m.aluno_id = ?';
            params.push(aluno_id);
        }

        if (mes) {
            query += ' AND m.mes_referencia = ?';
            params.push(mes);
        }

        if (ano) {
            query += ' AND m.ano_referencia = ?';
            params.push(ano);
        }

        query += ' GROUP BY m.id ORDER BY m.data_vencimento DESC';

        const [mensalidades] = await db.query(query, params);
        res.json(mensalidades);
    } catch (error) {
        console.error('Erro ao buscar mensalidades:', error);
        res.status(500).json({ error: 'Erro ao buscar mensalidades' });
    }
});

// Buscar mensalidade por ID
router.get('/mensalidades/:id', authenticateToken, async (req, res) => {
    try {
        const [mensalidades] = await db.query(`
            SELECT
                m.*,
                a.nome AS aluno_nome,
                a.email AS aluno_email,
                a.telefone AS aluno_telefone,
                p.nome AS plano_nome,
                p.valor AS plano_valor
            FROM mensalidades m
            INNER JOIN alunos a ON m.aluno_id = a.id
            LEFT JOIN planos p ON m.plano_id = p.id
            WHERE m.id = ?
        `, [req.params.id]);

        if (mensalidades.length === 0) {
            return res.status(404).json({ error: 'Mensalidade não encontrada' });
        }

        const [pagamentos] = await db.query(`
            SELECT pd.*, bp.nome AS bandeira_nome, bp.tipo AS bandeira_tipo
            FROM pagamentos_detalhes pd
            LEFT JOIN bandeiras_pagamento bp ON pd.bandeira_pagamento_id = bp.id
            WHERE pd.mensalidade_id = ?
        `, [req.params.id]);

        res.json({ ...mensalidades[0], pagamentos });
    } catch (error) {
        console.error('Erro ao buscar mensalidade:', error);
        res.status(500).json({ error: 'Erro ao buscar mensalidade' });
    }
});

// Criar mensalidade
router.post('/mensalidades', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const {
            aluno_id,
            plano_id,
            valor_base,
            valor_desconto = 0,
            valor_acrescimo = 0,
            mes_referencia,
            ano_referencia,
            data_vencimento,
            observacoes
        } = req.body;

        const valor_total = parseFloat(valor_base) - parseFloat(valor_desconto) + parseFloat(valor_acrescimo);

        const [result] = await db.query(`
            INSERT INTO mensalidades (
                aluno_id, plano_id, valor_base, valor_desconto, valor_acrescimo,
                valor_total, mes_referencia, ano_referencia, data_vencimento, observacoes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [aluno_id, plano_id, valor_base, valor_desconto, valor_acrescimo, valor_total, mes_referencia, ano_referencia, data_vencimento, observacoes]);

        res.status(201).json({ id: result.insertId, message: 'Mensalidade criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar mensalidade:', error);
        res.status(500).json({ error: 'Erro ao criar mensalidade' });
    }
});

// Registrar pagamento
router.post('/mensalidades/:id/pagar', authenticateToken, authorize(['admin']), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            bandeira_pagamento_id,
            valor_pago,
            data_pagamento,
            numero_parcelas = 1,
            observacoes
        } = req.body;

        // Buscar taxa da bandeira
        const [bandeira] = await connection.query(
            'SELECT taxa_percentual, taxa_fixa FROM bandeiras_pagamento WHERE id = ?',
            [bandeira_pagamento_id]
        );

        const taxa_percentual = bandeira[0]?.taxa_percentual || 0;
        const taxa_fixa = bandeira[0]?.taxa_fixa || 0;
        const valor_liquido = parseFloat(valor_pago) - (parseFloat(valor_pago) * parseFloat(taxa_percentual) / 100) - parseFloat(taxa_fixa);

        // Inserir pagamento
        await connection.query(`
            INSERT INTO pagamentos_detalhes (
                mensalidade_id, bandeira_pagamento_id, valor_pago, taxa_percentual,
                taxa_fixa, valor_liquido, data_pagamento, numero_parcelas, observacoes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.params.id, bandeira_pagamento_id, valor_pago, taxa_percentual, taxa_fixa, valor_liquido, data_pagamento, numero_parcelas, observacoes]);

        // Atualizar mensalidade
        await connection.query(`
            UPDATE mensalidades
            SET status = 'pago', data_pagamento = ?
            WHERE id = ?
        `, [data_pagamento, req.params.id]);

        await connection.commit();

        res.json({ message: 'Pagamento registrado com sucesso' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao registrar pagamento:', error);
        res.status(500).json({ error: 'Erro ao registrar pagamento' });
    } finally {
        connection.release();
    }
});

// Dashboard financeiro
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        // Receita total
        const [receitaTotal] = await db.query(`
            SELECT COALESCE(SUM(valor_total), 0) AS total
            FROM mensalidades
            WHERE status = 'pago'
            AND mes_referencia = ? AND ano_referencia = ?
        `, [mesAtual, anoAtual]);

        // Pendências
        const [pendencias] = await db.query(`
            SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS quantidade
            FROM mensalidades
            WHERE status IN ('pendente', 'atrasado')
            AND mes_referencia = ? AND ano_referencia = ?
        `, [mesAtual, anoAtual]);

        // Atrasados
        const [atrasados] = await db.query(`
            SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS quantidade
            FROM mensalidades
            WHERE status = 'atrasado'
        `);

        // Por bandeira
        const [porBandeira] = await db.query(`
            SELECT
                bp.nome,
                bp.tipo,
                COUNT(pd.id) AS quantidade,
                COALESCE(SUM(pd.valor_pago), 0) AS total
            FROM pagamentos_detalhes pd
            INNER JOIN bandeiras_pagamento bp ON pd.bandeira_pagamento_id = bp.id
            INNER JOIN mensalidades m ON pd.mensalidade_id = m.id
            WHERE m.mes_referencia = ? AND m.ano_referencia = ?
            GROUP BY bp.id
            ORDER BY total DESC
        `, [mesAtual, anoAtual]);

        res.json({
            receita_total: parseFloat(receitaTotal[0].total),
            pendencias: {
                total: parseFloat(pendencias[0].total),
                quantidade: pendencias[0].quantidade
            },
            atrasados: {
                total: parseFloat(atrasados[0].total),
                quantidade: atrasados[0].quantidade
            },
            por_bandeira: porBandeira
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar dashboard financeiro' });
    }
});

// Gerar mensalidades em lote
router.post('/mensalidades/gerar-lote', authenticateToken, authorize(['admin']), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { mes_referencia, ano_referencia, dia_vencimento } = req.body;

        // Buscar todos os alunos ativos com plano
        const [alunos] = await connection.query(`
            SELECT a.id AS aluno_id, p.id AS plano_id, p.valor
            FROM alunos a
            INNER JOIN planos p ON a.plano_id = p.id
            WHERE a.status = 'ativo'
        `);

        const data_vencimento = `${ano_referencia}-${String(mes_referencia).padStart(2, '0')}-${String(dia_vencimento).padStart(2, '0')}`;

        let criadas = 0;
        let erros = 0;

        for (const aluno of alunos) {
            try {
                await connection.query(`
                    INSERT INTO mensalidades (
                        aluno_id, plano_id, valor_base, valor_total,
                        mes_referencia, ano_referencia, data_vencimento
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [aluno.aluno_id, aluno.plano_id, aluno.valor, aluno.valor, mes_referencia, ano_referencia, data_vencimento]);
                criadas++;
            } catch (err) {
                erros++;
            }
        }

        await connection.commit();

        res.json({
            message: `Mensalidades geradas com sucesso`,
            criadas,
            erros
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao gerar mensalidades:', error);
        res.status(500).json({ error: 'Erro ao gerar mensalidades em lote' });
    } finally {
        connection.release();
    }
});

module.exports = router;
