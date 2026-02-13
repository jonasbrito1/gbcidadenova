-- =====================================================
-- MIGRATION 009: Migrar Mensalidades de Alunos
-- =====================================================
-- Data: 2025-12-24
-- Objetivo: Criar mensalidades na tabela 'mensalidades' para alunos que possuem plano_id
--           mas ainda não têm mensalidades cadastradas no sistema financeiro.
--
-- IMPORTANTE: Este script é IDEMPOTENTE - pode ser executado múltiplas vezes sem duplicar dados
--             devido ao constraint UNIQUE (aluno_id, mes_referencia, ano_referencia)
-- =====================================================

START TRANSACTION;

-- 1. Criar tabela de log para rastreabilidade
CREATE TABLE IF NOT EXISTS migration_009_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    aluno_nome VARCHAR(255),
    plano_id INT,
    plano_nome VARCHAR(255),
    data_inicio DATE,
    mensalidades_criadas INT DEFAULT 0,
    status VARCHAR(50),
    mensagem TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Log inicial
INSERT INTO migration_009_log (aluno_id, aluno_nome, status, mensagem)
VALUES (0, 'SISTEMA', 'iniciado', 'Iniciando migração de mensalidades');

-- 3. Criar mensalidades para alunos que possuem plano_id mas não têm mensalidades
--
-- Estratégia:
-- - Para cada aluno com plano_id != NULL e sem mensalidades
-- - Criar mensalidades baseadas na data_inicio do aluno
-- - Criar mensalidades do mês da data_inicio até dezembro/2026
-- - Dia de vencimento: usar dia_vencimento da tabela alunos (padrão: dia 1)
-- - Valor base: usar valor do plano
-- - Status: pendente (para mensalidades futuras)

INSERT INTO mensalidades (
    aluno_id,
    plano_id,
    valor_base,
    valor_desconto,
    valor_acrescimo,
    valor_total,
    mes_referencia,
    ano_referencia,
    data_vencimento,
    status,
    observacoes
)
SELECT
    a.id as aluno_id,
    a.plano_id,
    CAST(p.valor_mensal AS DECIMAL(10,2)) as valor_base,
    0.00 as valor_desconto,
    0.00 as valor_acrescimo,
    CAST(p.valor_mensal AS DECIMAL(10,2)) as valor_total,
    meses.mes as mes_referencia,
    meses.ano as ano_referencia,
    DATE_FORMAT(
        CONCAT(meses.ano, '-', LPAD(meses.mes, 2, '0'), '-', LPAD(COALESCE(a.dia_vencimento, 1), 2, '0')),
        '%Y-%m-%d'
    ) as data_vencimento,
    'pendente' as status,
    'Migrado automaticamente do sistema antigo' as observacoes
FROM alunos a
INNER JOIN usuarios u ON a.usuario_id = u.id
INNER JOIN planos p ON a.plano_id = p.id
CROSS JOIN (
    -- Gerar sequência de meses desde a data_inicio até dez/2026
    -- Esta subquery gera todos os meses possíveis
    SELECT 1 as mes, 2025 as ano UNION ALL
    SELECT 2, 2025 UNION ALL SELECT 3, 2025 UNION ALL
    SELECT 4, 2025 UNION ALL SELECT 5, 2025 UNION ALL
    SELECT 6, 2025 UNION ALL SELECT 7, 2025 UNION ALL
    SELECT 8, 2025 UNION ALL SELECT 9, 2025 UNION ALL
    SELECT 10, 2025 UNION ALL SELECT 11, 2025 UNION ALL
    SELECT 12, 2025 UNION ALL
    SELECT 1, 2026 UNION ALL SELECT 2, 2026 UNION ALL
    SELECT 3, 2026 UNION ALL SELECT 4, 2026 UNION ALL
    SELECT 5, 2026 UNION ALL SELECT 6, 2026 UNION ALL
    SELECT 7, 2026 UNION ALL SELECT 8, 2026 UNION ALL
    SELECT 9, 2026 UNION ALL SELECT 10, 2026 UNION ALL
    SELECT 11, 2026 UNION ALL SELECT 12, 2026
) as meses
WHERE
    -- Apenas alunos com plano_id definido
    a.plano_id IS NOT NULL
    -- Apenas para meses >= data_inicio do aluno
    AND CONCAT(meses.ano, LPAD(meses.mes, 2, '0')) >= DATE_FORMAT(a.data_inicio, '%Y%m')
    -- Apenas até dezembro/2026
    AND CONCAT(meses.ano, LPAD(meses.mes, 2, '0')) <= '202612'
    -- Apenas alunos que ainda NÃO têm mensalidades (evita duplicação)
    AND NOT EXISTS (
        SELECT 1
        FROM mensalidades m
        WHERE m.aluno_id = a.id
            AND m.mes_referencia = meses.mes
            AND m.ano_referencia = meses.ano
    )
ORDER BY a.id, meses.ano, meses.mes;

-- 4. Registrar resultado da migração no log
INSERT INTO migration_009_log (
    aluno_id,
    aluno_nome,
    plano_id,
    plano_nome,
    data_inicio,
    mensalidades_criadas,
    status,
    mensagem
)
SELECT
    a.id as aluno_id,
    u.nome as aluno_nome,
    a.plano_id,
    p.nome as plano_nome,
    a.data_inicio,
    COUNT(m.id) as mensalidades_criadas,
    'sucesso' as status,
    CONCAT('Criadas ', COUNT(m.id), ' mensalidades') as mensagem
FROM alunos a
INNER JOIN usuarios u ON a.usuario_id = u.id
INNER JOIN planos p ON a.plano_id = p.id
INNER JOIN mensalidades m ON m.aluno_id = a.id
WHERE a.plano_id IS NOT NULL
    AND m.observacoes = 'Migrado automaticamente do sistema antigo'
GROUP BY a.id, u.nome, a.plano_id, p.nome, a.data_inicio;

-- 5. Resumo final da migração
INSERT INTO migration_009_log (aluno_id, aluno_nome, status, mensagem)
SELECT
    0 as aluno_id,
    'SISTEMA' as aluno_nome,
    'concluido' as status,
    CONCAT(
        'Migração concluída. ',
        'Total de alunos processados: ', COUNT(DISTINCT aluno_id), '. ',
        'Total de mensalidades criadas: ', SUM(mensalidades_criadas), '.'
    ) as mensagem
FROM migration_009_log
WHERE status = 'sucesso';

COMMIT;

-- =====================================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO
-- =====================================================
-- Execute estas queries para validar a migração:

-- 1. Ver log da migração
-- SELECT * FROM migration_009_log ORDER BY id;

-- 2. Contar mensalidades criadas por aluno
-- SELECT
--     a.id,
--     u.nome,
--     a.plano_id,
--     COUNT(m.id) as total_mensalidades
-- FROM alunos a
-- INNER JOIN usuarios u ON a.usuario_id = u.id
-- LEFT JOIN mensalidades m ON m.aluno_id = a.id
-- WHERE a.plano_id IS NOT NULL
-- GROUP BY a.id, u.nome, a.plano_id;

-- 3. Ver mensalidades criadas pela migração
-- SELECT * FROM mensalidades
-- WHERE observacoes = 'Migrado automaticamente do sistema antigo'
-- ORDER BY aluno_id, ano_referencia, mes_referencia;

-- =====================================================
-- ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- Em caso de erro, execute:

-- DELETE FROM mensalidades
-- WHERE observacoes = 'Migrado automaticamente do sistema antigo';

-- DROP TABLE IF EXISTS migration_009_log;
