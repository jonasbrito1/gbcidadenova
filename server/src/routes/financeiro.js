const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');

// ========== MENSALIDADES ==========

// Listar mensalidades
router.get('/mensalidades', authenticateToken, async (req, res) => {
    try {
        const { status, aluno_id, mes, ano, aluno } = req.query;

        let query = `
            SELECT
                m.*,
                u.nome AS aluno_nome,
                u.email AS aluno_email,
                p.nome AS plano_nome,
                COUNT(DISTINCT pd.id) AS total_pagamentos,
                COALESCE(SUM(pd.valor_pago), 0) AS total_pago
            FROM mensalidades m
            INNER JOIN alunos al ON m.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
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

        if (aluno) {
            query += ' AND u.nome LIKE ?';
            params.push(`%${aluno}%`);
        }

        query += ' GROUP BY m.id ORDER BY m.data_vencimento DESC';

        const mensalidades = await db.query(query, params);
        res.json(mensalidades);
    } catch (error) {
        console.error('Erro ao buscar mensalidades:', error);
        res.status(500).json({ error: 'Erro ao buscar mensalidades' });
    }
});

// Buscar mensalidade por ID
router.get('/mensalidades/:id', authenticateToken, async (req, res) => {
    try {
        const mensalidades = await db.query(`
            SELECT
                m.*,
                u.nome AS aluno_nome,
                u.email AS aluno_email,
                u.telefone AS aluno_telefone,
                p.nome AS plano_nome,
                p.valor AS plano_valor
            FROM mensalidades m
            INNER JOIN alunos al ON m.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
            LEFT JOIN planos p ON m.plano_id = p.id
            WHERE m.id = ?
        `, [req.params.id]);

        if (mensalidades.length === 0) {
            return res.status(404).json({ error: 'Mensalidade não encontrada' });
        }

        const pagamentos = await db.query(`
            SELECT pd.*
            FROM pagamentos_detalhes pd
            WHERE pd.mensalidade_id = ?
        `, [req.params.id]);

        res.json({ ...mensalidades[0], pagamentos });
    } catch (error) {
        console.error('Erro ao buscar mensalidade:', error);
        res.status(500).json({ error: 'Erro ao buscar mensalidade' });
    }
});

// Criar mensalidade com recorrência
router.post('/mensalidades', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            aluno_id,
            plano_id,
            valor_base,
            valor_desconto = 0,
            valor_acrescimo = 0,
            mes_referencia,
            ano_referencia,
            data_vencimento,
            observacoes,
            quantidade_meses = 1
        } = req.body;

        const valor_total = parseFloat(valor_base) - parseFloat(valor_desconto) + parseFloat(valor_acrescimo);
        const quantidadeMeses = parseInt(quantidade_meses);

        // Validar que aluno existe e está ativo
        const [alunos] = await connection.execute(
            'SELECT status FROM alunos WHERE id = ?',
            [aluno_id]
        );

        if (alunos.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Aluno não encontrado' });
        }

        if (alunos[0].status !== 'ativo') {
            await connection.rollback();
            return res.status(400).json({
                error: `Não é possível criar mensalidade. Aluno está com status: ${alunos[0].status}`
            });
        }

        // Validar valores
        if (valor_total <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Valor total deve ser maior que zero' });
        }

        if (parseFloat(valor_desconto) > parseFloat(valor_base)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Desconto não pode ser maior que o valor base' });
        }

        // Validar quantidade de meses
        if (quantidadeMeses < 1 || quantidadeMeses > 36) {
            await connection.rollback();
            return res.status(400).json({ error: 'Quantidade de meses deve estar entre 1 e 36' });
        }

        let criadas = 0;
        let duplicadas = 0;
        let mensalidadesCriadas = [];

        for (let i = 0; i < quantidadeMeses; i++) {
            // Calcular mês e ano para cada iteração
            let mes_atual = parseInt(mes_referencia) + i;
            let ano_atual = parseInt(ano_referencia);

            while (mes_atual > 12) {
                mes_atual -= 12;
                ano_atual += 1;
            }

            // Calcular data de vencimento para cada mês
            const dataVencimento = new Date(data_vencimento);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);
            const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];

            // Verificar se já existe mensalidade para este aluno/mês/ano
            const [existing] = await connection.execute(`
                SELECT id FROM mensalidades
                WHERE aluno_id = ? AND mes_referencia = ? AND ano_referencia = ?
            `, [aluno_id, mes_atual, ano_atual]);

            if (existing.length > 0) {
                duplicadas++;
                continue;
            }

            // Inserir mensalidade
            const [result] = await connection.execute(`
                INSERT INTO mensalidades (
                    aluno_id, plano_id, valor_base, valor_desconto, valor_acrescimo,
                    valor_total, mes_referencia, ano_referencia, data_vencimento, observacoes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [aluno_id, plano_id, valor_base, valor_desconto, valor_acrescimo, valor_total, mes_atual, ano_atual, dataVencimentoStr, observacoes]);

            mensalidadesCriadas.push({
                id: result.insertId,
                mes: mes_atual,
                ano: ano_atual
            });
            criadas++;
        }

        await connection.commit();

        res.status(201).json({
            message: criadas > 0 ? 'Mensalidades criadas com sucesso' : 'Nenhuma mensalidade criada',
            criadas,
            duplicadas,
            total: quantidadeMeses,
            mensalidades: mensalidadesCriadas
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar mensalidades:', error);
        res.status(500).json({ error: 'Erro ao criar mensalidades' });
    } finally {
        connection.release();
    }
});

// Registrar pagamento
router.post('/mensalidades/:id/pagar', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            valor_pago,
            data_pagamento,
            numero_parcelas = 1,
            observacoes
        } = req.body;

        const valor_liquido = parseFloat(valor_pago);

        // Buscar dados da mensalidade atual e do aluno
        const [mensalidadeAtual] = await connection.execute(`
            SELECT
                m.*,
                a.plano_id as aluno_plano_id,
                a.dia_vencimento,
                a.valor_mensalidade_customizado
            FROM mensalidades m
            INNER JOIN alunos a ON m.aluno_id = a.id
            WHERE m.id = ?
        `, [req.params.id]);

        if (mensalidadeAtual.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Mensalidade não encontrada' });
        }

        const mensalidade = mensalidadeAtual[0];

        // Inserir pagamento
        await connection.execute(`
            INSERT INTO pagamentos_detalhes (
                mensalidade_id, valor_pago, valor_liquido, data_pagamento, numero_parcelas, observacoes
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.params.id, valor_pago, valor_liquido, data_pagamento, numero_parcelas, observacoes]);

        // Atualizar mensalidade
        await connection.execute(`
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

        // Se mes e ano forem fornecidos, filtrar por período específico
        // Caso contrário, mostrar totais de todos os períodos
        let receitaQuery, pendenciasQuery, receitaEsperadaQuery;
        let receitaParams = [];
        let pendenciasParams = [];
        let receitaEsperadaParams = [];

        if (mes && ano) {
            // Filtrar por mês/ano específico
            receitaQuery = `
                SELECT COALESCE(SUM(valor_total), 0) AS total
                FROM mensalidades
                WHERE status = 'pago'
                AND mes_referencia = ? AND ano_referencia = ?
            `;
            receitaParams = [mes, ano];

            pendenciasQuery = `
                SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS quantidade
                FROM mensalidades
                WHERE status = 'pendente'
                AND mes_referencia = ? AND ano_referencia = ?
            `;
            pendenciasParams = [mes, ano];

            receitaEsperadaQuery = `
                SELECT COALESCE(SUM(valor_total), 0) AS total
                FROM mensalidades
                WHERE mes_referencia = ? AND ano_referencia = ?
            `;
            receitaEsperadaParams = [mes, ano];
        } else {
            // Mostrar todos os períodos
            receitaQuery = `
                SELECT COALESCE(SUM(valor_total), 0) AS total
                FROM mensalidades
                WHERE status = 'pago'
            `;

            pendenciasQuery = `
                SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS quantidade
                FROM mensalidades
                WHERE status = 'pendente'
            `;

            receitaEsperadaQuery = `
                SELECT COALESCE(SUM(valor_total), 0) AS total
                FROM mensalidades
            `;
        }

        // Receita total (mensalidades pagas)
        const receitaTotal = await db.query(receitaQuery, receitaParams);

        // Pendências (mensalidades pendentes, não incluir atrasados)
        const pendencias = await db.query(pendenciasQuery, pendenciasParams);

        // Receita esperada (total de todas mensalidades do período)
        const receitaEsperada = await db.query(receitaEsperadaQuery, receitaEsperadaParams);

        // Atrasados (mensalidades atrasadas de qualquer período - sempre sem filtro de mês)
        const atrasados = await db.query(`
            SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS quantidade
            FROM mensalidades
            WHERE status = 'atrasado'
        `);

        res.json({
            receita_recebida: parseFloat(receitaTotal[0]?.total || 0),
            receita_esperada: parseFloat(receitaEsperada[0]?.total || 0),
            pendencias: {
                total: parseFloat(pendencias[0]?.total || 0),
                quantidade: pendencias[0]?.quantidade || 0
            },
            atrasados: {
                total: parseFloat(atrasados[0]?.total || 0),
                quantidade: atrasados[0]?.quantidade || 0
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ error: 'Erro ao buscar dashboard financeiro' });
    }
});

