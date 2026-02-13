-- ============================================================================
-- Migration 010: Adicionar Tipo de Usuário SuperAdmin
-- Data: 2025-12-28
-- Descrição: Adiciona o tipo 'superadmin' ao ENUM de tipo_usuario
-- ============================================================================

-- Verificar estrutura atual da tabela usuarios
SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'usuarios'
  AND COLUMN_NAME = 'tipo_usuario';

-- Modificar ENUM para incluir 'superadmin'
ALTER TABLE usuarios
MODIFY COLUMN tipo_usuario ENUM('admin', 'professor', 'aluno', 'superadmin')
NOT NULL DEFAULT 'aluno';

-- Adicionar índice para otimizar consultas de superadmin
-- Nota: Removido IF NOT EXISTS pois não é suportado em MySQL para índices
CREATE INDEX idx_tipo_superadmin ON usuarios(tipo_usuario);

-- Verificar alteração
SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'usuarios'
  AND COLUMN_NAME = 'tipo_usuario';

-- Log da migration
SELECT 'Migration 010 executada com sucesso - Tipo SuperAdmin adicionado' AS status;
