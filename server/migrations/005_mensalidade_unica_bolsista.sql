-- ========================================
-- MIGRAÇÃO 005: Mensalidade Única R$ 150,00 + Campo Bolsista
-- Data: 2025-11-26
-- Descrição:
--   - Remove planos antigos e mantém apenas mensalidade R$ 150,00
--   - Adiciona campo bolsista na tabela de alunos
-- ========================================

-- ========================================
-- 1. LIMPAR PLANOS ANTIGOS
-- ========================================

-- Desativar todos os planos existentes
UPDATE planos SET status = 'inativo' WHERE status = 'ativo';

-- Remover planos inativos (opcional - comentar se quiser manter histórico)
DELETE FROM planos WHERE status = 'inativo';

-- ========================================
-- 2. CRIAR PLANO ÚNICO MENSAL R$ 150,00
-- ========================================

INSERT INTO planos (
    nome,
    descricao,
    valor_mensal,
    valor_total,
    valor_avista,
    duracao_meses,
    aulas_por_semana,
    tipo,
    destaque,
    beneficios,
    status
) VALUES (
    'Mensalidade',
    'Mensalidade padrão da academia - Acesso completo às aulas de Jiu-Jitsu',
    150.00,
    150.00,
    150.00,
    1,
    0,
    'mensal',
    TRUE,
    JSON_ARRAY(
        'Acesso ilimitado às aulas',
        'Treinamento com professores qualificados',
        'Participação em eventos internos',
        'Avaliação técnica periódica'
    ),
    'ativo'
);

-- ========================================
-- 3. ADICIONAR CAMPO BOLSISTA NA TABELA ALUNOS
-- ========================================

-- Adicionar campo bolsista (padrão FALSE)
ALTER TABLE alunos
ADD COLUMN bolsista TINYINT(1) DEFAULT 0 COMMENT 'Indica se o aluno é bolsista (isento de mensalidade)';

-- Adicionar campo para observações sobre a bolsa
ALTER TABLE alunos
ADD COLUMN bolsa_observacao VARCHAR(255) NULL COMMENT 'Observação sobre a bolsa do aluno';

-- Índice para consultas rápidas de bolsistas
CREATE INDEX idx_alunos_bolsista ON alunos(bolsista);

-- ========================================
-- 4. ATUALIZAR CMS - SEÇÃO PLANOS
-- ========================================

-- Atualizar conteúdo CMS para mostrar apenas o plano único
UPDATE cms_conteudos SET valor = 'Mensalidade' WHERE chave = 'plano_1_nome';
UPDATE cms_conteudos SET valor = 'R$ 150,00/mês' WHERE chave = 'plano_1_preco';
UPDATE cms_conteudos SET valor = 'Acesso ilimitado às aulas\nTreinamento com professores qualificados\nParticipação em eventos internos\nAvaliação técnica periódica' WHERE chave = 'plano_1_descricao';

-- Desativar segundo plano no CMS
UPDATE cms_conteudos SET valor = '' WHERE chave = 'plano_2_nome';
UPDATE cms_conteudos SET valor = '' WHERE chave = 'plano_2_preco';
UPDATE cms_conteudos SET valor = '' WHERE chave = 'plano_2_descricao';

-- ========================================
-- VERIFICAÇÃO
-- ========================================

SELECT 'Migração 005 concluída!' as status;
SELECT id, nome, valor_mensal, status FROM planos WHERE status = 'ativo';
