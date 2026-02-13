-- Migration 016: Sistema de Notificações Automáticas de Mensalidades
-- Data: 2026-01-05
-- Descrição: Criar tabela para rastrear envios de notificações automáticas e manuais

-- Tabela para rastrear notificações enviadas
CREATE TABLE IF NOT EXISTS mensalidades_notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    tipo_notificacao ENUM('automatica_2dias', 'automatica_vencimento', 'automatica_atraso', 'manual') NOT NULL,
    numero_tentativa INT NOT NULL COMMENT 'Qual tentativa de notificação (1, 2, 3...)',
    destinatario_tipo ENUM('aluno', 'responsavel') NOT NULL,
    destinatario_email VARCHAR(255) NOT NULL,
    destinatario_nome VARCHAR(255) NOT NULL,
    mensagem_customizada TEXT COMMENT 'Mensagem adicional personalizada pelo admin',
    status_envio ENUM('enviado', 'falha') NOT NULL,
    erro_mensagem TEXT COMMENT 'Mensagem de erro se falhou',
    enviado_por INT COMMENT 'ID do usuário admin que enviou (NULL para automático)',
    email_log_id INT COMMENT 'Referência para emails_log',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (enviado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (email_log_id) REFERENCES emails_log(id) ON DELETE SET NULL,

    INDEX idx_mensalidade_id (mensalidade_id),
    INDEX idx_tipo_notificacao (tipo_notificacao),
    INDEX idx_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar campos na tabela mensalidades para contadores
ALTER TABLE mensalidades
ADD COLUMN IF NOT EXISTS total_notificacoes_enviadas INT DEFAULT 0 COMMENT 'Total de notificações enviadas',
ADD COLUMN IF NOT EXISTS data_ultima_notificacao DATETIME COMMENT 'Data da última notificação enviada',
ADD COLUMN IF NOT EXISTS notificacao_2dias_enviada BOOLEAN DEFAULT FALSE COMMENT 'Flag: notificação 2 dias antes enviada',
ADD COLUMN IF NOT EXISTS notificacao_vencimento_enviada BOOLEAN DEFAULT FALSE COMMENT 'Flag: notificação no vencimento enviada',
ADD COLUMN IF NOT EXISTS notificacao_atraso_enviada BOOLEAN DEFAULT FALSE COMMENT 'Flag: notificação de atraso enviada';

-- Criar índices para otimização das queries do scheduler
ALTER TABLE mensalidades
ADD INDEX IF NOT EXISTS idx_status_vencimento (status, data_vencimento),
ADD INDEX IF NOT EXISTS idx_notificacao_flags (notificacao_2dias_enviada, notificacao_vencimento_enviada);
