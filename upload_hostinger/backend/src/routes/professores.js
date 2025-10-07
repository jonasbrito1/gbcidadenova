const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar todos os professores
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = `
            SELECT
                p.*,
                u.nome,
                u.email,
                u.telefone,
                u.foto_url,
                g.nome AS graduacao,
                g.cor AS cor_graduacao,
                COUNT(DISTINCT t.id) AS total_turmas,
                COUNT(DISTINCT at.aluno_id) AS total_alunos
            FROM professores p
            INNER JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN graduacoes_sistema g ON p.graduacao_id = g.id
            LEFT JOIN turmas t ON p.id = t.professor_id AND t.status = 'ativo'
            LEFT JOIN alunos_turmas at ON t.id = at.turma_id AND at.status = 'ativo'
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (u.nome LIKE ? OR u.email LIKE ? OR p.especialidades LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' GROUP BY p.id ORDER BY u.nome';

        const [professores] = await db.query(query, params);

        res.json(professores);
    } catch (error) {
        console.error('Erro ao buscar professores:', error);
        res.status(500).json({ error: 'Erro ao buscar professores' });
    }
});

// Buscar professor por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [professores] = await db.query(`
            SELECT
                p.*,
                u.nome,
                u.email,
                u.telefone,
                u.cpf,
                u.data_nascimento,
                u.endereco,
                u.cidade,
                u.estado,
                u.cep,
                u.foto_url,
                g.nome AS graduacao,
                g.cor AS cor_graduacao
            FROM professores p
            INNER JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN graduacoes_sistema g ON p.graduacao_id = g.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (professores.length === 0) {
            return res.status(404).json({ error: 'Professor não encontrado' });
        }

        res.json(professores[0]);
    } catch (error) {
        console.error('Erro ao buscar professor:', error);
        res.status(500).json({ error: 'Erro ao buscar professor' });
    }
});

// Buscar turmas de um professor
router.get('/:id/turmas', authenticateToken, async (req, res) => {
    try {
        const [turmas] = await db.query(`
            SELECT
                t.*,
                COUNT(DISTINCT at.aluno_id) AS total_alunos,
                gmin.nome AS graduacao_minima,
                gmax.nome AS graduacao_maxima
            FROM turmas t
            LEFT JOIN alunos_turmas at ON t.id = at.turma_id AND at.status = 'ativo'
            LEFT JOIN graduacoes_sistema gmin ON t.graduacao_minima_id = gmin.id
            LEFT JOIN graduacoes_sistema gmax ON t.graduacao_maxima_id = gmax.id
            WHERE t.professor_id = ?
            GROUP BY t.id
            ORDER BY
                FIELD(t.dia_semana, 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'),
                t.horario_inicio
        `, [req.params.id]);

        res.json(turmas);
    } catch (error) {
        console.error('Erro ao buscar turmas:', error);
        res.status(500).json({ error: 'Erro ao buscar turmas do professor' });
    }
});

// Buscar alunos de um professor
router.get('/:id/alunos', authenticateToken, async (req, res) => {
    try {
        const [alunos] = await db.query(`
            SELECT DISTINCT
                a.id,
                a.nome,
                a.email,
                a.telefone,
                a.data_nascimento,
                a.graduacao_atual,
                a.foto_url,
                a.status,
                g.nome AS graduacao,
                g.cor AS cor_graduacao,
                GROUP_CONCAT(DISTINCT t.nome ORDER BY t.nome SEPARATOR ', ') AS turmas
            FROM alunos a
            INNER JOIN alunos_turmas at ON a.id = at.aluno_id
            INNER JOIN turmas t ON at.turma_id = t.id
            LEFT JOIN graduacoes_sistema g ON a.graduacao_atual = g.id
            WHERE t.professor_id = ? AND at.status = 'ativo'
            GROUP BY a.id
            ORDER BY a.nome
        `, [req.params.id]);

        res.json(alunos);
    } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        res.status(500).json({ error: 'Erro ao buscar alunos do professor' });
    }
});

// Buscar frequência dos alunos de um professor
router.get('/:id/frequencia', authenticateToken, async (req, res) => {
    try {
        const { data_inicio, data_fim, turma_id } = req.query;

        let query = `
            SELECT
                f.*,
                a.nome AS aluno_nome,
                a.foto_url AS aluno_foto,
                t.nome AS turma_nome,
                u.nome AS professor_nome
            FROM frequencia f
            INNER JOIN alunos a ON f.aluno_id = a.id
            INNER JOIN turmas t ON f.turma_id = t.id
            INNER JOIN professores p ON t.professor_id = p.id
            INNER JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = ?
        `;

        const params = [req.params.id];

        if (data_inicio) {
            query += ' AND f.data >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND f.data <= ?';
            params.push(data_fim);
        }

        if (turma_id) {
            query += ' AND f.turma_id = ?';
            params.push(turma_id);
        }

        query += ' ORDER BY f.data DESC, t.nome, a.nome';

        const [frequencias] = await db.query(query, params);

        res.json(frequencias);
    } catch (error) {
        console.error('Erro ao buscar frequência:', error);
        res.status(500).json({ error: 'Erro ao buscar frequência' });
    }
});

