-- ============================================================================
-- Migration 013: Criar Tabela de Eventos de Segurança
-- Data: 2025-12-28
-- Descrição: Tabela para monitoramento de segurança e detecção de ameaças
-- ============================================================================

-- Criar tabela de eventos de segurança
CREATE TABLE IF NOT EXISTS security_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('login_failed', 'login_success', 'suspicious_activity', 'brute_force', 'ip_blocked', 'unauthorized_access', 'password_change', 'permission_denied') NOT NULL,
    severidade ENUM('baixa', 'media', 'alta', 'critica') NOT NULL,
    usuario_id INT NULL,
    email_tentativa VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500),
    descricao TEXT,
    acao_tomada TEXT,
    bloqueado BOOLEAN DEFAULT FALSE,
    bloqueio_ate TIMESTAMP NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_severidade (severidade),
    INDEX idx_ip (ip_address),
    INDEX idx_email (email_tentativa),
    INDEX idx_created_at (created_at),
    INDEX idx_bloqueado (bloqueado),
    INDEX idx_tipo_created (tipo, created_at),
    INDEX idx_severidade_created (severidade, created_at),
    INDEX idx_ip_tipo (ip_address, tipo),

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar evento para limpeza automática de eventos de segurança antigos (60 dias)
DROP EVENT IF EXISTS cleanup_old_security_events;

CREATE EVENT cleanup_old_security_events
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 3 HOUR)
DO
BEGIN
    -- Manter eventos críticos por mais tempo (180 dias)
    DELETE FROM security_events
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)
      AND severidade = 'critica';

    -- Remover eventos normais após 60 dias
    DELETE FROM security_events
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 60 DAY)
      AND severidade != 'critica';
END;

-- Verificar criação
SHOW TABLES LIKE 'security_events';

-- Verificar estrutura
DESCRIBE security_events;

-- Verificar evento criado
SHOW EVENTS WHERE Name = 'cleanup_old_security_events';

-- Log da migration
SELECT 'Migration 013 executada com sucesso - Tabela security_events criada' AS status;
