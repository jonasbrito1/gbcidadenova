const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

// ========== REGISTRO DE FREQUÊNCIA ==========

// Registrar presença de múltiplos alunos por turma
router.post('/registrar-turma', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { turma_id, data_aula, horario_inicio, horario_fim, tipo_aula = 'regular', presencas } = req.body;

        // presencas = [{ aluno_id, presente, observacoes }]
        for (const presenca of presencas) {
            // Verificar se já existe registro
            const [existing] = await connection.query(`
                SELECT id FROM frequencia
                WHERE aluno_id = ? AND data_aula = ? AND horario_inicio = ?
            `, [presenca.aluno_id, data_aula, horario_inicio]);

            if (existing.length > 0) {
                // Atualizar
                await connection.query(`
                    UPDATE frequencia
                    SET presente = ?, observacoes = ?, horario_fim = ?, tipo_aula = ?
                    WHERE id = ?
                `, [presenca.presente, presenca.observacoes, horario_fim, tipo_aula, existing[0].id]);
            } else {
                // Inserir
                await connection.query(`
                    INSERT INTO frequencia (
                        aluno_id, professor_id, data_aula, horario_inicio, horario_fim,
                        presente, observacoes, tipo_aula
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    presenca.aluno_id,
                    req.user.id,
                    data_aula,
                    horario_inicio,
                    horario_fim,
                    presenca.presente,
                    presenca.observacoes,
                    tipo_aula
                ]);
            }
        }

        await connection.commit();
        res.json({ message: 'Frequência registrada com sucesso' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao registrar frequência:', error);
        res.status(500).json({ error: 'Erro ao registrar frequência' });
    } finally {
        connection.release();
    }
});

// Registrar presença individual
router.post('/registrar', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const {
            aluno_id,
            data_aula,
            horario_inicio,
            horario_fim,
            presente = true,
            observacoes,
            tipo_aula = 'regular'
        } = req.body;

        // Verificar se já existe
        const existing = await db.query(`
            SELECT id FROM frequencia
            WHERE aluno_id = ? AND data_aula = ? AND horario_inicio = ?
        `, [aluno_id, data_aula, horario_inicio]);

        if (existing.length > 0) {
            await db.query(`
                UPDATE frequencia
                SET presente = ?, observacoes = ?, horario_fim = ?, tipo_aula = ?
                WHERE id = ?
            `, [presente, observacoes, horario_fim, tipo_aula, existing[0].id]);
        } else {
            await db.query(`
                INSERT INTO frequencia (
                    aluno_id, professor_id, data_aula, horario_inicio, horario_fim,
                    presente, observacoes, tipo_aula
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [aluno_id, req.user.id, data_aula, horario_inicio, horario_fim, presente, observacoes, tipo_aula]);
        }

        res.json({ message: 'Presença registrada com sucesso' });
    } catch (error) {
        console.error('Erro ao registrar presença:', error);
        res.status(500).json({ error: 'Erro ao registrar presença' });
    }
});

// ========== BUSCA DE ALUNOS PARA REGISTRO ==========

// Buscar todos os alunos ativos para registro de presença individual
router.get('/alunos-disponiveis', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { busca, turma_id } = req.query;

        let query = `
            SELECT
                al.id,
                u.nome,
                u.email,
                gs.nome AS graduacao,
                gs.cor AS cor_graduacao,
                al.programa
            FROM alunos al
            INNER JOIN usuarios u ON al.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gs ON al.graduacao_atual_id = gs.id
            WHERE al.status = 'ativo'
        `;

        const params = [];

        if (busca) {
            query += ` AND (u.nome LIKE ? OR u.email LIKE ?)`;
            params.push(`%${busca}%`, `%${busca}%`);
        }

        if (turma_id) {
            query += ` AND al.id IN (
                SELECT aluno_id FROM alunos_turmas
                WHERE turma_id = ? AND status_matricula = 'ativo'
            )`;
            params.push(turma_id);
        }

        query += ' ORDER BY u.nome ASC LIMIT 50';

        const alunos = await db.query(query, params);
        res.json(alunos);
    } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        res.status(500).json({ error: 'Erro ao buscar alunos' });
    }
});

