-- ========================================
-- CORREÇÃO VPS: Adicionar Campos Faltantes na Tabela Alunos
-- Data: 2025-12-29
-- Ambiente: VPS Hostinger
-- ========================================

USE u674882802_graciebarra;

-- Adicionar campo bolsista (se não existir)
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS bolsista TINYINT(1) DEFAULT 0
COMMENT 'Indica se o aluno é bolsista (isento de mensalidade)';

-- Adicionar campo bolsa_observacao (se não existir)
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS bolsa_observacao VARCHAR(255) NULL
COMMENT 'Observação sobre a bolsa do aluno';

-- Criar índice para otimização (se não existir)
CREATE INDEX IF NOT EXISTS idx_alunos_bolsista ON alunos(bolsista);

-- Verificar se foram adicionados corretamente
SELECT
    COLUMN_NAME as 'Campo',
    COLUMN_TYPE as 'Tipo',
    IS_NULLABLE as 'NULL?',
    COLUMN_DEFAULT as 'Padrão',
    COLUMN_COMMENT as 'Comentário'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'u674882802_graciebarra'
AND TABLE_NAME = 'alunos'
AND COLUMN_NAME IN ('bolsista', 'bolsa_observacao')
ORDER BY COLUMN_NAME;

-- Mensagem de sucesso
SELECT '✅ Correção VPS concluída com sucesso!' AS Status;
SELECT 'Campos bolsista e bolsa_observacao adicionados' AS Acao;
SELECT 'Agora você pode atualizar alunos normalmente' AS ProximoPasso;
