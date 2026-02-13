-- ========================================================================
-- Migração 008: Adicionar Campos de Informações Médicas aos Alunos
-- Data: 2025-12-21
-- Descrição: Adiciona campos para informações médicas completas no perfil
--            do aluno, incluindo tipo sanguíneo, alergias, condições de
--            saúde, medicamentos, contatos médicos e plano de saúde.
-- ========================================================================

-- Verificar se já existe algum campo para evitar erro
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'alunos'
               AND COLUMN_NAME = 'tipo_sanguineo');

-- Adicionar campos médicos à tabela alunos
ALTER TABLE alunos
-- Informações médicas básicas
ADD COLUMN IF NOT EXISTS tipo_sanguineo ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL COMMENT 'Tipo sanguíneo do aluno',
ADD COLUMN IF NOT EXISTS alergias TEXT NULL COMMENT 'Alergias conhecidas (medicamentos, alimentos, etc.)',
ADD COLUMN IF NOT EXISTS condicoes_saude TEXT NULL COMMENT 'Condições de saúde relevantes (diabetes, asma, epilepsia, etc.)',
ADD COLUMN IF NOT EXISTS medicamentos_uso TEXT NULL COMMENT 'Medicamentos de uso contínuo',

-- Contatos médicos de emergência
ADD COLUMN IF NOT EXISTS contato_emergencia_medica VARCHAR(255) NULL COMMENT 'Nome do médico ou hospital de referência',
ADD COLUMN IF NOT EXISTS telefone_emergencia_medica VARCHAR(20) NULL COMMENT 'Telefone do contato médico de emergência',

-- Plano de saúde
ADD COLUMN IF NOT EXISTS plano_saude VARCHAR(255) NULL COMMENT 'Nome da operadora do plano de saúde',
ADD COLUMN IF NOT EXISTS numero_plano_saude VARCHAR(100) NULL COMMENT 'Número da carteirinha do plano de saúde';

-- Adicionar campos de endereço mais detalhados (se não existirem)
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS numero VARCHAR(20) NULL COMMENT 'Número do endereço',
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100) NULL COMMENT 'Complemento do endereço (apto, bloco, casa, etc.)',
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NULL COMMENT 'CPF do aluno',
ADD COLUMN IF NOT EXISTS rg VARCHAR(20) NULL COMMENT 'RG do aluno';

-- Adicionar campos de responsável
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS responsavel_parentesco ENUM('pai', 'mae', 'avo', 'tio', 'tutor', 'outro') NULL COMMENT 'Parentesco do responsável';

-- Verificar se tabela usuarios precisa dos mesmos campos
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS numero VARCHAR(20) NULL COMMENT 'Número do endereço',
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100) NULL COMMENT 'Complemento do endereço',
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NULL COMMENT 'CPF',
ADD COLUMN IF NOT EXISTS rg VARCHAR(20) NULL COMMENT 'RG';

-- Criar índices para campos que podem ser pesquisados
CREATE INDEX IF NOT EXISTS idx_alunos_tipo_sanguineo ON alunos(tipo_sanguineo);
CREATE INDEX IF NOT EXISTS idx_alunos_cpf ON alunos(cpf);
CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON usuarios(cpf);

-- Log da migração
INSERT INTO system_logs (tipo, descricao, created_at)
VALUES ('migration', 'Migração 008: Campos de informações médicas adicionados com sucesso', NOW())
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), created_at = NOW();

-- ========================================================================
-- Fim da Migração 008
-- ========================================================================

SELECT 'Migração 008 concluída com sucesso!' as status;