// Gerar mensalidades em lote
router.post('/mensalidades/gerar-lote', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { mes_referencia, ano_referencia, dia_vencimento } = req.body;

        // Buscar todos os alunos ativos com plano
        const [alunos] = await connection.execute(`
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
                await connection.execute(`
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

// Excluir mensalidades em massa
router.post('/mensalidades/bulk-delete', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Nenhuma mensalidade selecionada' });
        }

        let processados = 0;
        let erros = 0;

        for (const id of ids) {
            try {
                // Excluir pagamentos associados primeiro (foreign key)
                await connection.execute(
                    'DELETE FROM pagamentos_detalhes WHERE mensalidade_id = ?',
                    [id]
                );

                // Excluir mensalidade
                const [result] = await connection.execute(
                    'DELETE FROM mensalidades WHERE id = ?',
                    [id]
                );

                if (result.affectedRows > 0) {
                    processados++;
                }
            } catch (err) {
                console.error(`Erro ao excluir mensalidade ${id}:`, err);
                erros++;
            }
        }

        await connection.commit();

        res.json({
            message: `${processados} mensalidade(s) excluída(s) com sucesso`,
            processados,
            erros,
            total: ids.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao excluir mensalidades em massa:', error);
        res.status(500).json({ error: 'Erro ao excluir mensalidades em massa' });
    } finally {
        connection.release();
    }
});

// Atualizar status de mensalidades em massa
router.post('/mensalidades/bulk-update-status', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { ids, status } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Nenhuma mensalidade selecionada' });
        }

        const statusValidos = ['pago', 'pendente', 'atrasado', 'cancelado'];
        if (!statusValidos.includes(status)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Status inválido' });
        }

        let processados = 0;
        let erros = 0;

        for (const id of ids) {
            try {
                const [result] = await connection.execute(
                    'UPDATE mensalidades SET status = ? WHERE id = ?',
                    [status, id]
                );

                if (result.affectedRows > 0) {
                    processados++;
                }
            } catch (err) {
                console.error(`Erro ao atualizar mensalidade ${id}:`, err);
                erros++;
            }
        }

        await connection.commit();

        res.json({
            message: `Status atualizado para "${status}" em ${processados} mensalidade(s)`,
            processados,
            erros,
            total: ids.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao atualizar status em massa:', error);
        res.status(500).json({ error: 'Erro ao atualizar status em massa' });
    } finally {
        connection.release();
    }
});

