const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Listar professores
router.get('/', adminOnly, async (req, res) => {
    try {
        const teachers = await query(`
            SELECT
                p.*,
                u.nome,
                u.email,
                u.telefone,
                g.nome as graduacao_nome,
                g.cor as graduacao_cor
            FROM professores p
            JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN graduacoes_sistema g ON p.graduacao_id = g.id
            WHERE u.tipo_usuario = 'professor'
            ORDER BY u.nome
        `);

        res.json(teachers);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;