-- ============================================================================
-- Migration 011: Criar Tabela de Logs do Sistema
-- Data: 2025-12-28
-- Descrição: Tabela para armazenar todos os logs do sistema (ações, erros, segurança)
-- ============================================================================

-- Criar tabela de logs do sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('info', 'warning', 'error', 'critical', 'security') NOT NULL,
    categoria ENUM('auth', 'user', 'payment', 'system', 'security', 'database', 'api') NOT NULL,
    usuario_id INT NULL,
    acao VARCHAR(255) NOT NULL,
    descricao TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    request_method VARCHAR(10),
    request_url VARCHAR(1000),
    request_body JSON,
    response_status INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_categoria (categoria),
    INDEX idx_usuario (usuario_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ip (ip_address),
    INDEX idx_tipo_created (tipo, created_at),
    INDEX idx_categoria_created (categoria, created_at),

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar evento para limpeza automática de logs antigos (90 dias)
DROP EVENT IF EXISTS cleanup_old_system_logs;

CREATE EVENT cleanup_old_system_logs
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 2 HOUR)
DO
    DELETE FROM system_logs
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Verificar criação
SHOW TABLES LIKE 'system_logs';

-- Verificar estrutura
DESCRIBE system_logs;

-- Verificar evento criado
SHOW EVENTS WHERE Name = 'cleanup_old_system_logs';

-- Log da migration
SELECT 'Migration 011 executada com sucesso - Tabela system_logs criada' AS status;
