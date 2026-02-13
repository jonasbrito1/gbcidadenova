-- ========================================
-- MIGRAÇÃO 006: Adicionar campo valor_mensalidade_customizado
-- Data: 2025-11-27
-- Descrição:
--   - Permite que administradores definam um valor customizado de mensalidade para cada aluno
--   - Se NULL, usa o valor do plano padrão
--   - Se definido, usa o valor customizado para pagamentos
-- ========================================

-- ========================================
-- 1. ADICIONAR CAMPO valor_mensalidade_customizado
-- ========================================

ALTER TABLE alunos
ADD COLUMN valor_mensalidade_customizado DECIMAL(10,2) NULL
COMMENT 'Valor customizado de mensalidade. Se NULL, usa o valor do plano. Se definido, sobrescreve o valor do plano';

-- Índice para consultas rápidas
CREATE INDEX idx_alunos_valor_customizado ON alunos(valor_mensalidade_customizado);

-- ========================================
-- VERIFICAÇÃO
-- ========================================

SELECT 'Migração 006 concluída!' as status;
SELECT 'Campo valor_mensalidade_customizado adicionado à tabela alunos' as message;

-- Verificar estrutura da tabela
DESCRIBE alunos;
