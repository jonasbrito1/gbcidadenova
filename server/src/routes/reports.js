const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, adminOrTeacher } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Relatório financeiro
router.get('/financeiro', adminOrTeacher, async (req, res) => {
    try {
        const { dataInicio, dataFim } = req.query;

        const financeiro = await query(`
            SELECT
                DATE_FORMAT(p.data_pagamento, '%Y-%m') as mes,
                SUM(CASE WHEN p.status = 'pago' THEN p.valor_pago ELSE 0 END) as receita,
                COUNT(CASE WHEN p.status = 'pago' THEN 1 END) as pagamentos_realizados,
                COUNT(CASE WHEN p.status = 'pendente' THEN 1 END) as pagamentos_pendentes,
                SUM(CASE WHEN p.status = 'pendente' THEN p.valor ELSE 0 END) as valor_pendente
            FROM pagamentos p
            WHERE (? IS NULL OR p.data_pagamento >= ?)
            AND (? IS NULL OR p.data_pagamento <= ?)
            GROUP BY DATE_FORMAT(p.data_pagamento, '%Y-%m')
            ORDER BY mes DESC
        `, [dataInicio, dataInicio, dataFim, dataFim]);

        res.json(financeiro);

    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;