// Corrigir vencimento de mensalidades futuras de um aluno
router.post('/mensalidades/corrigir-vencimentos/:aluno_id', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { aluno_id } = req.params;
        const { novo_dia_vencimento, data_referencia_pagamento } = req.body;

        // Validar dia de vencimento (1-31)
        const dia = parseInt(novo_dia_vencimento);
        if (dia < 1 || dia > 31) {
            await connection.rollback();
            return res.status(400).json({ error: 'Dia de vencimento deve estar entre 1 e 31' });
        }

        // Se fornecida data de referência, usar o dia dela
        let diaVencimentoFinal = dia;
        if (data_referencia_pagamento) {
            const dataRef = new Date(data_referencia_pagamento);
            diaVencimentoFinal = dataRef.getDate();
        }

        // Atualizar campo dia_vencimento do aluno
        await connection.execute(`
            UPDATE alunos
            SET dia_vencimento = ?
            WHERE id = ?
        `, [diaVencimentoFinal, aluno_id]);

        // Buscar mensalidades pendentes (futuras) do aluno
        const [mensalidadesPendentes] = await connection.execute(`
            SELECT
                id, mes_referencia, ano_referencia, data_vencimento,
                valor_base, valor_desconto, valor_acrescimo, valor_total,
                plano_id, observacoes
            FROM mensalidades
            WHERE aluno_id = ?
            AND status IN ('pendente', 'atrasado')
            ORDER BY ano_referencia, mes_referencia
        `, [aluno_id]);

        let mensalidadesAtualizadas = 0;

        // Atualizar data de vencimento de cada mensalidade
        for (const mensalidade of mensalidadesPendentes) {
            // Calcular nova data de vencimento mantendo o mês/ano
            let novaDataVencimento = new Date(
                mensalidade.ano_referencia,
                mensalidade.mes_referencia - 1,
                diaVencimentoFinal
            );

            // Ajustar se o dia não existir no mês (ex: 31 em fevereiro)
            if (novaDataVencimento.getMonth() !== mensalidade.mes_referencia - 1) {
                // Usar o último dia do mês
                novaDataVencimento = new Date(mensalidade.ano_referencia, mensalidade.mes_referencia, 0);
            }

            const novaDataVencimentoStr = novaDataVencimento.toISOString().split('T')[0];

            // Atualizar mensalidade
            await connection.execute(`
                UPDATE mensalidades
                SET data_vencimento = ?,
                    observacoes = CONCAT(COALESCE(observacoes, ''), ' | Vencimento corrigido para dia ', ?)
                WHERE id = ?
            `, [novaDataVencimentoStr, diaVencimentoFinal, mensalidade.id]);

            mensalidadesAtualizadas++;
        }

        await connection.commit();

        res.json({
            message: 'Vencimentos corrigidos com sucesso',
            dia_vencimento_atualizado: diaVencimentoFinal,
            mensalidades_atualizadas: mensalidadesAtualizadas
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao corrigir vencimentos:', error);
        res.status(500).json({ error: 'Erro ao corrigir vencimentos das mensalidades' });
    } finally {
        connection.release();
    }
});

