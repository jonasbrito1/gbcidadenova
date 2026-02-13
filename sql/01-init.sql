-- =================================================================
-- INICIALIZAÇÃO DO BANCO DE DADOS - GRACIE BARRA CIDADE NOVA
-- Sistema completo de gestão da academia
-- =================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- =================================================================
-- 1. TABELA DE USUÁRIOS (BASE)
-- =================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    endereco TEXT,
    tipo_usuario ENUM('admin', 'professor', 'aluno') NOT NULL DEFAULT 'aluno',
    status ENUM('ativo', 'inativo', 'suspenso') NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Campos de segurança
    ultimo_login TIMESTAMP NULL,
    tentativas_login_falhas INT DEFAULT 0,
    ultimo_bloqueio TIMESTAMP NULL,
    ip_cadastro VARCHAR(45),
    token_verificacao VARCHAR(64) NULL,
    token_verificacao_expira TIMESTAMP NULL,

    INDEX idx_email (email),
    INDEX idx_tipo (tipo_usuario),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 2. TABELA DE GRADUAÇÕES
-- =================================================================

CREATE TABLE IF NOT EXISTS graduacoes_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cor VARCHAR(7) NOT NULL, -- Hex color
    ordem INT NOT NULL,
    tempo_minimo_meses INT DEFAULT 0,
    aulas_minimas INT DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_ordem (ordem),
    INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 3. TABELA DE PLANOS
-- =================================================================

CREATE TABLE IF NOT EXISTS planos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    valor_mensal DECIMAL(10,2) NOT NULL,
    duracao_meses INT DEFAULT 1,
    aulas_por_semana INT DEFAULT 0,
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 4. TABELA DE PROFESSORES
-- =================================================================

CREATE TABLE IF NOT EXISTS professores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    graduacao_id INT,
    especialidades TEXT,
    biografia TEXT,
    certificacoes TEXT,
    data_contratacao DATE,
    salario DECIMAL(10,2),
    status ENUM('ativo', 'inativo', 'licenca') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (graduacao_id) REFERENCES graduacoes_sistema(id) ON DELETE SET NULL,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 5. TABELA DE ALUNOS
-- =================================================================

CREATE TABLE IF NOT EXISTS alunos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    graduacao VARCHAR(50) DEFAULT 'Branca', -- Coluna adicional para compatibilidade
    graduacao_atual_id INT DEFAULT 1,
    plano_id INT,
    professor_responsavel INT,
    programa ENUM('Adultos', 'Infantil', 'Juvenil', 'Master') DEFAULT 'Adultos',
    data_inicio DATE NOT NULL,
    data_fim DATE NULL,
    graus_faixa INT DEFAULT 0,
    contato_emergencia VARCHAR(200),
    observacoes_medicas TEXT,
    status ENUM('ativo', 'inativo', 'trancado') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (graduacao_atual_id) REFERENCES graduacoes_sistema(id) ON DELETE SET NULL,
    FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL,
    FOREIGN KEY (professor_responsavel) REFERENCES professores(id) ON DELETE SET NULL,
    INDEX idx_matricula (matricula),
    INDEX idx_status (status),
    INDEX idx_programa (programa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 6. TABELA DE PAGAMENTOS/MENSALIDADES
-- =================================================================

CREATE TABLE IF NOT EXISTS pagamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    plano_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    valor_pago DECIMAL(10,2) NULL,
    mes_referencia DATE NOT NULL, -- YYYY-MM-01
    data_vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    forma_pagamento ENUM('dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'transferencia', 'boleto') NULL,
    status ENUM('pendente', 'pago', 'atrasado', 'cancelado') DEFAULT 'pendente',
    observacoes TEXT,
    desconto DECIMAL(10,2) DEFAULT 0,
    juros DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE RESTRICT,
    INDEX idx_mes_referencia (mes_referencia),
    INDEX idx_data_vencimento (data_vencimento),
    INDEX idx_status (status),
    UNIQUE KEY uk_aluno_mes (aluno_id, mes_referencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 7. TABELA DE FREQUÊNCIA
-- =================================================================

CREATE TABLE IF NOT EXISTS frequencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    professor_id INT,
    data_aula DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME,
    presente BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    tipo_aula ENUM('regular', 'reposicao', 'especial') DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE SET NULL,
    INDEX idx_data_aula (data_aula),
    INDEX idx_aluno_data (aluno_id, data_aula),
    UNIQUE KEY uk_aluno_aula (aluno_id, data_aula, horario_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 8. TABELA DE TURMAS
-- =================================================================

CREATE TABLE IF NOT EXISTS turmas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    professor_id INT,
    graduacao_minima_id INT,
    graduacao_maxima_id INT,
    programa ENUM('Adultos', 'Infantil', 'Juvenil', 'Master') NOT NULL,
    dia_semana ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo') NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    capacidade_maxima INT DEFAULT 30,
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE SET NULL,
    FOREIGN KEY (graduacao_minima_id) REFERENCES graduacoes_sistema(id) ON DELETE SET NULL,
    FOREIGN KEY (graduacao_maxima_id) REFERENCES graduacoes_sistema(id) ON DELETE SET NULL,
    INDEX idx_programa (programa),
    INDEX idx_dia_semana (dia_semana),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 9. TABELA DE LOGS DE SEGURANÇA
-- =================================================================

CREATE TABLE IF NOT EXISTS logs_seguranca (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    acao VARCHAR(50) NOT NULL,
    descricao TEXT,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_acao (acao),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- INSERIR DADOS INICIAIS
-- =================================================================

-- Graduações padrão do Jiu-Jitsu
INSERT IGNORE INTO graduacoes_sistema (nome, cor, ordem, tempo_minimo_meses, aulas_minimas, descricao) VALUES
('Branca', '#FFFFFF', 1, 0, 0, 'Graduação inicial'),
('Azul', '#0066CC', 2, 18, 100, 'Primeira graduação colorida'),
('Roxa', '#663399', 3, 24, 150, 'Graduação intermediária'),
('Marrom', '#8B4513', 4, 18, 200, 'Graduação avançada'),
('Preta', '#000000', 5, 36, 300, 'Graduação de instrutor'),
('Coral', '#FF6B35', 6, 60, 500, 'Graduação de mestre'),
('Vermelha', '#DC143C', 7, 120, 1000, 'Grão-mestre');

-- Planos padrão
INSERT IGNORE INTO planos (nome, descricao, valor_mensal, aulas_por_semana) VALUES
('Plano Básico', 'Plano mensal básico com 2 aulas por semana', 120.00, 2),
('Plano Padrão', 'Plano mensal padrão com 3 aulas por semana', 150.00, 3),
('Plano Premium', 'Plano mensal premium com aulas ilimitadas', 200.00, 0),
('Plano Infantil', 'Plano especial para crianças', 100.00, 2);

-- Usuário administrador padrão
INSERT IGNORE INTO usuarios (nome, email, senha, tipo_usuario) VALUES
('Administrador Sistema', 'admin@graciebarra.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- Senha padrão: password

-- Professor de exemplo
INSERT IGNORE INTO usuarios (nome, email, senha, telefone, tipo_usuario) VALUES
('Professor João Silva', 'professor@graciebarra.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(11) 99999-9999', 'professor');

-- Dados do professor
INSERT IGNORE INTO professores (usuario_id, graduacao_id, especialidades, data_contratacao) VALUES
(2, 5, 'Jiu-Jitsu, MMA, Defesa Pessoal', CURDATE());

SET FOREIGN_KEY_CHECKS = 1;