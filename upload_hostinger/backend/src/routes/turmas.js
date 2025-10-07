const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar todas as turmas
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, professor_id, programa, dia_semana } = req.query;

        let query = `
            SELECT
                t.*,
                p.id AS professor_id,
                u.nome AS professor_nome,
                COUNT(DISTINCT at.aluno_id) AS total_alunos,
                gmin.nome AS graduacao_minima,
                gmax.nome AS graduacao_maxima
            FROM turmas t
            LEFT JOIN professores p ON t.professor_id = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN alunos_turmas at ON t.id = at.turma_id AND at.status = 'ativo'
            LEFT JOIN graduacoes_sistema gmin ON t.graduacao_minima_id = gmin.id
            LEFT JOIN graduacoes_sistema gmax ON t.graduacao_maxima_id = gmax.id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (professor_id) {
            query += ' AND t.professor_id = ?';
            params.push(professor_id);
        }

        if (programa) {
            query += ' AND t.programa = ?';
            params.push(programa);
        }

        if (dia_semana) {
            query += ' AND t.dia_semana = ?';
            params.push(dia_semana);
        }

        query += `
            GROUP BY t.id
            ORDER BY
                FIELD(t.dia_semana, 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'),
                t.horario_inicio
        `;

        const [turmas] = await db.query(query, params);

        res.json(turmas);
    } catch (error) {
        console.error('Erro ao buscar turmas:', error);
        res.status(500).json({ error: 'Erro ao buscar turmas' });
    }
});

// Buscar turma por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [turmas] = await db.query(`
            SELECT
                t.*,
                p.id AS professor_id,
                u.nome AS professor_nome,
                u.email AS professor_email,
                gmin.nome AS graduacao_minima,
                gmin.cor AS cor_graduacao_minima,
                gmax.nome AS graduacao_maxima,
                gmax.cor AS cor_graduacao_maxima,
                COUNT(DISTINCT at.aluno_id) AS total_alunos
            FROM turmas t
            LEFT JOIN professores p ON t.professor_id = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN graduacoes_sistema gmin ON t.graduacao_minima_id = gmin.id
            LEFT JOIN graduacoes_sistema gmax ON t.graduacao_maxima_id = gmax.id
            LEFT JOIN alunos_turmas at ON t.id = at.turma_id AND at.status = 'ativo'
            WHERE t.id = ?
            GROUP BY t.id
        `, [req.params.id]);

        if (turmas.length === 0) {
            return res.status(404).json({ error: 'Turma não encontrada' });
        }

        res.json(turmas[0]);
    } catch (error) {
        console.error('Erro ao buscar turma:', error);
        res.status(500).json({ error: 'Erro ao buscar turma' });
    }
});

// Buscar alunos de uma turma
router.get('/:id/alunos', authenticateToken, async (req, res) => {
    try {
        const [alunos] = await db.query(`
            SELECT
                a.*,
                at.data_matricula,
                at.status AS status_matricula,
                g.nome AS graduacao,
                g.cor AS cor_graduacao
            FROM alunos_turmas at
            INNER JOIN alunos a ON at.aluno_id = a.id
            LEFT JOIN graduacoes_sistema g ON a.graduacao_atual = g.id
            WHERE at.turma_id = ?
            ORDER BY a.nome
        `, [req.params.id]);

        res.json(alunos);
    } catch (error) {
        console.error('Erro ao buscar alunos da turma:', error);
        res.status(500).json({ error: 'Erro ao buscar alunos da turma' });
    }
});

// Criar nova turma
router.post('/', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const {
            nome,
            professor_id,
            graduacao_minima_id,
            graduacao_maxima_id,
            programa,
            dia_semana,
            horario_inicio,
            horario_fim,
            capacidade_maxima
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO turmas (
                nome, professor_id, graduacao_minima_id, graduacao_maxima_id,
                programa, dia_semana, horario_inicio, horario_fim, capacidade_maxima
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nome, professor_id, graduacao_minima_id, graduacao_maxima_id, programa, dia_semana, horario_inicio, horario_fim, capacidade_maxima]);

        res.status(201).json({
            id: result.insertId,
            message: 'Turma criada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar turma:', error);
        res.status(500).json({ error: 'Erro ao criar turma' });
    }
});

// Atualizar turma
router.put('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        const {
            nome,
            professor_id,
            graduacao_minima_id,
            graduacao_maxima_id,
            programa,
            dia_semana,
            horario_inicio,
            horario_fim,
            capacidade_maxima,
            status
        } = req.body;

        await db.query(`
            UPDATE turmas
            SET nome = ?, professor_id = ?, graduacao_minima_id = ?, graduacao_maxima_id = ?,
                programa = ?, dia_semana = ?, horario_inicio = ?, horario_fim = ?,
                capacidade_maxima = ?, status = ?
            WHERE id = ?
        `, [nome, professor_id, graduacao_minima_id, graduacao_maxima_id, programa, dia_semana, horario_inicio, horario_fim, capacidade_maxima, status, req.params.id]);

        res.json({ message: 'Turma atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar turma:', error);
        res.status(500).json({ error: 'Erro ao atualizar turma' });
    }
});

// Deletar turma (inativar)
router.delete('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        await db.query('UPDATE turmas SET status = ? WHERE id = ?', ['inativo', req.params.id]);
        res.json({ message: 'Turma inativada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar turma:', error);
        res.status(500).json({ error: 'Erro ao deletar turma' });
    }
});

// Adicionar aluno à turma
router.post('/:id/alunos', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
    try {
        const { aluno_id } = req.body;
        const turma_id = req.params.id;

        // Verificar se já está matriculado
        const [existing] = await db.query(
            'SELECT * FROM alunos_turmas WHERE aluno_id = ? AND turma_id = ?',
            [aluno_id, turma_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Aluno já está matriculado nesta turma' });
        }

        // Verificar capacidade da turma
        const [turma] = await db.query(`
            SELECT
                t.capacidade_maxima,
                COUNT(at.aluno_id) AS total_alunos
            FROM turmas t
            LEFT JOIN alunos_turmas at ON t.id = at.turma_id AND at.status = 'ativo'
            WHERE t.id = ?
            GROUP BY t.id
        `, [turma_id]);

        if (turma[0] && turma[0].total_alunos >= turma[0].capacidade_maxima) {
            return res.status(400).json({ error: 'Turma com capacidade máxima atingida' });
        }

        // Adicionar aluno
        await db.query(`
            INSERT INTO alunos_turmas (aluno_id, turma_id, data_matricula, status)
            VALUES (?, ?, CURDATE(), 'ativo')
        `, [aluno_id, turma_id]);

        res.status(201).json({ message: 'Aluno adicionado à turma com sucesso' });
    } catch (error) {
        console.error('Erro ao adicionar aluno:', error);
        res.status(500).json({ error: 'Erro ao adicionar aluno à turma' });
    }
});

// Remover aluno da turma
router.delete('/:id/alunos/:aluno_id', authenticateToken, authorize(['admin', 'professor']), async (req, res) => {
    try {
        await db.query(`
            UPDATE alunos_turmas
            SET status = 'inativo'
            WHERE turma_id = ? AND aluno_id = ?
        `, [req.params.id, req.params.aluno_id]);

        res.json({ message: 'Aluno removido da turma com sucesso' });
    } catch (error) {
        console.error('Erro ao remover aluno:', error);
        res.status(500).json({ error: 'Erro ao remover aluno da turma' });
    }
});

// Obter grade de horários
router.get('/grade/horarios', authenticateToken, async (req, res) => {
    try {
        const [turmas] = await db.query(`
            SELECT
                t.*,
                u.nome AS professor_nome,
                COUNT(DISTINCT at.aluno_id) AS total_alunos
            FROM turmas t
            LEFT JOIN professores p ON t.professor_id = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN alunos_turmas at ON t.id = at.turma_id AND at.status = 'ativo'
            WHERE t.status = 'ativo'
            GROUP BY t.id
            ORDER BY
                FIELD(t.dia_semana, 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'),
                t.horario_inicio
        `);

        // Organizar em grade de horários
        const grade = {
            segunda: [],
            terca: [],
            quarta: [],
            quinta: [],
            sexta: [],
            sabado: [],
            domingo: []
        };

        turmas.forEach(turma => {
            if (grade[turma.dia_semana]) {
                grade[turma.dia_semana].push(turma);
            }
        });

        res.json(grade);
    } catch (error) {
        console.error('Erro ao buscar grade de horários:', error);
        res.status(500).json({ error: 'Erro ao buscar grade de horários' });
    }
});

module.exports = router;
