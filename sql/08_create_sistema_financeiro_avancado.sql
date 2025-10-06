-- ========================================
-- SISTEMA FINANCEIRO AVANÇADO - GRACIE BARRA
-- Gestão completa de mensalidades e pagamentos
-- ========================================

-- Tabela de Configurações Financeiras
CREATE TABLE IF NOT EXISTS configuracoes_financeiras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor_mensalidade_adulto DECIMAL(10,2) NOT NULL,
    valor_mensalidade_infantil DECIMAL(10,2) NOT NULL,
    valor_mensalidade_familia DECIMAL(10,2) NOT NULL,
    dia_vencimento INT NOT NULL DEFAULT 10,
    juros_atraso DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    multa_atraso DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    dias_tolerancia INT NOT NULL DEFAULT 5,
    aceita_cartao BOOLEAN DEFAULT TRUE,
    aceita_pix BOOLEAN DEFAULT TRUE,
    aceita_boleto BOOLEAN DEFAULT TRUE,
    aceita_dinheiro BOOLEAN DEFAULT TRUE,
    pix_chave VARCHAR(255),
    pix_nome_recebedor VARCHAR(255),
    pix_cidade VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Mensalidades (já existe, vamos verificar e adicionar campos)
-- Adicionar campos para integração com gateways usando procedimento condicional

-- Procedimento para adicionar colunas se não existirem
DELIMITER $$

CREATE PROCEDURE add_mensalidades_columns()
BEGIN
    -- Verificar e adicionar gateway_provider
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'gateway_provider'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN gateway_provider VARCHAR(50) COMMENT 'mercadopago, pagseguro, stripe';
    END IF;

    -- Verificar e adicionar gateway_transaction_id
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'gateway_transaction_id'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN gateway_transaction_id VARCHAR(255);
    END IF;

    -- Verificar e adicionar gateway_payment_link
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'gateway_payment_link'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN gateway_payment_link TEXT;
    END IF;

    -- Verificar e adicionar qr_code_pix
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'qr_code_pix'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN qr_code_pix TEXT;
    END IF;

    -- Verificar e adicionar pix_copia_cola
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'pix_copia_cola'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN pix_copia_cola TEXT;
    END IF;

    -- Verificar e adicionar juros_aplicados
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'juros_aplicados'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN juros_aplicados DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Verificar e adicionar multa_aplicada
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'multa_aplicada'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN multa_aplicada DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Verificar e adicionar valor_total_com_encargos
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'valor_total_com_encargos'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN valor_total_com_encargos DECIMAL(10,2);
    END IF;

    -- Verificar e adicionar comprovante_url
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'comprovante_url'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN comprovante_url TEXT;
    END IF;

    -- Verificar e adicionar observacoes_pagamento
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mensalidades'
        AND COLUMN_NAME = 'observacoes_pagamento'
    ) THEN
        ALTER TABLE mensalidades ADD COLUMN observacoes_pagamento TEXT;
    END IF;
END$$

DELIMITER ;

-- Executar o procedimento
CALL add_mensalidades_columns();

-- Remover o procedimento após uso
DROP PROCEDURE IF EXISTS add_mensalidades_columns;

-- Adicionar índices (ignorar se já existirem)
SET @exist_idx1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensalidades' AND INDEX_NAME = 'idx_gateway_transaction');
SET @sqlstmt1 := IF(@exist_idx1 = 0,
    'CREATE INDEX idx_gateway_transaction ON mensalidades(gateway_transaction_id)',
    'SELECT ''Index already exists'' as message');
PREPARE stmt1 FROM @sqlstmt1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @exist_idx2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensalidades' AND INDEX_NAME = 'idx_gateway_provider');
SET @sqlstmt2 := IF(@exist_idx2 = 0,
    'CREATE INDEX idx_gateway_provider ON mensalidades(gateway_provider)',
    'SELECT ''Index already exists'' as message');
