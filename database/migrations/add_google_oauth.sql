-- Adicionar campos para Google OAuth na tabela usuarios
ALTER TABLE usuarios
ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email,
ADD COLUMN foto_url VARCHAR(500) NULL AFTER telefone,
ADD COLUMN provedor_auth ENUM('local', 'google') DEFAULT 'local' AFTER tipo_usuario,
MODIFY COLUMN senha VARCHAR(255) NULL;

-- Criar índice para busca rápida por google_id
CREATE INDEX idx_google_id ON usuarios(google_id);

-- Criar tabela de assinaturas (subscriptions)
CREATE TABLE IF NOT EXISTS assinaturas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  plano_id INT NOT NULL,
  status ENUM('ativa', 'cancelada', 'suspensa', 'expirada') DEFAULT 'ativa',
  data_inicio DATE NOT NULL,
  data_fim DATE NULL,
  data_proxima_cobranca DATE NULL,
  valor_mensal DECIMAL(10,2) NOT NULL,
  forma_pagamento_preferencial VARCHAR(50) NULL,
  gateway_assinatura_id VARCHAR(255) NULL COMMENT 'ID da assinatura no gateway (Mercado Pago/Infinite Pay)',
  observacoes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (plano_id) REFERENCES planos(id),
  INDEX idx_usuario_status (usuario_id, status),
  INDEX idx_data_proxima_cobranca (data_proxima_cobranca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de transações de gateway
CREATE TABLE IF NOT EXISTS transacoes_gateway (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  assinatura_id INT NULL,
  gateway VARCHAR(50) NOT NULL COMMENT 'mercadopago, infinitepay, stripe',
  transaction_id VARCHAR(255) NOT NULL COMMENT 'ID da transação no gateway',
  tipo_transacao ENUM('payment', 'subscription', 'refund', 'chargeback') DEFAULT 'payment',
  status VARCHAR(50) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  moeda VARCHAR(3) DEFAULT 'BRL',
  metodo_pagamento VARCHAR(50) NULL COMMENT 'pix, credit_card, debit_card, boleto',
  dados_pagamento JSON NULL COMMENT 'Dados completos do pagamento',
  webhook_payload JSON NULL COMMENT 'Payload completo do webhook',
  processado BOOLEAN DEFAULT FALSE,
  data_processamento TIMESTAMP NULL,
  erro_mensagem TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE SET NULL,
  UNIQUE KEY idx_gateway_transaction (gateway, transaction_id),
  INDEX idx_usuario_gateway (usuario_id, gateway),
  INDEX idx_status_processado (status, processado),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de configurações de gateway
CREATE TABLE IF NOT EXISTS configuracoes_gateway (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gateway VARCHAR(50) NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT TRUE,
  public_key TEXT NULL,
  access_token TEXT NULL,
  webhook_secret TEXT NULL,
  ambiente ENUM('sandbox', 'production') DEFAULT 'sandbox',
  configuracoes_adicionais JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configurações padrão dos gateways
INSERT INTO configuracoes_gateway (gateway, ativo, ambiente) VALUES
('mercadopago', TRUE, 'sandbox'),
('infinitepay', FALSE, 'sandbox')
ON DUPLICATE KEY UPDATE gateway=gateway;

-- Atualizar tabela de pagamentos para incluir referência à transação
ALTER TABLE pagamentos
ADD COLUMN transacao_gateway_id INT NULL AFTER forma_pagamento,
ADD COLUMN gateway_payment_id VARCHAR(255) NULL AFTER transacao_gateway_id,
ADD FOREIGN KEY (transacao_gateway_id) REFERENCES transacoes_gateway(id) ON DELETE SET NULL;

-- Criar view para assinaturas ativas com detalhes
CREATE OR REPLACE VIEW vw_assinaturas_ativas AS
SELECT
  a.id AS assinatura_id,
  u.id AS usuario_id,
  u.nome AS usuario_nome,
  u.email AS usuario_email,
  p.nome AS plano_nome,
  p.valor_mensal AS plano_valor,
  a.status,
  a.data_inicio,
  a.data_fim,
  a.data_proxima_cobranca,
  a.valor_mensal,
  a.gateway_assinatura_id,
  DATEDIFF(a.data_fim, CURDATE()) AS dias_restantes
FROM assinaturas a
JOIN usuarios u ON a.usuario_id = u.id
JOIN planos p ON a.plano_id = p.id
WHERE a.status = 'ativa';

-- Criar view para relatório de transações
CREATE OR REPLACE VIEW vw_relatorio_transacoes AS
SELECT
  tg.id,
  tg.gateway,
  tg.transaction_id,
  u.nome AS usuario_nome,
  u.email AS usuario_email,
  tg.tipo_transacao,
  tg.status,
  tg.valor,
  tg.metodo_pagamento,
  tg.processado,
  tg.created_at AS data_transacao
FROM transacoes_gateway tg
JOIN usuarios u ON tg.usuario_id = u.id
ORDER BY tg.created_at DESC;