// Editar mensalidade individual
router.put('/mensalidades/:id', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            mes_referencia,
            ano_referencia,
            data_vencimento,
            valor_base,
            valor_desconto = 0,
            valor_acrescimo = 0,
            observacoes
        } = req.body;

        // Calcular novo valor total
        const valor_total = parseFloat(valor_base) - parseFloat(valor_desconto) + parseFloat(valor_acrescimo);

        // Validar se mensalidade existe
        const [mensalidadeExistente] = await connection.execute(
            'SELECT * FROM mensalidades WHERE id = ?',
            [id]
        );

        if (mensalidadeExistente.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Mensalidade não encontrada' });
        }

        // Validar valores
        if (valor_total <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Valor total deve ser maior que zero' });
        }

        if (parseFloat(valor_desconto) > parseFloat(valor_base)) {
            await connection.rollback();
            return res.status(400).json({ error: 'Desconto não pode ser maior que o valor base' });
        }

        // Verificar duplicata (mesmo aluno, mês e ano)
        const [duplicata] = await connection.execute(`
            SELECT id FROM mensalidades
            WHERE aluno_id = ? AND mes_referencia = ? AND ano_referencia = ? AND id != ?
        `, [mensalidadeExistente[0].aluno_id, mes_referencia, ano_referencia, id]);

        if (duplicata.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                error: `Já existe uma mensalidade para ${mes_referencia}/${ano_referencia} deste aluno`
            });
        }

        // Atualizar mensalidade
        await connection.execute(`
            UPDATE mensalidades
            SET
                mes_referencia = ?,
                ano_referencia = ?,
                data_vencimento = ?,
                valor_base = ?,
                valor_desconto = ?,
                valor_acrescimo = ?,
                valor_total = ?,
                observacoes = ?
            WHERE id = ?
        `, [
            mes_referencia,
            ano_referencia,
            data_vencimento,
            valor_base,
            valor_desconto,
            valor_acrescimo,
            valor_total,
            observacoes,
            id
        ]);

        await connection.commit();

        res.json({
            message: 'Mensalidade atualizada com sucesso',
            mensalidade_id: id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao editar mensalidade:', error);
        res.status(500).json({ error: 'Erro ao editar mensalidade' });
    } finally {
        connection.release();
    }
});

