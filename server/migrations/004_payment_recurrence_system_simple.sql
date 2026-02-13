-- Migração 004: Sistema de Recorrência de Pagamentos (Simplificado)

-- Tabela de recorrências de pagamento
CREATE TABLE IF NOT EXISTS pagamentos_recorrentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    plano_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL COMMENT 'Valor da mensalidade',
    dia_vencimento INT NOT NULL COMMENT 'Dia do mês para vencimento (1-31)',
    data_inicio DATE NOT NULL COMMENT 'Data de início da recorrência',
    data_proxima_cobranca DATE NOT NULL COMMENT 'Próxima data de cobrança',
    data_fim DATE NULL COMMENT 'Data de término da recorrência (NULL = sem fim)',
    status ENUM('ativo', 'pausado', 'cancelado', 'inadimplente') DEFAULT 'ativo',
    notificacao_3dias BOOLEAN DEFAULT FALSE COMMENT 'Se enviou notificação 3 dias antes',
    notificacao_1dia BOOLEAN DEFAULT FALSE COMMENT 'Se enviou notificação 1 dia antes',
    notificacao_vencimento BOOLEAN DEFAULT FALSE COMMENT 'Se enviou notificação no dia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (plano_id) REFERENCES planos(id),
    INDEX idx_proxima_cobranca (data_proxima_cobranca),
    INDEX idx_aluno_status (aluno_id, status),
    INDEX idx_notificacoes (data_proxima_cobranca, status, notificacao_3dias, notificacao_1dia, notificacao_vencimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de recorrências de pagamento com notificações automáticas';

-- Tabela de histórico de notificações
CREATE TABLE IF NOT EXISTS pagamentos_notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recorrencia_id INT NOT NULL,
    aluno_id INT NOT NULL,
    tipo_notificacao ENUM('3_dias_antes', '1_dia_antes', 'no_vencimento', 'atraso') NOT NULL,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_enviado_para VARCHAR(255) NOT NULL,
    status ENUM('enviado', 'erro', 'pendente') DEFAULT 'pendente',
    tentativas INT DEFAULT 0,
    erro_mensagem TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recorrencia_id) REFERENCES pagamentos_recorrentes(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    INDEX idx_data_envio (data_envio),
    INDEX idx_recorrencia (recorrencia_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Histórico de notificações de pagamento enviadas';
