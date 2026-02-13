/**
 * Rota temporária para executar migration 007
 * DELETAR após executar
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Rota para executar migration 007
router.post('/execute-migration-007', async (req, res) => {
    try {
        logger.info('Iniciando execução da migration 007...');

        // Ler arquivo SQL
        const sqlFile = path.join(__dirname, '../../migrations/007_create_mensagens_aniversario.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        logger.info('Arquivo SQL lido com sucesso');

        // Executar SQL
        await query(sqlContent);

        logger.info('Migration 007 executada com sucesso!');

        // Verificar se a tabela foi criada
        const [tables] = await query('SHOW TABLES LIKE "mensagens_aniversario_enviadas"');

        if (tables.length > 0) {
            logger.info('Tabela mensagens_aniversario_enviadas criada com sucesso');

            // Mostrar estrutura da tabela
            const [columns] = await query('DESCRIBE mensagens_aniversario_enviadas');

            res.json({
                success: true,
                message: 'Migration 007 executada com sucesso!',
                tableExists: true,
                columns: columns
            });
        } else {
            throw new Error('Tabela não foi criada');
        }

    } catch (error) {
        logger.error('Erro ao executar migration 007:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Rota para verificar se a tabela existe
router.get('/check-migration-007', async (req, res) => {
    try {
        const [tables] = await query('SHOW TABLES LIKE "mensagens_aniversario_enviadas"');

        if (tables.length > 0) {
            const [columns] = await query('DESCRIBE mensagens_aniversario_enviadas');
            res.json({
                success: true,
                tableExists: true,
                columns: columns
            });
        } else {
            res.json({
                success: true,
                tableExists: false,
                message: 'Tabela ainda não foi criada'
            });
        }
    } catch (error) {
        logger.error('Erro ao verificar migration 007:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
