-- Migração 002: Adicionar campos de consentimento LGPD na tabela formularios_cadastro
-- Data: 11/01/2025
-- Descrição: Armazenar registro de consentimento LGPD do formulário público

-- Adicionar campos de consentimento LGPD
ALTER TABLE formularios_cadastro
ADD COLUMN lgpd_aceite_publico BOOLEAN DEFAULT FALSE COMMENT 'Indica se usuário aceitou LGPD no formulário público';

ALTER TABLE formularios_cadastro
ADD COLUMN lgpd_aceite_publico_data TIMESTAMP NULL COMMENT 'Data e hora do aceite LGPD no formulário público';

ALTER TABLE formularios_cadastro
ADD COLUMN lgpd_aceite_publico_ip VARCHAR(45) NULL COMMENT 'IP do aceite LGPD no formulário público';

-- Criar índice para consultas rápidas
CREATE INDEX idx_lgpd_aceite ON formularios_cadastro(lgpd_aceite_publico, lgpd_aceite_publico_data);

-- Comentário informativo
-- Estes campos são OBRIGATÓRIOS para conformidade LGPD
-- Registram o consentimento dado ANTES da coleta de dados pessoais