// Editar mensalidades em massa
router.put('/mensalidades/bulk-edit', authenticateToken, authorize('admin'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { ids, campos } = req.body;

        // Validações
        if (!Array.isArray(ids) || ids.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'IDs das mensalidades são obrigatórios' });
        }

        if (!campos || Object.keys(campos).length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Nenhum campo para atualizar foi fornecido' });
        }

        let processados = 0;
        let erros = 0;
        const detalhes = [];

        // Processar cada mensalidade
        for (const id of ids) {
            try {
                // Buscar mensalidade atual
                const [mensalidadeAtual] = await connection.execute(
                    'SELECT * FROM mensalidades WHERE id = ?',
                    [id]
                );

                if (mensalidadeAtual.length === 0) {
                    erros++;
                    detalhes.push({ id, erro: 'Mensalidade não encontrada' });
                    continue;
                }

                const mensalidade = mensalidadeAtual[0];

                // Preparar campos para atualização (mesclar com valores atuais)
                const mes_referencia = campos.mes_referencia !== undefined ? campos.mes_referencia : mensalidade.mes_referencia;
                const ano_referencia = campos.ano_referencia !== undefined ? campos.ano_referencia : mensalidade.ano_referencia;
                const data_vencimento = campos.data_vencimento || mensalidade.data_vencimento;
                const valor_base = campos.valor_base !== undefined ? parseFloat(campos.valor_base) : parseFloat(mensalidade.valor_base);
                const valor_desconto = campos.valor_desconto !== undefined ? parseFloat(campos.valor_desconto) : parseFloat(mensalidade.valor_desconto);
                const valor_acrescimo = campos.valor_acrescimo !== undefined ? parseFloat(campos.valor_acrescimo) : parseFloat(mensalidade.valor_acrescimo);

                // Recalcular valor total
                const valor_total = valor_base - valor_desconto + valor_acrescimo;

                // Validar valores
                if (valor_total <= 0) {
                    erros++;
                    detalhes.push({ id, erro: 'Valor total resultaria em valor menor ou igual a zero' });
                    continue;
                }

                if (valor_desconto > valor_base) {
                    erros++;
                    detalhes.push({ id, erro: 'Desconto não pode ser maior que o valor base' });
                    continue;
                }

                // Verificar duplicata se mês/ano foram alterados
                if (campos.mes_referencia !== undefined || campos.ano_referencia !== undefined) {
                    const [duplicata] = await connection.execute(`
                        SELECT id FROM mensalidades
                        WHERE aluno_id = ? AND mes_referencia = ? AND ano_referencia = ? AND id != ?
                    `, [mensalidade.aluno_id, mes_referencia, ano_referencia, id]);

                    if (duplicata.length > 0) {
                        erros++;
                        detalhes.push({ id, erro: `Já existe mensalidade para ${mes_referencia}/${ano_referencia} deste aluno` });
                        continue;
                    }
                }

                // Atualizar mensalidade
                await connection.execute(`
                    UPDATE mensalidades
                    SET
                        mes_referencia = ?,
                        ano_referencia = ?,
                        data_vencimento = ?,
                        valor_base = ?,
                        valor_desconto = ?,
                        valor_acrescimo = ?,
                        valor_total = ?
                    WHERE id = ?
                `, [
                    mes_referencia,
                    ano_referencia,
                    data_vencimento,
                    valor_base,
                    valor_desconto,
                    valor_acrescimo,
                    valor_total,
                    id
                ]);

                processados++;
                detalhes.push({ id, sucesso: true });

            } catch (error) {
                erros++;
                detalhes.push({ id, erro: error.message });
                console.error(`Erro ao processar mensalidade ${id}:`, error);
            }
        }

        await connection.commit();

        res.json({
            message: `Edição em massa concluída: ${processados} sucesso(s), ${erros} erro(s)`,
            processados,
            erros,
            detalhes
        });

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao editar mensalidades em massa:', error);
        res.status(500).json({ error: 'Erro ao editar mensalidades em massa' });
    } finally {
        connection.release();
    }
});

