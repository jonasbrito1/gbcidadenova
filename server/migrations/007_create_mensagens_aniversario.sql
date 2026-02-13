-- Migration 007: Sistema de Controle de Mensagens de Aniversário
-- Tabela para registrar quando mensagens de aniversário foram enviadas aos alunos
-- Evita envio duplicado e mantém histórico

CREATE TABLE IF NOT EXISTS mensagens_aniversario_enviadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    ano_aniversario INT NOT NULL COMMENT 'Ano em que a mensagem foi enviada',
    tipo_mensagem ENUM('email', 'whatsapp', 'manual') NOT NULL COMMENT 'email, whatsapp ou manual (validação manual)',
    enviado_por INT COMMENT 'ID do usuário administrador que enviou/validou',
    data_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT COMMENT 'Observações adicionais sobre o envio',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices para otimização
    INDEX idx_aluno_ano (aluno_id, ano_aniversario),
    INDEX idx_data_envio (data_envio),
    INDEX idx_tipo_mensagem (tipo_mensagem),

    -- Chave estrangeira
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (enviado_por) REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Garantir apenas um registro por aluno/ano/tipo
    UNIQUE KEY unique_aluno_ano_tipo (aluno_id, ano_aniversario, tipo_mensagem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de mensagens de aniversário enviadas aos alunos';

-- Índice composto para consultas rápidas
CREATE INDEX idx_busca_status ON mensagens_aniversario_enviadas(aluno_id, ano_aniversario, tipo_mensagem, data_envio);
