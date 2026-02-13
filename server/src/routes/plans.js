const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Listar planos (ROTA PÚBLICA - sem autenticação)
router.get('/', async (req, res) => {
    try {
        const plans = await query(`
            SELECT id, nome, descricao, valor_mensal, valor_total, valor_avista,
                   duracao_meses, tipo, destaque, beneficios, status
            FROM planos
            WHERE status = 'ativo'
            ORDER BY duracao_meses, valor_mensal
        `);

        res.json(plans);
    } catch (error) {
        console.error('Erro ao buscar planos:', error);
        res.status(500).json({ error: 'Erro ao buscar planos' });
    }
});

// Rotas protegidas
router.use(authenticateToken);

// Listar TODOS os planos (apenas admin)
router.get('/all', adminOnly, async (req, res) => {
    try {
        const plans = await query(`
            SELECT id, nome, descricao, valor_mensal, valor_total, valor_avista,
                   duracao_meses, tipo, destaque, beneficios, status
            FROM planos
            ORDER BY duracao_meses, valor_mensal
        `);

        res.json(plans);
    } catch (error) {
        console.error('Erro ao buscar planos:', error);
        res.status(500).json({ error: 'Erro ao buscar planos' });
    }
});

// Criar plano (apenas admin)
router.post('/', adminOnly, async (req, res) => {
    try {
        const {
            nome, descricao, valor_mensal, valor_total, valor_avista,
            duracao_meses, tipo, destaque, beneficios
        } = req.body;

        const result = await query(`
            INSERT INTO planos (
                nome, descricao, valor_mensal, valor_total, valor_avista,
                duracao_meses, tipo, destaque, beneficios, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
        `, [
            nome, descricao, valor_mensal, valor_total, valor_avista,
            duracao_meses, tipo, destaque || false,
            beneficios ? JSON.stringify(beneficios) : null
        ]);

        res.status(201).json({
            message: 'Plano criado com sucesso',
            plano_id: result.insertId
        });
    } catch (error) {
        console.error('Erro ao criar plano:', error);
        res.status(500).json({ error: 'Erro ao criar plano' });
    }
});

// Atualizar plano (apenas admin)
router.put('/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome, descricao, valor_mensal, valor_total, valor_avista,
            duracao_meses, tipo, destaque, beneficios, status
        } = req.body;

        await query(`
            UPDATE planos
            SET nome = ?, descricao = ?, valor_mensal = ?, valor_total = ?,
                valor_avista = ?, duracao_meses = ?, tipo = ?, destaque = ?,
                beneficios = ?, status = ?
            WHERE id = ?
        `, [
            nome, descricao, valor_mensal, valor_total, valor_avista,
            duracao_meses, tipo, destaque || false,
            beneficios ? JSON.stringify(beneficios) : null,
            status || 'ativo',
            id
        ]);

        res.json({ message: 'Plano atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar plano:', error);
        res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
});

// Deletar plano (apenas admin)
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        await query('DELETE FROM planos WHERE id = ?', [id]);

        res.json({ message: 'Plano deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar plano:', error);
        res.status(500).json({ error: 'Erro ao deletar plano' });
    }
});

module.exports = router;