// Registrar presença individual de aluno por admin/professor
router.post('/registrar-individual', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const {
            aluno_id,
            turma_id,
            data_aula,
            horario_inicio,
            horario_fim,
            presente = true,
            observacoes
        } = req.body;

        if (!aluno_id || !turma_id || !data_aula || !horario_inicio) {
            return res.status(400).json({
                error: 'Campos obrigatórios: aluno_id, turma_id, data_aula, horario_inicio'
            });
        }

        // Verificar se já existe registro para este aluno/data/horário
        const existing = await db.query(`
            SELECT id FROM frequencia
            WHERE aluno_id = ? AND turma_id = ? AND data_aula = ? AND horario_inicio = ?
        `, [aluno_id, turma_id, data_aula, horario_inicio]);

        if (existing.length > 0) {
            // Atualizar registro existente
            await db.query(`
                UPDATE frequencia
                SET presente = ?,
                    horario_fim = ?,
                    observacoes = ?,
                    tipo_registro = 'professor',
                    status_validacao = 'validado',
                    validado_por_id = ?,
                    validado_em = NOW()
                WHERE id = ?
            `, [presente, horario_fim, observacoes, req.user.id, existing[0].id]);

            return res.json({
                message: 'Presença atualizada com sucesso',
                updated: true,
                id: existing[0].id
            });
        }

        // Inserir novo registro
        const result = await db.query(`
            INSERT INTO frequencia (
                aluno_id, turma_id, data_aula, horario_inicio, horario_fim,
                presente, observacoes, tipo_registro, status_validacao,
                validado_por_id, validado_em, professor_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'professor', 'validado', ?, NOW(), ?)
        `, [
            aluno_id, turma_id, data_aula, horario_inicio, horario_fim,
            presente, observacoes, req.user.id, req.user.id
        ]);

        // Buscar informações do aluno para retorno
        const alunoInfo = await db.query(`
            SELECT u.nome, u.email
            FROM alunos al
            INNER JOIN usuarios u ON al.usuario_id = u.id
            WHERE al.id = ?
        `, [aluno_id]);

        res.json({
            message: 'Presença registrada com sucesso',
            created: true,
            id: result.insertId,
            aluno: alunoInfo[0]?.nome || 'Aluno'
        });
    } catch (error) {
        console.error('Erro ao registrar presença individual:', error);
        res.status(500).json({ error: 'Erro ao registrar presença' });
    }
});

// ========== CONSULTAS DE FREQUÊNCIA ==========

// Listar frequências com filtros
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { aluno_id, professor_id, turma_id, data_inicio, data_fim, presente } = req.query;

        let query = `
            SELECT
                f.*,
                ua.nome AS aluno_nome,
                ua.email AS aluno_email,
                up.nome AS professor_nome
            FROM frequencia f
            INNER JOIN alunos al ON f.aluno_id = al.id
            INNER JOIN usuarios ua ON al.usuario_id = ua.id
            LEFT JOIN professores p ON f.professor_id = p.id
            LEFT JOIN usuarios up ON p.usuario_id = up.id
            WHERE 1=1
        `;

        const params = [];

        if (aluno_id) {
            query += ' AND f.aluno_id = ?';
            params.push(aluno_id);
        }

        if (professor_id) {
            query += ' AND f.professor_id = ?';
            params.push(professor_id);
        }

        if (data_inicio) {
            query += ' AND f.data_aula >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND f.data_aula <= ?';
            params.push(data_fim);
        }

        if (presente !== undefined) {
            query += ' AND f.presente = ?';
            params.push(presente === 'true' ? 1 : 0);
        }

        query += ' ORDER BY f.data_aula DESC, f.horario_inicio DESC';

        const frequencias = await db.query(query, params);
        res.json(frequencias);
    } catch (error) {
        console.error('Erro ao buscar frequências:', error);
        res.status(500).json({ error: 'Erro ao buscar frequências' });
    }
});

// Buscar frequência por aluno
router.get('/aluno/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { mes, ano, data_inicio, data_fim } = req.query;

        let query = `
            SELECT
                f.*,
                u.nome AS professor_nome
            FROM frequencia f
            LEFT JOIN professores p ON f.professor_id = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE f.aluno_id = ?
        `;

        const params = [id];

        if (mes && ano) {
            query += ' AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mes, ano);
        }

        if (data_inicio) {
            query += ' AND f.data_aula >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND f.data_aula <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY f.data_aula DESC, f.horario_inicio DESC';

        const frequencias = await db.query(query, params);
        res.json(frequencias);
    } catch (error) {
        console.error('Erro ao buscar frequência do aluno:', error);
        res.status(500).json({ error: 'Erro ao buscar frequência' });
    }
});

