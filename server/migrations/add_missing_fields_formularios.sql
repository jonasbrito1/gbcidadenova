-- ========================================
-- MIGRAÇÃO: Adicionar campos faltantes em formularios_cadastro
-- Data: 2025-11-30
-- Descrição: Adiciona campos do PublicRegistration
-- ========================================

-- Adicionar email_responsavel
ALTER TABLE formularios_cadastro
ADD COLUMN email_responsavel VARCHAR(255) NULL COMMENT 'Email do responsável (obrigatório para menores)' AFTER data_nascimento;

-- Adicionar campos de endereço detalhados
ALTER TABLE formularios_cadastro
ADD COLUMN rua VARCHAR(255) NULL COMMENT 'Rua/Logradouro' AFTER cep;

ALTER TABLE formularios_cadastro
ADD COLUMN numero VARCHAR(20) NULL COMMENT 'Número do endereço' AFTER rua;

ALTER TABLE formularios_cadastro
ADD COLUMN complemento VARCHAR(100) NULL COMMENT 'Complemento do endereço' AFTER numero;

ALTER TABLE formularios_cadastro
ADD COLUMN bairro VARCHAR(100) NULL COMMENT 'Bairro' AFTER complemento;

-- Adicionar dados acadêmicos
ALTER TABLE formularios_cadastro
ADD COLUMN programa ENUM('Adultos', 'Infantil', 'Juvenil', 'Master') NOT NULL DEFAULT 'Adultos' COMMENT 'Modalidade do aluno' AFTER alergias;

ALTER TABLE formularios_cadastro
ADD COLUMN graduacao VARCHAR(50) DEFAULT 'Branca' COMMENT 'Graduação atual (faixa)' AFTER programa;

ALTER TABLE formularios_cadastro
ADD COLUMN graus_faixa INT DEFAULT 0 COMMENT 'Quantidade de graus na faixa' AFTER graduacao;

ALTER TABLE formularios_cadastro
ADD COLUMN data_inicio DATE NOT NULL DEFAULT (CURRENT_DATE) COMMENT 'Data de início na academia' AFTER graus_faixa;

-- Adicionar campos de contato de emergência corretos
ALTER TABLE formularios_cadastro
ADD COLUMN nome_contato_emergencia VARCHAR(255) NULL COMMENT 'Nome do contato de emergência' AFTER data_inicio;

ALTER TABLE formularios_cadastro
ADD COLUMN contato_emergencia VARCHAR(200) NULL COMMENT 'Telefone de emergência' AFTER nome_contato_emergencia;

-- Adicionar informações médicas detalhadas
ALTER TABLE formularios_cadastro
ADD COLUMN toma_medicamento BOOLEAN DEFAULT FALSE COMMENT 'Indica se toma medicamento regularmente' AFTER tipo_sanguineo;

ALTER TABLE formularios_cadastro
ADD COLUMN medicamentos_detalhes TEXT NULL COMMENT 'Detalhes dos medicamentos que toma' AFTER toma_medicamento;

ALTER TABLE formularios_cadastro
ADD COLUMN historico_fraturas BOOLEAN DEFAULT FALSE COMMENT 'Indica se já teve fraturas' AFTER medicamentos_detalhes;

ALTER TABLE formularios_cadastro
ADD COLUMN fraturas_detalhes TEXT NULL COMMENT 'Detalhes das fraturas' AFTER historico_fraturas;

ALTER TABLE formularios_cadastro
ADD COLUMN tem_alergias BOOLEAN DEFAULT FALSE COMMENT 'Indica se possui alergias' AFTER fraturas_detalhes;

ALTER TABLE formularios_cadastro
ADD COLUMN alergias_detalhes TEXT NULL COMMENT 'Detalhes das alergias' AFTER tem_alergias;

ALTER TABLE formularios_cadastro
ADD COLUMN observacoes_medicas TEXT NULL COMMENT 'Outras observações médicas' AFTER alergias_detalhes;

-- Adicionar campos de auditoria
ALTER TABLE formularios_cadastro
ADD COLUMN ip_origem VARCHAR(45) NULL COMMENT 'IP de origem do formulário' AFTER observacoes_medicas;

ALTER TABLE formularios_cadastro
ADD COLUMN user_agent TEXT NULL COMMENT 'User agent do navegador' AFTER ip_origem;

ALTER TABLE formularios_cadastro
ADD COLUMN validado_por INT NULL COMMENT 'ID do professor que validou' AFTER user_agent;

ALTER TABLE formularios_cadastro
ADD COLUMN data_validacao TIMESTAMP NULL COMMENT 'Data da validação' AFTER validado_por;

ALTER TABLE formularios_cadastro
ADD COLUMN observacoes_validacao TEXT NULL COMMENT 'Observações do professor na validação' AFTER data_validacao;

-- Adicionar índice no email_responsavel
CREATE INDEX idx_email_responsavel ON formularios_cadastro(email_responsavel);

-- Adicionar chave estrangeira para validado_por
ALTER TABLE formularios_cadastro
ADD CONSTRAINT fk_formularios_validado_por
FOREIGN KEY (validado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

SELECT 'Migração de campos em formularios_cadastro concluída com sucesso!' as status;
