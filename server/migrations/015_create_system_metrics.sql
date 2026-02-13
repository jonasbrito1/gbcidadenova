-- ============================================================================
-- Migration 015: Criar Tabela de Métricas do Sistema
-- Data: 2025-12-28
-- Descrição: Tabela para armazenar métricas de performance e uso do sistema
-- ============================================================================

-- Criar tabela de métricas do sistema
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    memory_total BIGINT,
    memory_used BIGINT,
    memory_free BIGINT,
    disk_usage DECIMAL(5,2),
    disk_total BIGINT,
    disk_used BIGINT,
    disk_free BIGINT,
    active_connections INT,
    users_online INT,
    requests_per_minute INT,
    avg_response_time INT,
    error_rate DECIMAL(5,2),
    database_size_mb DECIMAL(10,2),
    uptime_seconds BIGINT,
    load_average DECIMAL(5,2),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_created_at (created_at),
    INDEX idx_cpu (cpu_usage),
    INDEX idx_memory (memory_usage),
    INDEX idx_users_online (users_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar evento para limpeza automática de métricas antigas (30 dias)
DROP EVENT IF EXISTS cleanup_old_metrics;

CREATE EVENT cleanup_old_metrics
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 HOUR)
DO
BEGIN
    -- Manter métricas detalhadas por 7 dias
    -- Depois disso, manter apenas 1 registro por hora
    DELETE FROM system_metrics
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND id NOT IN (
          SELECT * FROM (
              SELECT MIN(id)
              FROM system_metrics
              WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
              GROUP BY DATE(created_at), HOUR(created_at)
          ) AS keep_ids
      );

    -- Remover completamente métricas com mais de 30 dias
    DELETE FROM system_metrics
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END;

-- Criar view para métricas das últimas 24 horas
CREATE OR REPLACE VIEW v_metrics_24h AS
SELECT
    id,
    cpu_usage,
    memory_usage,
    users_online,
    active_connections,
    created_at,
    HOUR(created_at) as hora
FROM system_metrics
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY created_at DESC;

-- Criar view para médias horárias
CREATE OR REPLACE VIEW v_metrics_hourly_avg AS
SELECT
    DATE(created_at) as data,
    HOUR(created_at) as hora,
    AVG(cpu_usage) as avg_cpu,
    AVG(memory_usage) as avg_memory,
    AVG(users_online) as avg_users,
    MAX(users_online) as max_users,
    AVG(active_connections) as avg_connections,
    COUNT(*) as registros
FROM system_metrics
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at), HOUR(created_at)
ORDER BY data DESC, hora DESC;

-- Verificar criação
SHOW TABLES LIKE 'system_metrics';

-- Verificar estrutura
DESCRIBE system_metrics;

-- Verificar evento criado
SHOW EVENTS WHERE Name = 'cleanup_old_metrics';

-- Verificar views criadas
SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_gracie_barra_db LIKE 'v_metrics_%';

-- Log da migration
SELECT 'Migration 015 executada com sucesso - Tabela system_metrics e views criadas' AS status;
