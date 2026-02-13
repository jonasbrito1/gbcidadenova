-- Migration: Constraints e Índices para Sistema Financeiro
-- Data: 2025-12-26

-- Constraint UNIQUE para prevenir duplicatas
ALTER TABLE mensalidades
ADD UNIQUE INDEX uk_aluno_mes_ano (aluno_id, mes_referencia, ano_referencia);

-- Índices para performance
CREATE INDEX idx_mensalidades_status ON mensalidades(status);
CREATE INDEX idx_mensalidades_vencimento ON mensalidades(data_vencimento);
CREATE INDEX idx_mensalidades_referencia ON mensalidades(mes_referencia, ano_referencia);

-- Verificar
SELECT 'Migration executada com sucesso!' AS status;
