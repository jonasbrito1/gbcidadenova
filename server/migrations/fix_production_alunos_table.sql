-- ========================================
-- CORREÇÃO: Adicionar Campos Faltantes na Tabela Alunos
-- Data: 2025-12-29
-- Descrição: Script seguro para adicionar campos que podem estar faltando em produção
-- Este script usa IF NOT EXISTS para evitar erros se os campos já existirem
-- ========================================

USE u674882802_graciebarra;

-- ========================================
-- 1. VERIFICAR E ADICIONAR CAMPO BOLSISTA
-- ========================================

-- Verificar se coluna bolsista existe
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
    AND TABLE_NAME = 'alunos'
    AND COLUMN_NAME = 'bolsista'
);

-- Adicionar coluna bolsista se não existir
SET @sql_add_bolsista = IF(
    @col_exists = 0,
    'ALTER TABLE alunos ADD COLUMN bolsista TINYINT(1) DEFAULT 0 COMMENT "Indica se o aluno é bolsista (isento de mensalidade)"',
    'SELECT "Campo bolsista já existe" AS mensagem'
);

PREPARE stmt FROM @sql_add_bolsista;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- 2. VERIFICAR E ADICIONAR CAMPO BOLSA_OBSERVACAO
-- ========================================

-- Verificar se coluna bolsa_observacao existe
SET @col_exists2 = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
    AND TABLE_NAME = 'alunos'
    AND COLUMN_NAME = 'bolsa_observacao'
);

-- Adicionar coluna bolsa_observacao se não existir
SET @sql_add_bolsa_obs = IF(
    @col_exists2 = 0,
    'ALTER TABLE alunos ADD COLUMN bolsa_observacao VARCHAR(255) NULL COMMENT "Observação sobre a bolsa do aluno"',
    'SELECT "Campo bolsa_observacao já existe" AS mensagem'
);

PREPARE stmt2 FROM @sql_add_bolsa_obs;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ========================================
-- 3. VERIFICAR E CRIAR ÍNDICE
-- ========================================

-- Verificar se índice idx_alunos_bolsista existe
SET @idx_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
    AND TABLE_NAME = 'alunos'
    AND INDEX_NAME = 'idx_alunos_bolsista'
);

-- Criar índice se não existir
SET @sql_create_idx = IF(
    @idx_exists = 0,
    'CREATE INDEX idx_alunos_bolsista ON alunos(bolsista)',
    'SELECT "Índice idx_alunos_bolsista já existe" AS mensagem'
);

PREPARE stmt3 FROM @sql_create_idx;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- ========================================
-- 4. VERIFICAÇÃO FINAL
-- ========================================

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
AND TABLE_NAME = 'alunos'
AND COLUMN_NAME IN ('bolsista', 'bolsa_observacao')
ORDER BY COLUMN_NAME;

SELECT 'Script de correção executado com sucesso!' AS status;