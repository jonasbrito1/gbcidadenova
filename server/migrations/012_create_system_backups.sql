-- ============================================================================
-- Migration 012: Criar Tabela de Backups do Sistema
-- Data: 2025-12-28
-- Descrição: Tabela para controle e histórico de backups do banco de dados
-- ============================================================================

-- Criar tabela de backups
CREATE TABLE IF NOT EXISTS system_backups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('manual', 'automatico', 'scheduled') NOT NULL,
    status ENUM('em_progresso', 'concluido', 'falha') NOT NULL DEFAULT 'em_progresso',
    usuario_id INT NULL,
    tamanho_bytes BIGINT,
    arquivo_nome VARCHAR(255),
    arquivo_path VARCHAR(1000),
    tabelas_incluidas TEXT,
    inicio_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    concluido_em TIMESTAMP NULL,
    duracao_segundos INT,
    erro_mensagem TEXT,
    metadata JSON,

    INDEX idx_tipo (tipo),
    INDEX idx_status (status),
    INDEX idx_usuario (usuario_id),
    INDEX idx_inicio (inicio_em),
    INDEX idx_tipo_status (tipo, status),
    INDEX idx_concluido (concluido_em),

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar evento para limpeza automática de backups antigos (30 dias)
DROP EVENT IF EXISTS cleanup_old_backups_records;

CREATE EVENT cleanup_old_backups_records
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 4 HOUR)
DO
    DELETE FROM system_backups
    WHERE inicio_em < DATE_SUB(NOW(), INTERVAL 90 DAY)
      AND status = 'falha';

-- Verificar criação
SHOW TABLES LIKE 'system_backups';

-- Verificar estrutura
DESCRIBE system_backups;

-- Verificar evento criado
SHOW EVENTS WHERE Name = 'cleanup_old_backups_records';

-- Log da migration
SELECT 'Migration 012 executada com sucesso - Tabela system_backups criada' AS status;
