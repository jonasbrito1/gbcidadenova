-- Tabela de Responsáveis (para alunos menores de 16 anos)
CREATE TABLE IF NOT EXISTS responsaveis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    parentesco VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Formulários de Cadastro
CREATE TABLE IF NOT EXISTS formularios_cadastro (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Dados pessoais
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,

    -- Endereço
    endereco TEXT NOT NULL,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),

    -- Contato de emergência
    contato_emergencia_nome VARCHAR(100) NOT NULL,
    contato_emergencia_telefone VARCHAR(20) NOT NULL,
    contato_emergencia_parentesco VARCHAR(50) NOT NULL,

    -- Dados médicos
    tipo_sanguineo ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei') NOT NULL,
    condicoes_medicas TEXT,
    medicamentos_uso TEXT,
    alergias TEXT,
    plano_saude VARCHAR(100),

    -- Responsável (para menores de 16 anos)
    responsavel_id INT,
    possui_responsavel BOOLEAN DEFAULT FALSE,

    -- Status do formulário
    status ENUM('pendente', 'aprovado', 'rejeitado') DEFAULT 'pendente',
    observacoes_admin TEXT,

    -- Dados do usuário criado
    usuario_id INT,
    aluno_id INT,

    -- Auditoria
    analisado_por INT,
    data_analise TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE SET NULL,
    FOREIGN KEY (analisado_por) REFERENCES usuarios(id) ON DELETE SET NULL,

    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_data_nascimento (data_nascimento),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar coluna responsavel_id na tabela alunos se não existir
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'alunos'
    AND COLUMN_NAME = 'responsavel_id'
    AND TABLE_SCHEMA = DATABASE());

SET @sqlstmt := IF(@exist = 0,
    'ALTER TABLE alunos ADD COLUMN responsavel_id INT, ADD FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE SET NULL',
    'SELECT ''Column already exists'' as message');

PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
