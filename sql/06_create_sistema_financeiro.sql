-- Tabela de Bandeiras de Pagamento
CREATE TABLE IF NOT EXISTS bandeiras_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('credito', 'debito', 'pix', 'dinheiro', 'boleto', 'outros') NOT NULL,
    taxa_percentual DECIMAL(5,2) DEFAULT 0.00,
    taxa_fixa DECIMAL(10,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir bandeiras padrão
INSERT INTO bandeiras_pagamento (nome, tipo, taxa_percentual, taxa_fixa) VALUES
('Dinheiro', 'dinheiro', 0.00, 0.00),
('PIX', 'pix', 0.00, 0.00),
('Boleto', 'boleto', 2.00, 3.50),
('Visa Crédito', 'credito', 2.99, 0.00),
('Mastercard Crédito', 'credito', 2.99, 0.00),
('Elo Crédito', 'credito', 2.99, 0.00),
('Visa Débito', 'debito', 1.99, 0.00),
('Mastercard Débito', 'debito', 1.99, 0.00),
('Elo Débito', 'debito', 1.99, 0.00);

-- Tabela de Mensalidades
CREATE TABLE IF NOT EXISTS mensalidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    plano_id INT,
    valor_base DECIMAL(10,2) NOT NULL,
    valor_desconto DECIMAL(10,2) DEFAULT 0.00,
    valor_acrescimo DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) NOT NULL,
    mes_referencia INT NOT NULL,
    ano_referencia INT NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    status ENUM('pendente', 'pago', 'atrasado', 'cancelado') DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL,

    INDEX idx_aluno (aluno_id),
    INDEX idx_status (status),
    INDEX idx_vencimento (data_vencimento),
    INDEX idx_referencia (ano_referencia, mes_referencia),
    UNIQUE KEY unique_aluno_mes_ano (aluno_id, mes_referencia, ano_referencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Pagamentos (detalhamento)
CREATE TABLE IF NOT EXISTS pagamentos_detalhes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    bandeira_pagamento_id INT,
    valor_pago DECIMAL(10,2) NOT NULL,
    taxa_percentual DECIMAL(5,2) DEFAULT 0.00,
    taxa_fixa DECIMAL(10,2) DEFAULT 0.00,
    valor_liquido DECIMAL(10,2) NOT NULL,
    data_pagamento DATE NOT NULL,
    numero_parcelas INT DEFAULT 1,
    parcela_atual INT DEFAULT 1,
    comprovante_url VARCHAR(500),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (bandeira_pagamento_id) REFERENCES bandeiras_pagamento(id) ON DELETE SET NULL,

    INDEX idx_mensalidade (mensalidade_id),
    INDEX idx_bandeira (bandeira_pagamento_id),
    INDEX idx_data_pagamento (data_pagamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Histórico de Alterações Financeiras
CREATE TABLE IF NOT EXISTS historico_financeiro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo_alteracao ENUM('criacao', 'pagamento', 'cancelamento', 'ajuste', 'estorno') NOT NULL,
    valor_anterior DECIMAL(10,2),
    valor_novo DECIMAL(10,2),
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,

    INDEX idx_mensalidade (mensalidade_id),
    INDEX idx_tipo (tipo_alteracao),
    INDEX idx_data (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger para atualizar status de mensalidade atrasada
DELIMITER //
CREATE TRIGGER atualizar_status_atrasado
BEFORE UPDATE ON mensalidades
FOR EACH ROW
BEGIN
    IF NEW.status = 'pendente' AND NEW.data_vencimento < CURDATE() THEN
        SET NEW.status = 'atrasado';
    END IF;
END//
DELIMITER ;
