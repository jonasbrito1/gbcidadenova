-- Migração 003: Atualizar tabela planos com campos para sistema completo

-- Adicionar campos que estão faltando (ignora erro se já existir)
ALTER TABLE planos
ADD COLUMN valor_total DECIMAL(10,2) DEFAULT NULL COMMENT 'Valor total do plano (para planos anuais, etc)';

ALTER TABLE planos
ADD COLUMN valor_avista DECIMAL(10,2) DEFAULT NULL COMMENT 'Valor à vista (com desconto)';

ALTER TABLE planos
ADD COLUMN tipo VARCHAR(50) DEFAULT 'mensal' COMMENT 'Tipo do plano: mensal, trimestral, semestral, anual';

ALTER TABLE planos
ADD COLUMN destaque BOOLEAN DEFAULT FALSE COMMENT 'Plano em destaque na página inicial';

ALTER TABLE planos
ADD COLUMN beneficios JSON DEFAULT NULL COMMENT 'Lista de benefícios do plano em JSON';

-- Inserir plano mensal padrão de R$ 150,00
INSERT INTO planos (
    nome,
    descricao,
    valor_mensal,
    valor_total,
    duracao_meses,
    aulas_por_semana,
    tipo,
    destaque,
    beneficios,
    status
) VALUES (
    'Plano Mensal',
    'Plano mensal com acesso ilimitado às aulas de Jiu-Jitsu',
    150.00,
    150.00,
    1,
    0, -- 0 = ilimitado
    'mensal',
    TRUE,
    JSON_ARRAY(
        'Acesso ilimitado às aulas',
        'Treinamento com professores qualificados',
        'Uso do kimono da academia',
        'Participação em eventos internos',
        'Avaliação técnica periódica'
    ),
    'ativo'
) ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    descricao = VALUES(descricao),
    valor_mensal = VALUES(valor_mensal);

-- Comentários informativos
SELECT 'Migração 003 concluída: Tabela planos atualizada com sucesso!' as message;