// Enviar notificações de pagamento em massa
router.post('/mensalidades/send-bulk-notifications', authenticateToken, authorize('admin'), async (req, res) => {
    try {
        const { ids, mensagemCustomizada } = req.body;
        const enviadoPor = req.user?.id || null;

        // Validações
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Nenhuma mensalidade selecionada' });
        }

        if (ids.length > 100) {
            return res.status(400).json({ error: 'Máximo de 100 mensalidades por vez' });
        }

        // Buscar mensalidades com dados do aluno e responsável
        const placeholders = ids.map(() => '?').join(',');
        const query = `
            SELECT
                m.id,
                m.valor_total,
                m.mes_referencia,
                m.ano_referencia,
                m.data_vencimento,
                m.status,
                m.aluno_id,
                u.nome AS aluno_nome,
                u.email AS aluno_email,
                al.email_responsavel
            FROM mensalidades m
            INNER JOIN alunos al ON m.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
            WHERE m.id IN (${placeholders})
        `;

        const mensalidades = await db.query(query, ids);

        if (mensalidades.length === 0) {
            return res.status(404).json({ error: 'Nenhuma mensalidade encontrada' });
        }

        // Preparar lista de emails a enviar
        const emailsParaEnviar = [];

        mensalidades.forEach(mens => {
            // Adicionar email do aluno
            if (mens.aluno_email) {
                emailsParaEnviar.push({
                    tipo: 'aluno',
                    nome: mens.aluno_nome,
                    email: mens.aluno_email,
                    mensalidade: {
                        id: mens.id,
                        valor_total: mens.valor_total,
                        mes_referencia: mens.mes_referencia,
                        ano_referencia: mens.ano_referencia,
                        data_vencimento: mens.data_vencimento,
                        status: mens.status
                    },
                    aluno_id: mens.aluno_id
                });
            }

            // Adicionar email do responsável
            if (mens.email_responsavel) {
                emailsParaEnviar.push({
                    tipo: 'responsavel',
                    nome: mens.aluno_nome, // Nome do aluno no assunto
                    email: mens.email_responsavel,
                    mensalidade: {
                        id: mens.id,
                        valor_total: mens.valor_total,
                        mes_referencia: mens.mes_referencia,
                        ano_referencia: mens.ano_referencia,
                        data_vencimento: mens.data_vencimento,
                        status: mens.status
                    },
                    aluno_id: mens.aluno_id
                });
            }
        });

        if (emailsParaEnviar.length === 0) {
            return res.status(400).json({
                error: 'Nenhum email cadastrado para as mensalidades selecionadas'
            });
        }

        // Processar envios em lotes
        const tamanhoLote = 10;
        const delayEntreLotes = 500; // 500ms

        let sucessos = 0;
        let falhas = 0;
        const falhasLista = [];

        for (let i = 0; i < emailsParaEnviar.length; i += tamanhoLote) {
            const lote = emailsParaEnviar.slice(i, i + tamanhoLote);

            const promessas = lote.map(async (emailData) => {
                try {
                    await emailService.sendPaymentReminderEmail({
                        destinatarioNome: emailData.nome,
                        destinatarioEmail: emailData.email,
                        valorTotal: emailData.mensalidade.valor_total,
                        mesReferencia: emailData.mensalidade.mes_referencia,
                        anoReferencia: emailData.mensalidade.ano_referencia,
                        dataVencimento: emailData.mensalidade.data_vencimento,
                        status: emailData.mensalidade.status,
                        mensalidadeId: emailData.mensalidade.id,
                        alunoId: emailData.aluno_id,
                        mensagemCustomizada: mensagemCustomizada || null,
                        tipoNotificacao: 'manual',
                        numeroTentativa: 1,
                        destinatarioTipo: emailData.tipo,
                        enviadoPor: enviadoPor
                    });

                    sucessos++;
                    return { sucesso: true };
                } catch (error) {
                    falhas++;
                    falhasLista.push({
                        mensalidade_id: emailData.mensalidade.id,
                        nome: emailData.nome,
                        email: emailData.email,
                        tipo: emailData.tipo,
                        erro: error.message
                    });
                    return { sucesso: false, erro: error.message };
                }
            });

            await Promise.all(promessas);

            // Aguardar entre lotes (exceto no último)
            if (i + tamanhoLote < emailsParaEnviar.length) {
                await new Promise(resolve => setTimeout(resolve, delayEntreLotes));
            }
        }

        res.json({
            message: 'Processamento de notificações concluído',
            total: mensalidades.length,
            emails_enviados: emailsParaEnviar.length,
            sucessos,
            falhas,
            falhas_lista: falhasLista,
            detalhes: `${sucessos} email(s) enviado(s) com sucesso, ${falhas} falha(s)`
        });

    } catch (error) {
        console.error('Erro ao enviar notificações em massa:', error);
        res.status(500).json({ error: 'Erro ao enviar notificações em massa' });
    }
});

module.exports = router;