// Estatísticas do professor
router.get('/:id/estatisticas', authenticateToken, async (req, res) => {
    try {
        const professorId = req.params.id;

        // Total de turmas
        const [turmas] = await db.query(`
            SELECT COUNT(*) AS total
            FROM turmas
            WHERE professor_id = ? AND status = 'ativo'
        `, [professorId]);

        // Total de alunos
        const [alunos] = await db.query(`
            SELECT COUNT(DISTINCT a.id) AS total
            FROM alunos a
            INNER JOIN alunos_turmas at ON a.id = at.aluno_id
            INNER JOIN turmas t ON at.turma_id = t.id
            WHERE t.professor_id = ? AND at.status = 'ativo'
        `, [professorId]);

        // Frequência média (últimos 30 dias)
        const [frequencia] = await db.query(`
            SELECT
                AVG(CASE WHEN f.presente = 1 THEN 1 ELSE 0 END) * 100 AS media_presenca
            FROM frequencia f
            INNER JOIN turmas t ON f.turma_id = t.id
            WHERE t.professor_id = ?
            AND f.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `, [professorId]);

        // Aulas ministradas (últimos 30 dias)
        const [aulas] = await db.query(`
            SELECT COUNT(DISTINCT DATE(f.data)) AS total
            FROM frequencia f
            INNER JOIN turmas t ON f.turma_id = t.id
            WHERE t.professor_id = ?
            AND f.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `, [professorId]);

        res.json({
            total_turmas: turmas[0].total,
            total_alunos: alunos[0].total,
            media_frequencia: parseFloat(frequencia[0].media_presenca || 0).toFixed(2),
            aulas_mes: aulas[0].total
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Criar novo professor
router.post('/', authenticateToken, authorize(['admin']), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            nome,
            email,
            telefone,
            cpf,
            data_nascimento,
            endereco,
            cidade,
            estado,
            cep,
            graduacao_id,
            especialidades,
            biografia,
            certificacoes,
            data_contratacao,
            salario
        } = req.body;

        // Criar usuário
        const [usuario] = await connection.query(`
            INSERT INTO usuarios (nome, email, telefone, cpf, data_nascimento, endereco, cidade, estado, cep, tipo_usuario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'professor')
        `, [nome, email, telefone, cpf, data_nascimento, endereco, cidade, estado, cep]);

        // Criar professor
        const [professor] = await connection.query(`
            INSERT INTO professores (
                usuario_id, graduacao_id, especialidades, biografia,
                certificacoes, data_contratacao, salario
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [usuario.insertId, graduacao_id, especialidades, biografia, certificacoes, data_contratacao, salario]);

        await connection.commit();

        res.status(201).json({
            id: professor.insertId,
            usuario_id: usuario.insertId,
            message: 'Professor criado com sucesso'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao criar professor:', error);
        res.status(500).json({ error: 'Erro ao criar professor' });
    } finally {
        connection.release();
    }
});

// Atualizar professor
router.put('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            nome,
            email,
            telefone,
            cpf,
            data_nascimento,
            endereco,
            cidade,
            estado,
            cep,
            graduacao_id,
            especialidades,
            biografia,
            certificacoes,
            data_contratacao,
            salario,
            status
        } = req.body;

        // Buscar usuario_id
        const [professor] = await connection.query('SELECT usuario_id FROM professores WHERE id = ?', [req.params.id]);

        if (professor.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Professor não encontrado' });
        }

        // Atualizar usuário
        await connection.query(`
            UPDATE usuarios
            SET nome = ?, email = ?, telefone = ?, cpf = ?, data_nascimento = ?,
                endereco = ?, cidade = ?, estado = ?, cep = ?
            WHERE id = ?
        `, [nome, email, telefone, cpf, data_nascimento, endereco, cidade, estado, cep, professor[0].usuario_id]);

        // Atualizar professor
        await connection.query(`
            UPDATE professores
            SET graduacao_id = ?, especialidades = ?, biografia = ?,
                certificacoes = ?, data_contratacao = ?, salario = ?, status = ?
            WHERE id = ?
        `, [graduacao_id, especialidades, biografia, certificacoes, data_contratacao, salario, status, req.params.id]);

        await connection.commit();

        res.json({ message: 'Professor atualizado com sucesso' });
    } catch (error) {
        await connection.rollback();
        console.error('Erro ao atualizar professor:', error);
        res.status(500).json({ error: 'Erro ao atualizar professor' });
    } finally {
        connection.release();
    }
});

// Deletar professor (inativar)
router.delete('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
    try {
        await db.query('UPDATE professores SET status = ? WHERE id = ?', ['inativo', req.params.id]);
        res.json({ message: 'Professor inativado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar professor:', error);
        res.status(500).json({ error: 'Erro ao deletar professor' });
    }
});

module.exports = router;
