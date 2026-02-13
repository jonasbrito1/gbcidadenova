-- Migration: Adicionar Constraints e Índices para Sistema Financeiro
-- Data: 2025-12-26
-- Descrição: Adiciona constraint UNIQUE para prevenir duplicatas e índices para melhorar performance

-- ============================================================================
-- 1. ADICIONAR CONSTRAINT UNIQUE PARA PREVENIR DUPLICATAS
-- ============================================================================

-- Verificar se já existe a constraint antes de adicionar
-- (Evita erro se migration for executada múltiplas vezes)

SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'mensalidades'
      AND index_name = 'uk_aluno_mes_ano'
);

-- Adicionar constraint apenas se não existir
SET @sql_constraint = IF(
    @constraint_exists = 0,
    'ALTER TABLE mensalidades ADD UNIQUE INDEX uk_aluno_mes_ano (aluno_id, mes_referencia, ano_referencia)',
    'SELECT "Constraint uk_aluno_mes_ano já existe" AS message'
);

PREPARE stmt FROM @sql_constraint;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 2. ADICIONAR ÍNDICES PARA MELHORAR PERFORMANCE
-- ============================================================================

-- Índice para status de mensalidades (usado em filtros)
SET @idx_status_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'mensalidades'
      AND index_name = 'idx_mensalidades_status'
);

SET @sql_idx_status = IF(
    @idx_status_exists = 0,
    'CREATE INDEX idx_mensalidades_status ON mensalidades(status)',
    'SELECT "Índice idx_mensalidades_status já existe" AS message'
);

PREPARE stmt FROM @sql_idx_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para data de vencimento (usado em queries de atrasados)
SET @idx_vencimento_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'mensalidades'
      AND index_name = 'idx_mensalidades_vencimento'
);

SET @sql_idx_vencimento = IF(
    @idx_vencimento_exists = 0,
    'CREATE INDEX idx_mensalidades_vencimento ON mensalidades(data_vencimento)',
    'SELECT "Índice idx_mensalidades_vencimento já existe" AS message'
);

PREPARE stmt FROM @sql_idx_vencimento;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice composto para mês/ano de referência (usado no dashboard)
SET @idx_referencia_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'mensalidades'
      AND index_name = 'idx_mensalidades_referencia'
);

SET @sql_idx_referencia = IF(
    @idx_referencia_exists = 0,
    'CREATE INDEX idx_mensalidades_referencia ON mensalidades(mes_referencia, ano_referencia)',
    'SELECT "Índice idx_mensalidades_referencia já existe" AS message'
);

PREPARE stmt FROM @sql_idx_referencia;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para status de alunos (usado em filtros de alunos ativos)
SET @idx_alunos_status_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'alunos'
      AND index_name = 'idx_alunos_status'
);

SET @sql_idx_alunos_status = IF(
    @idx_alunos_status_exists = 0,
    'CREATE INDEX idx_alunos_status ON alunos(status)',
    'SELECT "Índice idx_alunos_status já existe" AS message'
);

PREPARE stmt FROM @sql_idx_alunos_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para nome de alunos (usado em pesquisas e autocomplete)
SET @idx_alunos_nome_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'alunos'
      AND index_name = 'idx_alunos_nome'
);

SET @sql_idx_alunos_nome = IF(
    @idx_alunos_nome_exists = 0,
    'CREATE INDEX idx_alunos_nome ON alunos(nome)',
    'SELECT "Índice idx_alunos_nome já existe" AS message'
);

PREPARE stmt FROM @sql_idx_alunos_nome;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 3. VERIFICAR RESULTADOS
-- ============================================================================

SELECT 'Migration executada com sucesso!' AS status;

-- Mostrar índices criados na tabela mensalidades
SELECT
    'mensalidades' AS tabela,
    INDEX_NAME AS indice,
    COLUMN_NAME AS coluna,
    NON_UNIQUE AS nao_unico
FROM information_schema.STATISTICS
WHERE table_schema = DATABASE()
  AND table_name = 'mensalidades'
  AND INDEX_NAME IN (
      'uk_aluno_mes_ano',
      'idx_mensalidades_status',
      'idx_mensalidades_vencimento',
      'idx_mensalidades_referencia'
  )
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Mostrar índices criados na tabela alunos
SELECT
    'alunos' AS tabela,
    INDEX_NAME AS indice,
    COLUMN_NAME AS coluna,
    NON_UNIQUE AS nao_unico
FROM information_schema.STATISTICS
WHERE table_schema = DATABASE()
  AND table_name = 'alunos'
  AND INDEX_NAME IN (
      'idx_alunos_status',
      'idx_alunos_nome'
  )
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================

-- Para executar esta migration via terminal:
-- mysql -u root -p gbcidadenova < sql/migration_unique_mensalidades.sql

-- Para executar via MySQL Workbench:
-- 1. Abra o arquivo no MySQL Workbench
-- 2. Selecione o banco de dados gbcidadenova
-- 3. Execute o script completo

-- ============================================================================
-- BENEFÍCIOS ESPERADOS
-- ============================================================================

-- 1. INTEGRIDADE:
--    - Constraint UNIQUE previne duplicatas de mensalidades para mesmo aluno/mês/ano
--    - Garante consistência dos dados no banco

-- 2. PERFORMANCE:
--    - Índice em status: queries de filtro por status mais rápidas
--    - Índice em data_vencimento: busca de atrasados otimizada
--    - Índice composto mes/ano: dashboard carrega mais rápido
--    - Índice em alunos.status: listagem de alunos ativos otimizada
--    - Índice em alunos.nome: autocomplete e pesquisas mais rápidas

-- 3. ESCALABILIDADE:
--    - Sistema preparado para crescimento de dados
--    - Queries continuam performáticas com milhares de registros
