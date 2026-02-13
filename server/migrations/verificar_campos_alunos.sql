-- ========================================
-- VERIFICAÇÃO: Campos da Tabela Alunos
-- ========================================
-- Este script apenas VERIFICA a estrutura, não altera nada
-- Execute via phpMyAdmin ou MySQL CLI para ver os campos existentes

USE u674882802_graciebarra;

-- Mostrar TODOS os campos da tabela alunos
SELECT
    COLUMN_NAME as 'Campo',
    COLUMN_TYPE as 'Tipo',
    IS_NULLABLE as 'Aceita NULL',
    COLUMN_DEFAULT as 'Valor Padrão',
    COLUMN_COMMENT as 'Comentário'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
AND TABLE_NAME = 'alunos'
ORDER BY ORDINAL_POSITION;

-- Verificar especificamente os campos que costumam estar faltando
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
            AND TABLE_NAME = 'alunos'
            AND COLUMN_NAME = 'bolsista'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END AS 'Campo bolsista';

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
            AND TABLE_NAME = 'alunos'
            AND COLUMN_NAME = 'bolsa_observacao'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END AS 'Campo bolsa_observacao';

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
            AND TABLE_NAME = 'alunos'
            AND COLUMN_NAME = 'valor_mensalidade_customizado'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END AS 'Campo valor_mensalidade_customizado';

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
            AND TABLE_NAME = 'alunos'
            AND COLUMN_NAME = 'dia_vencimento'
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END AS 'Campo dia_vencimento';

-- Contar total de campos
SELECT COUNT(*) as 'Total de Campos na Tabela alunos'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
AND TABLE_NAME = 'alunos';