PREPARE stmt2 FROM @sqlstmt2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Tabela de Transações Financeiras (Log completo)
CREATE TABLE IF NOT EXISTS transacoes_financeiras (
    id VARCHAR(36) PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    aluno_id INT NOT NULL,
    gateway_provider VARCHAR(50) NOT NULL COMMENT 'mercadopago, pagseguro, stripe, manual',
    gateway_transaction_id VARCHAR(255),
    gateway_payment_id VARCHAR(255),
    status VARCHAR(50) NOT NULL COMMENT 'pending, approved, rejected, cancelled, refunded',
    status_anterior VARCHAR(50),
    valor DECIMAL(10,2) NOT NULL,
    valor_liquido DECIMAL(10,2),
    taxa_gateway DECIMAL(10,2),
    metodo_pagamento VARCHAR(50) COMMENT 'credit_card, debit_card, pix, boleto, dinheiro',
    parcelas INT DEFAULT 1,
    bandeira_cartao VARCHAR(50),
    ultimos_digitos_cartao VARCHAR(4),
    detalhes_gateway JSON COMMENT 'Resposta completa do gateway',
    webhook_data JSON COMMENT 'Dados do webhook',
    ip_origem VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    INDEX idx_gateway_transaction (gateway_transaction_id),
    INDEX idx_gateway_payment (gateway_payment_id),
    INDEX idx_status (status),
    INDEX idx_metodo (metodo_pagamento),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Webhooks Recebidos (Auditoria)
CREATE TABLE IF NOT EXISTS webhooks_financeiros (
    id VARCHAR(36) PRIMARY KEY,
    gateway_provider VARCHAR(50) NOT NULL,
    evento_tipo VARCHAR(100) NOT NULL,
    gateway_id VARCHAR(255),
    payload JSON NOT NULL,
    headers JSON,
    assinatura_valida BOOLEAN,
    processado BOOLEAN DEFAULT FALSE,
    processado_em TIMESTAMP NULL,
    erro_processamento TEXT,
    tentativas_processamento INT DEFAULT 0,
    ip_origem VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_gateway_provider (gateway_provider),
    INDEX idx_gateway_id (gateway_id),
    INDEX idx_processado (processado),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Notificações de Pagamento
CREATE TABLE IF NOT EXISTS notificacoes_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    aluno_id INT NOT NULL,
    tipo VARCHAR(50) NOT NULL COMMENT 'vencimento_proximo, vencido, pago, rejeitado',
    canal VARCHAR(50) NOT NULL COMMENT 'email, whatsapp, sms, sistema',
    destinatario VARCHAR(255) NOT NULL,
    assunto VARCHAR(255),
    mensagem TEXT NOT NULL,
    enviado BOOLEAN DEFAULT FALSE,
    enviado_em TIMESTAMP NULL,
    erro_envio TEXT,
    tentativas INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    INDEX idx_tipo (tipo),
    INDEX idx_canal (canal),
    INDEX idx_enviado (enviado),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Parcelamentos
CREATE TABLE IF NOT EXISTS parcelamentos (
    id VARCHAR(36) PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    aluno_id INT NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    quantidade_parcelas INT NOT NULL,
    valor_parcela DECIMAL(10,2) NOT NULL,
    parcelas_pagas INT DEFAULT 0,
    gateway_provider VARCHAR(50),
    gateway_subscription_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ativo' COMMENT 'ativo, cancelado, completo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_gateway_subscription (gateway_subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Conciliação Bancária
CREATE TABLE IF NOT EXISTS conciliacao_bancaria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_conciliacao DATE NOT NULL,
    total_esperado DECIMAL(10,2) NOT NULL,
    total_recebido DECIMAL(10,2) NOT NULL,
    diferenca DECIMAL(10,2) NOT NULL,
    mensalidades_conciliadas INT DEFAULT 0,
    mensalidades_pendentes INT DEFAULT 0,
    observacoes TEXT,
    arquivo_extrato VARCHAR(255),
    conciliado_por INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conciliado_por) REFERENCES usuarios(id),
    INDEX idx_data_conciliacao (data_conciliacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Descontos e Promoções
CREATE TABLE IF NOT EXISTS descontos_promocoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL COMMENT 'percentual, valor_fixo',
    valor DECIMAL(10,2) NOT NULL,
    valido_de DATE NOT NULL,
    valido_ate DATE NOT NULL,
    uso_maximo INT,
    uso_atual INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_codigo (codigo),
    INDEX idx_ativo (ativo),
    INDEX idx_validade (valido_de, valido_ate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Aplicação de Descontos
CREATE TABLE IF NOT EXISTS mensalidades_descontos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensalidade_id INT NOT NULL,
    desconto_id INT NOT NULL,
    valor_desconto DECIMAL(10,2) NOT NULL,
    aplicado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aplicado_por INT,

    FOREIGN KEY (mensalidade_id) REFERENCES mensalidades(id) ON DELETE CASCADE,
    FOREIGN KEY (desconto_id) REFERENCES descontos_promocoes(id),
    FOREIGN KEY (aplicado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configuração padrão
INSERT INTO configuracoes_financeiras (
    valor_mensalidade_adulto,
    valor_mensalidade_infantil,
    valor_mensalidade_familia,
    dia_vencimento,
    juros_atraso,
    multa_atraso,
    dias_tolerancia,
    pix_nome_recebedor,
    pix_cidade
) VALUES (
    350.00,
    250.00,
    800.00,
    10,
    2.00,
    10.00,
    5,
    'GRACIE BARRA',
    'Manaus'
) ON DUPLICATE KEY UPDATE id=id;

-- View para Dashboard Financeiro
CREATE OR REPLACE VIEW vw_dashboard_financeiro AS
SELECT
    DATE_FORMAT(CURDATE(), '%Y-%m') as mes_referencia,
    COUNT(DISTINCT CASE WHEN m.status = 'pago' THEN m.id END) as mensalidades_pagas,
    COUNT(DISTINCT CASE WHEN m.status = 'pendente' THEN m.id END) as mensalidades_pendentes,
    COUNT(DISTINCT CASE WHEN m.status = 'atrasado' THEN m.id END) as mensalidades_vencidas,
    SUM(CASE WHEN m.status = 'pago' THEN m.valor_total ELSE 0 END) as receita_confirmada,
    SUM(CASE WHEN m.status = 'pendente' THEN m.valor_total ELSE 0 END) as receita_pendente,
    SUM(CASE WHEN m.status = 'atrasado' THEN m.valor_total + COALESCE(m.juros_aplicados, 0) + COALESCE(m.multa_aplicada, 0) ELSE 0 END) as valor_inadimplencia,
    ROUND((COUNT(CASE WHEN m.status = 'atrasado' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) as taxa_inadimplencia,
    COUNT(DISTINCT t.metodo_pagamento) as metodos_utilizados
FROM mensalidades m
LEFT JOIN transacoes_financeiras t ON m.id = t.mensalidade_id
WHERE m.data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);

-- View para Relatório de Inadimplência
CREATE OR REPLACE VIEW vw_relatorio_inadimplencia AS
SELECT
    a.id as aluno_id,
    u.nome as aluno_nome,
    u.email,
    u.telefone,
    COUNT(m.id) as total_mensalidades_vencidas,
    SUM(m.valor_total + COALESCE(m.juros_aplicados, 0) + COALESCE(m.multa_aplicada, 0)) as valor_total_devido,
    MIN(m.data_vencimento) as primeira_vencida,
    MAX(m.data_vencimento) as ultima_vencida,
    DATEDIFF(CURDATE(), MIN(m.data_vencimento)) as dias_atraso_maximo,
    MAX(m2.data_pagamento) as ultimo_pagamento
FROM alunos a
INNER JOIN usuarios u ON a.usuario_id = u.id
INNER JOIN mensalidades m ON a.id = m.aluno_id
LEFT JOIN mensalidades m2 ON a.id = m2.aluno_id AND m2.status = 'pago'
WHERE m.status = 'atrasado' AND m.data_vencimento < CURDATE()
GROUP BY a.id, u.nome, u.email, u.telefone
ORDER BY valor_total_devido DESC;

-- Stored Procedure para aplicar juros e multa
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_aplicar_juros_multa$$

CREATE PROCEDURE sp_aplicar_juros_multa()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_mensalidade_id INT;
    DECLARE v_valor DECIMAL(10,2);
    DECLARE v_vencimento DATE;
    DECLARE v_dias_atraso INT;
    DECLARE v_juros DECIMAL(10,2);
    DECLARE v_multa DECIMAL(10,2);
    DECLARE v_juros_taxa DECIMAL(5,2);
    DECLARE v_multa_taxa DECIMAL(5,2);

    DECLARE cur CURSOR FOR
        SELECT m.id, m.valor_total, m.data_vencimento, DATEDIFF(CURDATE(), m.data_vencimento) as dias_atraso
        FROM mensalidades m
        WHERE m.status IN ('pendente', 'atrasado')
        AND m.data_vencimento < CURDATE()
        AND (m.juros_aplicados IS NULL OR m.juros_aplicados = 0);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Buscar taxas de juros e multa
    SELECT juros_atraso, multa_atraso INTO v_juros_taxa, v_multa_taxa
    FROM configuracoes_financeiras
    WHERE ativo = TRUE
    LIMIT 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_mensalidade_id, v_valor, v_vencimento, v_dias_atraso;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Calcular multa (uma vez)
        SET v_multa = ROUND(v_valor * (v_multa_taxa / 100), 2);

        -- Calcular juros (proporcional aos dias)
        SET v_juros = ROUND(v_valor * (v_juros_taxa / 100) * (v_dias_atraso / 30), 2);

        -- Atualizar mensalidade
        UPDATE mensalidades
        SET
            status = 'atrasado',
            juros_aplicados = v_juros,
            multa_aplicada = v_multa,
            valor_total_com_encargos = v_valor + v_juros + v_multa
        WHERE id = v_mensalidade_id;

    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;

-- Trigger para atualizar status automaticamente
DELIMITER $$

DROP TRIGGER IF EXISTS trg_atualizar_status_mensalidade$$

CREATE TRIGGER trg_atualizar_status_mensalidade
BEFORE UPDATE ON mensalidades
FOR EACH ROW
BEGIN
    -- Se foi paga, registrar data
    IF NEW.status = 'pago' AND OLD.status != 'pago' THEN
        SET NEW.data_pagamento = NOW();
    END IF;

    -- Se está vencida e não foi paga
    IF NEW.data_vencimento < CURDATE() AND NEW.status = 'pendente' THEN
        SET NEW.status = 'atrasado';
    END IF;
END$$

DELIMITER ;

-- Event Scheduler para executar diariamente
-- Nota: Requer privilégio SUPER ou SYSTEM_VARIABLES_ADMIN
-- Execute manualmente: SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS evt_processar_mensalidades_diario$$

CREATE EVENT evt_processar_mensalidades_diario
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 1 HOUR)
DO
  CALL sp_aplicar_juros_multa();