// Buscar alunos para registro de frequência em uma turma
// Busca todos os alunos ativos do programa compatível com a turma
router.get('/turma/:id/alunos', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data_aula, horario_inicio } = req.query;

        // Primeiro, buscar informações da turma para saber o programa
        const turmaInfo = await db.query(`
            SELECT id, nome, programa FROM turmas WHERE id = ?
        `, [id]);

        if (turmaInfo.length === 0) {
            return res.status(404).json({ error: 'Turma não encontrada' });
        }

        const turma = turmaInfo[0];
        const programaTurma = turma.programa?.toUpperCase() || '';

        // Determinar quais programas de alunos são compatíveis com a turma
        let programaFilter = '';
        const extraParams = [];

        // Mapear programa da turma para programas de alunos compatíveis
        if (['GB1', 'GB2', 'ADULTOS', 'ADULTO'].includes(programaTurma)) {
            // Turmas de adultos: alunos com programa GB1, GB2, Adultos ou sem programa definido (adultos por padrão)
            programaFilter = `AND (
                UPPER(COALESCE(al.programa, '')) IN ('GB1', 'GB2', 'ADULTOS', 'ADULTO', '')
                OR al.programa IS NULL
            )`;
        } else if (['KIDS', 'INFANTIL', 'LITTLE CHAMPIONS', 'LITTLE CHAMPIONS 1', 'LITTLE CHAMPIONS 2'].includes(programaTurma)) {
            // Turmas Kids/Infantil
            programaFilter = `AND (
                UPPER(COALESCE(al.programa, '')) IN ('KIDS', 'INFANTIL', 'LITTLE CHAMPIONS', 'LITTLE CHAMPIONS 1', 'LITTLE CHAMPIONS 2')
                OR UPPER(COALESCE(al.programa, '')) LIKE '%KIDS%'
                OR UPPER(COALESCE(al.programa, '')) LIKE '%INFANTIL%'
            )`;
        } else if (programaTurma) {
            // Para outros programas, buscar por correspondência exata ou parcial
            programaFilter = `AND (UPPER(COALESCE(al.programa, '')) = ? OR UPPER(COALESCE(al.programa, '')) LIKE ?)`;
            extraParams.push(programaTurma, `%${programaTurma}%`);
        }
        // Se não houver programa definido na turma, mostra todos os alunos ativos

        // Buscar todos os alunos ativos do programa compatível
        const alunos = await db.query(`
            SELECT
                al.id,
                u.nome,
                u.email,
                al.programa AS aluno_programa,
                gs.nome AS graduacao,
                gs.cor AS cor_graduacao,
                f.presente,
                f.observacoes
            FROM alunos al
            INNER JOIN usuarios u ON al.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gs ON al.graduacao_atual_id = gs.id
            LEFT JOIN frequencia f ON f.aluno_id = al.id
                AND f.turma_id = ?
                AND f.data_aula = ?
                AND f.horario_inicio = ?
            WHERE al.status = 'ativo'
            ${programaFilter}
            ORDER BY u.nome
        `, [id, data_aula, horario_inicio, ...extraParams]);

        console.log(`[FREQUENCIA] Turma ${id} (${turma.nome}, programa: ${turma.programa}): ${alunos.length} alunos encontrados`);

        res.json(alunos);
    } catch (error) {
        console.error('Erro ao buscar alunos da turma:', error);
        res.status(500).json({ error: 'Erro ao buscar alunos' });
    }
});

// ========== ESTATÍSTICAS ==========

