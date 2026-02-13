-- Migration: Adicionar Constraints e Índices para Sistema Financeiro
-- Data: 2025-12-26
-- Versão 2: Ajustada para estrutura real do banco

-- ============================================================================
-- 1. ADICIONAR CONSTRAINT UNIQUE PARA PREVENIR DUPLICATAS
-- ============================================================================

-- Adicionar constraint apenas se não existir
ALTER TABLE mensalidades
ADD UNIQUE INDEX uk_aluno_mes_ano (aluno_id, mes_referencia, ano_referencia);

-- ============================================================================
-- 2. ADICIONAR ÍNDICES PARA MELHORAR PERFORMANCE - MENSALIDADES
-- ============================================================================

-- Índice para status de mensalidades
CREATE INDEX idx_mensalidades_status ON mensalidades(status);

-- Índice para data de vencimento
CREATE INDEX idx_mensalidades_vencimento ON mensalidades(data_vencimento);

-- Índice composto para mês/ano de referência
CREATE INDEX idx_mensalidades_referencia ON mensalidades(mes_referencia, ano_referencia);

-- ============================================================================
-- 3. VERIFICAR RESULTADOS
-- ============================================================================

SELECT 'Migration executada com sucesso!' AS status;

-- Mostrar índices criados
SELECT
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
