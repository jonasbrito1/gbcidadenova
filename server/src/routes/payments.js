const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, adminOrTeacher } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Listar pagamentos
router.get('/', adminOrTeacher, async (req, res) => {
    try {
        const { status, mes, ano, page = 1, limit = 20 } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (status) {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }

        if (mes && ano) {
            whereClause += ' AND MONTH(p.mes_referencia) = ? AND YEAR(p.mes_referencia) = ?';
            params.push(mes, ano);
        }

        const offset = (page - 1) * limit;

        const payments = await query(`
            SELECT
                p.*,
                u.nome as aluno_nome,
                a.matricula,
                pl.nome as plano_nome
            FROM pagamentos p
            JOIN alunos a ON p.aluno_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN planos pl ON p.plano_id = pl.id
            ${whereClause}
            ORDER BY p.data_vencimento DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        const [countResult] = await query(`
            SELECT COUNT(*) as total
            FROM pagamentos p
            JOIN alunos a ON p.aluno_id = a.id
            ${whereClause}
        `, params);

        res.json({
            payments,
            total: countResult.total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult.total / limit)
        });

    } catch (error) {
        logger.error('Erro ao buscar pagamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Marcar pagamento como pago
router.put('/:id/pagar', [
    adminOrTeacher,
    body('valor_pago').isFloat({ min: 0 }).withMessage('Valor pago inválido'),
    body('forma_pagamento').isIn(['dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'transferencia', 'boleto']).withMessage('Forma de pagamento inválida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { valor_pago, forma_pagamento, observacoes } = req.body;

        await query(`
            UPDATE pagamentos
            SET status = 'pago',
                valor_pago = ?,
                forma_pagamento = ?,
                data_pagamento = NOW(),
                observacoes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [valor_pago, forma_pagamento, observacoes, id]);

        logger.info(`Pagamento marcado como pago: ID ${id} por ${req.user.email}`);

        res.json({ message: 'Pagamento registrado com sucesso' });

    } catch (error) {
        logger.error('Erro ao registrar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;