-- ========================================================================
-- Migração 008: Adicionar Campos de Informações Médicas aos Alunos
-- Data: 2025-12-21
-- Versão: Fixed (compatível com MySQL 5.7+)
-- ========================================================================

-- Desabilitar verificação de chaves estrangeiras temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- Adicionar campos médicos à tabela alunos (verificando se não existem)
SET @dbname = DATABASE();
SET @tablename = 'alunos';

-- Tipo Sanguíneo
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
   AND TABLE_NAME = @tablename
   AND COLUMN_NAME = 'tipo_sanguineo') > 0,
  'SELECT "Column tipo_sanguineo already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN tipo_sanguineo ENUM(''A+'', ''A-'', ''B+'', ''B-'', ''AB+'', ''AB-'', ''O+'', ''O-'') NULL COMMENT ''Tipo sanguíneo do aluno'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Alergias
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'alergias') > 0,
  'SELECT "Column alergias already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN alergias TEXT NULL COMMENT ''Alergias conhecidas'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Condições de Saúde
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'condicoes_saude') > 0,
  'SELECT "Column condicoes_saude already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN condicoes_saude TEXT NULL COMMENT ''Condições de saúde relevantes'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Medicamentos em Uso
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'medicamentos_uso') > 0,
  'SELECT "Column medicamentos_uso already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN medicamentos_uso TEXT NULL COMMENT ''Medicamentos de uso contínuo'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Contato Emergência Médica
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'contato_emergencia_medica') > 0,
  'SELECT "Column contato_emergencia_medica already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN contato_emergencia_medica VARCHAR(255) NULL COMMENT ''Nome do médico ou hospital'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Telefone Emergência Médica
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'telefone_emergencia_medica') > 0,
  'SELECT "Column telefone_emergencia_medica already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN telefone_emergencia_medica VARCHAR(20) NULL COMMENT ''Telefone do contato médico'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Plano de Saúde
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'plano_saude') > 0,
  'SELECT "Column plano_saude already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN plano_saude VARCHAR(255) NULL COMMENT ''Nome da operadora'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Número Plano de Saúde
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'numero_plano_saude') > 0,
  'SELECT "Column numero_plano_saude already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN numero_plano_saude VARCHAR(100) NULL COMMENT ''Número da carteirinha'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Número do Endereço
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'numero') > 0,
  'SELECT "Column numero already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN numero VARCHAR(20) NULL COMMENT ''Número do endereço'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Complemento
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'complemento') > 0,
  'SELECT "Column complemento already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN complemento VARCHAR(100) NULL COMMENT ''Complemento do endereço'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- CPF
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cpf') > 0,
  'SELECT "Column cpf already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN cpf VARCHAR(14) NULL COMMENT ''CPF do aluno'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- RG
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'rg') > 0,
  'SELECT "Column rg already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN rg VARCHAR(20) NULL COMMENT ''RG do aluno'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Parentesco Responsável
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'responsavel_parentesco') > 0,
  'SELECT "Column responsavel_parentesco already exists" AS result',
  'ALTER TABLE alunos ADD COLUMN responsavel_parentesco ENUM(''pai'', ''mae'', ''avo'', ''tio'', ''tutor'', ''outro'') NULL COMMENT ''Parentesco do responsável'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Adicionar campos na tabela usuarios
SET @tablename = 'usuarios';

-- Número (usuarios)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'numero') > 0,
  'SELECT "Column numero already exists in usuarios" AS result',
  'ALTER TABLE usuarios ADD COLUMN numero VARCHAR(20) NULL COMMENT ''Número do endereço'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Complemento (usuarios)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'complemento') > 0,
  'SELECT "Column complemento already exists in usuarios" AS result',
  'ALTER TABLE usuarios ADD COLUMN complemento VARCHAR(100) NULL COMMENT ''Complemento do endereço'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- CPF (usuarios)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'cpf') > 0,
  'SELECT "Column cpf already exists in usuarios" AS result',
  'ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(14) NULL COMMENT ''CPF'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- RG (usuarios)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'rg') > 0,
  'SELECT "Column rg already exists in usuarios" AS result',
  'ALTER TABLE usuarios ADD COLUMN rg VARCHAR(20) NULL COMMENT ''RG'''
));
PREPARE statement FROM @preparedStatement;
EXECUTE statement;
DEALLOCATE PREPARE statement;

-- Reabilitar verificação de chaves estrangeiras
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar se os campos foram criados
SELECT
    'Migração 008 concluída com sucesso!' AS Status,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'alunos'
     AND COLUMN_NAME IN ('tipo_sanguineo', 'alergias', 'condicoes_saude', 'medicamentos_uso',
                         'contato_emergencia_medica', 'telefone_emergencia_medica',
                         'plano_saude', 'numero_plano_saude', 'numero', 'complemento',
                         'cpf', 'rg', 'responsavel_parentesco')) AS CamposAdicionados_Alunos,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'usuarios'
     AND COLUMN_NAME IN ('numero', 'complemento', 'cpf', 'rg')) AS CamposAdicionados_Usuarios;
