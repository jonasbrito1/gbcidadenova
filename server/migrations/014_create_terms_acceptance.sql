-- ============================================================================
-- Migration 014: Criar Tabelas de Termos de Uso e Aceites (LGPD)
-- Data: 2025-12-28
-- Descrição: Tabelas para gerenciar versões de termos e registro de aceites
-- ============================================================================

-- Tabela de versões dos termos de uso
CREATE TABLE IF NOT EXISTS terms_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    versao VARCHAR(20) NOT NULL UNIQUE,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    tipo ENUM('termos_uso', 'politica_privacidade', 'lgpd') DEFAULT 'termos_uso',
    ativo BOOLEAN DEFAULT TRUE,
    obrigatorio BOOLEAN DEFAULT TRUE,
    publicado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_versao (versao),
    INDEX idx_ativo (ativo),
    INDEX idx_tipo (tipo),
    INDEX idx_publicado (publicado_em),

    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de aceites dos termos
CREATE TABLE IF NOT EXISTS terms_acceptance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    term_version_id INT NOT NULL,
    versao_aceita VARCHAR(20) NOT NULL,
    aceito_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    dispositivo VARCHAR(100),
    localizacao VARCHAR(100),
    metadata JSON,

    INDEX idx_usuario (usuario_id),
    INDEX idx_versao (term_version_id),
    INDEX idx_aceito_em (aceito_em),
    INDEX idx_versao_aceita (versao_aceita),
    INDEX idx_usuario_versao (usuario_id, term_version_id),

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (term_version_id) REFERENCES terms_versions(id) ON DELETE CASCADE,

    UNIQUE KEY unique_user_version (usuario_id, term_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir versão inicial dos termos (exemplo)
INSERT INTO terms_versions (versao, titulo, conteudo, tipo, ativo, obrigatorio, created_by)
VALUES (
    '1.0',
    'Termos de Uso - Gracie Barra Cidade Nova',
    'Termos de Uso e Política de Privacidade\n\nAo utilizar nosso sistema, você concorda com os seguintes termos...',
    'termos_uso',
    TRUE,
    TRUE,
    NULL
) ON DUPLICATE KEY UPDATE versao = '1.0';

-- Verificar criação
SHOW TABLES LIKE 'terms_%';

-- Verificar estrutura
DESCRIBE terms_versions;
DESCRIBE terms_acceptance;

-- Verificar dados iniciais
SELECT * FROM terms_versions;

-- Log da migration
SELECT 'Migration 014 executada com sucesso - Tabelas de Termos criadas' AS status;
