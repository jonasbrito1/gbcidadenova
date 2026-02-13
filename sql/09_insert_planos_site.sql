-- ========================================
-- INSERÇÃO DOS PLANOS DO SITE
-- Planos exibidos na Landing Page
-- ========================================

-- Limpar planos existentes (opcional - comentar se não quiser limpar)
-- DELETE FROM planos WHERE id > 0;

-- Primeiro, adicionar as colunas necessárias
SET @exist_avista := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'planos'
    AND COLUMN_NAME = 'valor_avista');

SET @sqlstmt_avista := IF(@exist_avista = 0,
    'ALTER TABLE planos ADD COLUMN valor_avista DECIMAL(10,2) COMMENT ''Valor com 15% de desconto para pagamento à vista''',
    'SELECT ''Column valor_avista already exists'' as message');

PREPARE stmt_avista FROM @sqlstmt_avista;
EXECUTE stmt_avista;
DEALLOCATE PREPARE stmt_avista;

SET @exist_beneficios := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'planos'
    AND COLUMN_NAME = 'beneficios');

SET @sqlstmt_beneficios := IF(@exist_beneficios = 0,
    'ALTER TABLE planos ADD COLUMN beneficios JSON COMMENT ''Lista de benefícios do plano''',
    'SELECT ''Column beneficios already exists'' as message');

PREPARE stmt_beneficios FROM @sqlstmt_beneficios;
EXECUTE stmt_beneficios;
DEALLOCATE PREPARE stmt_beneficios;

SET @exist_tipo := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'planos'
    AND COLUMN_NAME = 'tipo');

SET @sqlstmt_tipo := IF(@exist_tipo = 0,
    'ALTER TABLE planos ADD COLUMN tipo VARCHAR(50) COMMENT ''mensal, trimestral, semestral, anual''',
    'SELECT ''Column tipo already exists'' as message');

PREPARE stmt_tipo FROM @sqlstmt_tipo;
EXECUTE stmt_tipo;
DEALLOCATE PREPARE stmt_tipo;

SET @exist_destaque := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'planos'
    AND COLUMN_NAME = 'destaque');

SET @sqlstmt_destaque := IF(@exist_destaque = 0,
    'ALTER TABLE planos ADD COLUMN destaque BOOLEAN DEFAULT FALSE COMMENT ''Plano em destaque (mais popular)''',
    'SELECT ''Column destaque already exists'' as message');

PREPARE stmt_destaque FROM @sqlstmt_destaque;
EXECUTE stmt_destaque;
DEALLOCATE PREPARE stmt_destaque;

SET @exist_valor_total := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'planos'
    AND COLUMN_NAME = 'valor_total');

SET @sqlstmt_valor_total := IF(@exist_valor_total = 0,
    'ALTER TABLE planos ADD COLUMN valor_total DECIMAL(10,2) COMMENT ''Valor total do plano (valor_mensal * duracao_meses)''',
    'SELECT ''Column valor_total already exists'' as message');

PREPARE stmt_valor_total FROM @sqlstmt_valor_total;
EXECUTE stmt_valor_total;
DEALLOCATE PREPARE stmt_valor_total;

-- Plano Mensal (Básico)
INSERT INTO planos (
    nome,
    descricao,
    valor_mensal,
    valor_total,
    duracao_meses,
    status,
    tipo,
    beneficios
) VALUES (
    'Plano Mensal',
    'Plano básico com renovação mensal',
    140.00,
    140.00,
    1,
    'ativo',
    'mensal',
    JSON_ARRAY(
        'Aulas todos os dias',
        'Todos os programas GB',
        'Horários flexíveis',
        'Suporte técnico'
    )
) ON DUPLICATE KEY UPDATE
    valor_mensal = 140.00,
    valor_total = 140.00,
    duracao_meses = 1;

-- Plano 3 Meses (Trimestral)
INSERT INTO planos (
    nome,
    descricao,
    valor_mensal,
    valor_total,
    valor_avista,
    duracao_meses,
    status,
    tipo,
    beneficios
) VALUES (
    'Plano 3 Meses',
    'Plano trimestral com desconto progressivo',
    140.00,
    420.00,
    357.00,
    3,
    'ativo',
    'trimestral',
    JSON_ARRAY(
        'Aulas todos os dias',
        'Todos os programas GB',
        'Horários flexíveis',
        'Suporte técnico personalizado',
        'Avaliação de progresso'
    )
) ON DUPLICATE KEY UPDATE
    valor_mensal = 140.00,
    valor_total = 420.00,
    valor_avista = 357.00,
    duracao_meses = 3;

-- Plano 6 Meses (Semestral - Mais Popular)
INSERT INTO planos (
    nome,
    descricao,
    valor_mensal,
    valor_total,
    valor_avista,
    duracao_meses,
    status,
    tipo,
    destaque,
    beneficios
) VALUES (
    'Plano 6 Meses',
    'Plano semestral - O mais escolhido pelos alunos',
    130.00,
    780.00,
    663.00,
    6,
    'ativo',
    'semestral',
    TRUE,
    JSON_ARRAY(
        'Aulas todos os dias',
        'Todos os programas GB',
        'Prioridade nos horários',
        'Mentoria individual mensal',
        'Participação em eventos',
        'Kit Gracie Barra incluso'
    )
) ON DUPLICATE KEY UPDATE
    valor_mensal = 130.00,
    valor_total = 780.00,
    valor_avista = 663.00,
    duracao_meses = 6,
    destaque = TRUE;

-- Plano 12 Meses (Anual Premium)
INSERT INTO planos (
    nome,
    descricao,
    valor_mensal,
    valor_total,
    valor_avista,
    duracao_meses,
    status,
    tipo,
    beneficios
) VALUES (
    'Plano 1 Ano',
    'Plano anual premium com máximo benefício',
    120.00,
    1440.00,
    1224.00,
    12,
    'ativo',
    'anual',
    JSON_ARRAY(
        'Aulas todos os dias',
        'Todos os programas GB',
        'Acesso VIP aos eventos',
        'Coaching personalizado',
        'Seminários exclusivos',
        'Kit Gracie Barra Premium',
        'Programa de fidelidade'
    )
) ON DUPLICATE KEY UPDATE
    valor_mensal = 120.00,
    valor_total = 1440.00,
    valor_avista = 1224.00,
    duracao_meses = 12;


-- Atualizar configurações financeiras com valores do site
UPDATE configuracoes_financeiras
SET
    valor_mensalidade_adulto = 140.00,
    valor_mensalidade_infantil = 140.00,
    valor_mensalidade_familia = 663.00
WHERE id = 1;

-- Criar desconto de 15% para pagamento à vista
INSERT INTO descontos_promocoes (
    codigo,
    descricao,
    tipo,
    valor,
    valido_de,
    valido_ate,
    uso_maximo,
    ativo
) VALUES (
    'AVISTA15',
    'Desconto de 15% para pagamento à vista',
    'percentual',
    15.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
    NULL,
    TRUE
) ON DUPLICATE KEY UPDATE
    descricao = 'Desconto de 15% para pagamento à vista',
    valor = 15.00,
    ativo = TRUE;

-- Exibir planos inseridos
SELECT
    id,
    nome,
    valor_mensal as 'Valor Mensal',
    valor_total as 'Valor Total',
    valor_avista as 'Valor À Vista',
    duracao_meses as 'Duração (meses)',
    tipo,
    destaque as 'Em Destaque',
    status as 'Status'
FROM planos
ORDER BY duracao_meses;
