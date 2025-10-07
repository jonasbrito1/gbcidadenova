const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

// ========== REGISTRO DE FREQUÊNCIA ==========

// Registrar presença de múltiplos alunos por turma
router.post('/registrar-turma', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
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
router.post('/registrar', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
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
        const [existing] = await db.query(`
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

// ========== CONSULTAS DE FREQUÊNCIA ==========

// Listar frequências com filtros
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { aluno_id, professor_id, turma_id, data_inicio, data_fim, presente } = req.query;

        let query = `
            SELECT
                f.*,
                a.nome AS aluno_nome,
                a.email AS aluno_email,
                u.nome AS professor_nome
            FROM frequencia f
            INNER JOIN alunos a ON f.aluno_id = a.id
            LEFT JOIN professores p ON f.professor_id = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
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

        const [frequencias] = await db.query(query, params);
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

        const [frequencias] = await db.query(query, params);
        res.json(frequencias);
    } catch (error) {
        console.error('Erro ao buscar frequência do aluno:', error);
        res.status(500).json({ error: 'Erro ao buscar frequência' });
    }
});

// Buscar alunos de uma turma para registro de frequência
router.get('/turma/:id/alunos', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data_aula, horario_inicio } = req.query;

        const [alunos] = await db.query(`
            SELECT
                a.id,
                a.nome,
                a.email,
                g.nome AS graduacao,
                g.cor AS cor_graduacao,
                f.presente,
                f.observacoes
            FROM alunos_turmas at
            INNER JOIN alunos a ON at.aluno_id = a.id
            LEFT JOIN graduacoes g ON a.graduacao_id = g.id
            LEFT JOIN frequencia f ON f.aluno_id = a.id
                AND f.data_aula = ?
                AND f.horario_inicio = ?
            WHERE at.turma_id = ? AND at.status_matricula = 'ativo'
            ORDER BY a.nome
        `, [data_aula, horario_inicio, id]);

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

        const [stats] = await db.query(`
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
router.get('/estatisticas', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
    try {
        const { mes, ano, turma_id } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        // Total de presenças no período
        const [presencas] = await db.query(`
            SELECT
                COUNT(*) AS total_registros,
                SUM(presente) AS total_presencas,
                COUNT(*) - SUM(presente) AS total_faltas,
                ROUND((SUM(presente) / COUNT(*)) * 100, 2) AS taxa_presenca
            FROM frequencia
            WHERE MONTH(data_aula) = ? AND YEAR(data_aula) = ?
        `, [mesAtual, anoAtual]);

        // Alunos com mais faltas
        const [maisFaltas] = await db.query(`
            SELECT
                a.id,
                a.nome,
                COUNT(*) - SUM(f.presente) AS total_faltas,
                COUNT(*) AS total_aulas,
                ROUND(((COUNT(*) - SUM(f.presente)) / COUNT(*)) * 100, 2) AS taxa_falta
            FROM frequencia f
            INNER JOIN alunos a ON f.aluno_id = a.id
            WHERE MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?
            GROUP BY a.id, a.nome
            HAVING total_faltas > 0
            ORDER BY total_faltas DESC
            LIMIT 10
        `, [mesAtual, anoAtual]);

        // Frequência por dia da semana
        const [porDiaSemana] = await db.query(`
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
router.get('/relatorio/mensal', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
    try {
        const { mes, ano, turma_id } = req.query;

        if (!mes || !ano) {
            return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
        }

        let query = `
            SELECT
                a.id AS aluno_id,
                a.nome AS aluno_nome,
                COUNT(*) AS total_aulas,
                SUM(f.presente) AS presencas,
                COUNT(*) - SUM(f.presente) AS faltas,
                ROUND((SUM(f.presente) / COUNT(*)) * 100, 2) AS percentual_presenca
            FROM frequencia f
            INNER JOIN alunos a ON f.aluno_id = a.id
        `;

        const params = [];

        if (turma_id) {
            query += `
                INNER JOIN alunos_turmas at ON a.id = at.aluno_id
                WHERE at.turma_id = ?
                AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?
            `;
            params.push(turma_id, mes, ano);
        } else {
            query += ' WHERE MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mes, ano);
        }

        query += ' GROUP BY a.id, a.nome ORDER BY a.nome';

        const [relatorio] = await db.query(query, params);
        res.json(relatorio);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

// Relatório detalhado por período
router.get('/relatorio/detalhado', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
    try {
        const { data_inicio, data_fim, aluno_id, turma_id } = req.query;

        if (!data_inicio || !data_fim) {
            return res.status(400).json({ error: 'Data início e fim são obrigatórias' });
        }

        let query = `
            SELECT
                f.*,
                a.nome AS aluno_nome,
                a.email AS aluno_email,
                u.nome AS professor_nome
            FROM frequencia f
            INNER JOIN alunos a ON f.aluno_id = a.id
            LEFT JOIN professores p ON f.professor_id = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE f.data_aula BETWEEN ? AND ?
        `;

        const params = [data_inicio, data_fim];

        if (aluno_id) {
            query += ' AND f.aluno_id = ?';
            params.push(aluno_id);
        }

        if (turma_id) {
            query += `
                AND a.id IN (
                    SELECT aluno_id FROM alunos_turmas WHERE turma_id = ?
                )
            `;
            params.push(turma_id);
        }

        query += ' ORDER BY f.data_aula DESC, a.nome';

        const [relatorio] = await db.query(query, params);
        res.json(relatorio);
    } catch (error) {
        console.error('Erro ao gerar relatório detalhado:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

module.exports = router;