// Estatísticas de frequência por aluno
router.get('/aluno/:id/estatisticas', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { mes, ano } = req.query;

        let whereClause = 'WHERE aluno_id = ?';
        const params = [id];

        if (mes && ano) {
            whereClause += ' AND MONTH(data_aula) = ? AND YEAR(data_aula) = ?';
            params.push(mes, ano);
        }

        const stats = await db.query(`
            SELECT
                COUNT(*) AS total_aulas,
                SUM(presente) AS total_presencas,
                COUNT(*) - SUM(presente) AS total_faltas,
                ROUND((SUM(presente) / COUNT(*)) * 100, 2) AS percentual_presenca
            FROM frequencia
            ${whereClause}
        `, params);

        res.json(stats[0] || {
            total_aulas: 0,
            total_presencas: 0,
            total_faltas: 0,
            percentual_presenca: 0
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Estatísticas gerais de frequência
router.get('/estatisticas', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { mes, ano, turma_id } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        // Total de presenças no período
        const presencas = await db.query(`
            SELECT
                COUNT(*) AS total_registros,
                SUM(presente) AS total_presencas,
                COUNT(*) - SUM(presente) AS total_faltas,
                ROUND((SUM(presente) / COUNT(*)) * 100, 2) AS taxa_presenca
            FROM frequencia
            WHERE MONTH(data_aula) = ? AND YEAR(data_aula) = ?
        `, [mesAtual, anoAtual]);

        // Alunos com mais faltas
        const maisFaltas = await db.query(`
            SELECT
                al.id,
                u.nome,
                COUNT(*) - SUM(f.presente) AS total_faltas,
                COUNT(*) AS total_aulas,
                ROUND(((COUNT(*) - SUM(f.presente)) / COUNT(*)) * 100, 2) AS taxa_falta
            FROM frequencia f
            INNER JOIN alunos al ON f.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
            WHERE MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?
            GROUP BY al.id, u.nome
            HAVING total_faltas > 0
            ORDER BY total_faltas DESC
            LIMIT 10
        `, [mesAtual, anoAtual]);

        // Frequência por dia da semana
        const porDiaSemana = await db.query(`
            SELECT
                DAYNAME(data_aula) AS dia_semana,
                COUNT(*) AS total_aulas,
                SUM(presente) AS presencas,
                ROUND((SUM(presente) / COUNT(*)) * 100, 2) AS taxa_presenca
            FROM frequencia
            WHERE MONTH(data_aula) = ? AND YEAR(data_aula) = ?
            GROUP BY DAYOFWEEK(data_aula), DAYNAME(data_aula)
            ORDER BY DAYOFWEEK(data_aula)
        `, [mesAtual, anoAtual]);

        res.json({
            resumo: presencas[0],
            alunos_mais_faltas: maisFaltas,
            por_dia_semana: porDiaSemana
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas gerais:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ========== RELATÓRIOS ==========

// Relatório de frequência mensal
router.get('/relatorio/mensal', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { mes, ano, turma_id } = req.query;

        if (!mes || !ano) {
            return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
        }

        let query = `
            SELECT
                al.id AS aluno_id,
                u.nome AS aluno_nome,
                COUNT(*) AS total_aulas,
                SUM(f.presente) AS presencas,
                COUNT(*) - SUM(f.presente) AS faltas,
                ROUND((SUM(f.presente) / COUNT(*)) * 100, 2) AS percentual_presenca
            FROM frequencia f
            INNER JOIN alunos al ON f.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
        `;

        const params = [];

        if (turma_id) {
            query += `
                INNER JOIN alunos_turmas at ON al.id = at.aluno_id
                WHERE at.turma_id = ?
                AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?
            `;
            params.push(turma_id, mes, ano);
        } else {
            query += ' WHERE MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mes, ano);
        }

        query += ' GROUP BY al.id, u.nome ORDER BY u.nome';

        const relatorio = await db.query(query, params);
        res.json(relatorio);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

// Relatório detalhado por período
router.get('/relatorio/detalhado', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { data_inicio, data_fim, aluno_id, turma_id } = req.query;

        if (!data_inicio || !data_fim) {
            return res.status(400).json({ error: 'Data início e fim são obrigatórias' });
        }

        let query = `
            SELECT
                f.*,
                ua.nome AS aluno_nome,
                ua.email AS aluno_email,
                up.nome AS professor_nome
            FROM frequencia f
            INNER JOIN alunos al ON f.aluno_id = al.id
            INNER JOIN usuarios ua ON al.usuario_id = ua.id
            LEFT JOIN professores p ON f.professor_id = p.id
            LEFT JOIN usuarios up ON p.usuario_id = up.id
            WHERE f.data_aula BETWEEN ? AND ?
        `;

        const params = [data_inicio, data_fim];

        if (aluno_id) {
            query += ' AND f.aluno_id = ?';
            params.push(aluno_id);
        }

        if (turma_id) {
            query += `
                AND al.id IN (
                    SELECT aluno_id FROM alunos_turmas WHERE turma_id = ?
                )
            `;
            params.push(turma_id);
        }

        query += ' ORDER BY f.data_aula DESC, ua.nome';

        const relatorio = await db.query(query, params);
        res.json(relatorio);
    } catch (error) {
        console.error('Erro ao gerar relatório detalhado:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

// ========== VALIDAÇÃO DE PRESENÇAS ==========

/**
 * GET /api/frequencia/pendentes-validacao
 * Listar todas as presenças pendentes de validação
 */
router.get('/pendentes-validacao', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        console.log('=== [BACKEND] GET /pendentes-validacao ===');
        console.log('[BACKEND] Query params:', req.query);
        console.log('[BACKEND] User:', req.user?.nome, `(${req.user?.tipo_usuario})`);

        const { turma_id, data_inicio, data_fim } = req.query;

        let query = `
            SELECT
                f.id,
                f.data_aula,
                f.turma_id,
                f.aluno_id,
                f.presente,
                f.tipo_registro,
                f.status_validacao,
                f.created_at,
                u.nome as aluno_nome,
                u.email as aluno_email,
                t.nome as turma_nome,
                t.dia_semana,
                t.horario_inicio,
                t.horario_fim,
                t.programa
            FROM frequencia f
            INNER JOIN alunos al ON f.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
            INNER JOIN turmas t ON f.turma_id = t.id
            WHERE f.status_validacao = 'pendente'
        `;

        const params = [];

        if (turma_id) {
            query += ' AND f.turma_id = ?';
            params.push(turma_id);
        }

        if (data_inicio) {
            query += ' AND f.data_aula >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND f.data_aula <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY f.data_aula DESC, f.created_at DESC';

        console.log('[BACKEND] Executando query...');
        console.log('[BACKEND] Params:', params);
        const presencas = await db.query(query, params);

        console.log('[BACKEND] ✅ Query executada com sucesso');
        console.log('[BACKEND] Total de presenças pendentes:', presencas.length);
        if (presencas.length > 0) {
            console.log('[BACKEND] Primeira presença:', presencas[0]);
        }

        const response = {
            total: presencas.length,
            presencas
        };

        console.log('[BACKEND] Estrutura da resposta:', {
            total: response.total,
            presencas_length: response.presencas.length,
            has_presencas_array: Array.isArray(response.presencas)
        });

        console.log('[BACKEND] Enviando resposta com status 200...');
        console.log('==========================================');

        res.json(response);
    } catch (error) {
        console.error('[BACKEND] ❌ Erro ao buscar presenças pendentes:', error);
        console.error('[BACKEND] Stack:', error.stack);
        res.status(500).json({ error: 'Erro ao buscar presenças pendentes' });
    }
});

/**
 * POST /api/frequencia/validar/:id
 * Validar ou rejeitar uma presença registrada por aluno
 */
router.post('/validar/:id', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status_validacao, observacoes } = req.body;

        // Validar status
        if (!['validado', 'rejeitado'].includes(status_validacao)) {
            return res.status(400).json({
                error: 'Status de validação inválido. Use "validado" ou "rejeitado"'
            });
        }

        // Buscar registro de frequência
        console.log('[VALIDAÇÃO BACKEND] Buscando registro com ID:', id);

        const registros = await db.query(`
            SELECT
                f.id,
                f.data_aula,
                f.turma_id,
                f.aluno_id,
                f.presente,
                f.tipo_registro,
                f.status_validacao,
                f.observacoes,
                f.created_at,
                a.nome as aluno_nome,
                t.nome as turma_nome
            FROM frequencia f
            LEFT JOIN alunos al ON f.aluno_id = al.id
            LEFT JOIN usuarios a ON al.usuario_id = a.id
            LEFT JOIN turmas t ON f.turma_id = t.id
            WHERE f.id = ?
        `, [id]);

        console.log('[VALIDAÇÃO BACKEND] Query executada. Resultados:', registros.length);
        console.log('[VALIDAÇÃO BACKEND] Registro encontrado:', registros.length > 0 ? JSON.stringify(registros[0]) : 'NENHUM');

        if (registros.length === 0) {
            return res.status(404).json({ error: 'Registro de frequência não encontrado' });
        }

        const registro = registros[0];

        console.log('[VALIDAÇÃO BACKEND] tipo_registro:', registro.tipo_registro);
        console.log('[VALIDAÇÃO BACKEND] status_validacao atual:', registro.status_validacao);

        // Verificar se é um registro de aluno (tratamento defensivo)
        if (registro.tipo_registro && registro.tipo_registro !== 'aluno') {
            return res.status(400).json({
                error: 'Apenas registros feitos por alunos podem ser validados'
            });
        }

        // Se for rejeitado, marcar como falta
        const presente = status_validacao === 'validado' ? true : false;

        console.log('[VALIDAÇÃO BACKEND] Atualizando registro:', {
            id,
            status_validacao,
            presente,
            validado_por: req.user.id
        });

        // Atualizar status de validação
        await db.query(`
            UPDATE frequencia
            SET status_validacao = ?,
                presente = ?,
                validado_por_id = ?,
                validado_em = NOW(),
                observacoes = CONCAT(COALESCE(observacoes, ''), ?)
            WHERE id = ?
        `, [
            status_validacao,
            presente,
            req.user.id,
            observacoes ? `\n[${status_validacao === 'validado' ? 'Validado' : 'Rejeitado'} por ${req.user.nome || 'admin'}]: ${observacoes}` : '',
            id
        ]);

        console.log('[VALIDAÇÃO BACKEND] ✅ Registro atualizado com sucesso');

        res.json({
            message: `Presença ${status_validacao === 'validado' ? 'validada' : 'rejeitada'} com sucesso`,
            registro: {
                id,
                aluno_nome: registro.aluno_nome,
                turma_nome: registro.turma_nome,
                data_aula: registro.data_aula,
                status_validacao,
                presente
            }
        });
    } catch (error) {
        console.error('Erro ao validar presença:', error);
        res.status(500).json({ error: 'Erro ao validar presença' });
    }
});

/**
 * GET /api/frequencia/turma/:turma_id/dia/:data
 * Visualizar todos os registros de presença de uma turma em um dia específico
 */
router.get('/turma/:turma_id/dia/:data', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { turma_id, data } = req.params;

        // Buscar informações da turma
        const turmas = await db.query(`
            SELECT id, nome, dia_semana, horario_inicio, horario_fim, programa, capacidade_maxima
            FROM turmas
            WHERE id = ?
        `, [turma_id]);

        if (turmas.length === 0) {
            return res.status(404).json({ error: 'Turma não encontrada' });
        }

        const turma = turmas[0];

        // Buscar todos os alunos matriculados na turma
        const alunosMatriculados = await db.query(`
            SELECT
                al.id as aluno_id,
                u.nome as aluno_nome,
                u.email as aluno_email,
                al.programa,
                gs.nome as graduacao_nome,
                gs.cor as graduacao_cor
            FROM alunos_turmas at
            INNER JOIN alunos al ON at.aluno_id = al.id
            INNER JOIN usuarios u ON al.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gs ON al.graduacao_atual_id = gs.id
            WHERE at.turma_id = ? AND at.status = 'ativo'
            ORDER BY u.nome
        `, [turma_id]);

        // Buscar registros de frequência para este dia
        const frequencias = await db.query(`
            SELECT
                f.id,
                f.aluno_id,
                f.presente,
                f.tipo_registro,
                f.status_validacao,
                f.observacoes,
                f.created_at
            FROM frequencia f
            WHERE f.turma_id = ? AND DATE(f.data_aula) = ?
        `, [turma_id, data]);

        // Criar mapa de frequências por aluno_id
        const frequenciaMap = {};
        frequencias.forEach(f => {
            frequenciaMap[f.aluno_id] = f;
        });

        // Combinar alunos com suas frequências
        const registros = alunosMatriculados.map(aluno => {
            const freq = frequenciaMap[aluno.aluno_id];
            return {
                ...aluno,
                frequencia: freq ? {
                    id: freq.id,
                    presente: freq.presente,
                    tipo_registro: freq.tipo_registro,
                    status_validacao: freq.status_validacao,
                    observacoes: freq.observacoes,
                    registrado_em: freq.created_at
                } : null,
                registrado: !!freq
            };
        });

        // Calcular estatísticas
        const total_alunos = alunosMatriculados.length;
        const total_registrado = registros.filter(r => r.registrado).length;
        const total_presentes = registros.filter(r => r.frequencia && r.frequencia.presente).length;
        const total_pendentes = registros.filter(r => r.frequencia && r.frequencia.status_validacao === 'pendente').length;
        const total_validados = registros.filter(r => r.frequencia && r.frequencia.status_validacao === 'validado').length;
        const total_rejeitados = registros.filter(r => r.frequencia && r.frequencia.status_validacao === 'rejeitado').length;

        res.json({
            turma,
            data,
            estatisticas: {
                total_alunos,
                total_registrado,
                total_presentes,
                total_pendentes,
                total_validados,
                total_rejeitados,
                percentual_presenca: total_alunos > 0 ? ((total_presentes / total_alunos) * 100).toFixed(1) : 0
            },
            registros
        });
    } catch (error) {
        console.error('Erro ao buscar registros da turma:', error);
        res.status(500).json({ error: 'Erro ao buscar registros da turma' });
    }
});

module.exports = router;
