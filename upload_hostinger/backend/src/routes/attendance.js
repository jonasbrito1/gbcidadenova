const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Registrar presença
router.post('/', [
    adminOrTeacher,
    body('aluno_id').isInt().withMessage('ID do aluno inválido'),
    body('data_aula').isISO8601().withMessage('Data da aula inválida'),
    body('horario_inicio').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inválido'),
    body('presente').isBoolean().withMessage('Presença deve ser verdadeiro ou falso')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { aluno_id, data_aula, horario_inicio, horario_fim, presente, observacoes } = req.body;

        // Verificar se já existe registro para este aluno nesta data/horário
        const existing = await query(`
            SELECT id FROM frequencia
            WHERE aluno_id = ? AND data_aula = ? AND horario_inicio = ?
        `, [aluno_id, data_aula, horario_inicio]);

        if (existing.length > 0) {
            // Atualizar registro existente
            await query(`
                UPDATE frequencia
                SET presente = ?, observacoes = ?, horario_fim = ?
                WHERE id = ?
            `, [presente, observacoes, horario_fim, existing[0].id]);

            res.json({ message: 'Presença atualizada com sucesso' });
        } else {
            // Criar novo registro
            await query(`
                INSERT INTO frequencia (aluno_id, professor_id, data_aula, horario_inicio, horario_fim, presente, observacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [aluno_id, req.user.tipo_usuario === 'professor' ? req.user.id : null, data_aula, horario_inicio, horario_fim, presente, observacoes]);

            res.status(201).json({ message: 'Presença registrada com sucesso' });
        }

        logger.info(`Presença registrada: Aluno ${aluno_id} em ${data_aula} por ${req.user.email}`);

    } catch (error) {
        logger.error('Erro ao registrar presença:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar frequência por aluno
router.get('/aluno/:id', adminOrTeacher, async (req, res) => {
    try {
        const { id } = req.params;
        const { mes, ano } = req.query;

        let whereClause = 'WHERE f.aluno_id = ?';
        const params = [id];

        if (mes && ano) {
            whereClause += ' AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mes, ano);
        }

        const attendance = await query(`
            SELECT
                f.*,
                prof_user.nome as professor_nome
            FROM frequencia f
            LEFT JOIN professores prof ON f.professor_id = prof.id
            LEFT JOIN usuarios prof_user ON prof.usuario_id = prof_user.id
            ${whereClause}
            ORDER BY f.data_aula DESC, f.horario_inicio DESC
        `, params);

        res.json(attendance);

    } catch (error) {
        logger.error('Erro ao buscar frequência:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;