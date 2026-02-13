-- ========================================================================
-- SCRIPT COMPLETO - CRIAR TODAS AS TABELAS DO BANCO DE DADOS
-- Gracie Barra Cidade Nova
-- ========================================================================
--
-- INSTRUCOES:
-- 1. Acesse o phpMyAdmin da Hostinger
-- 2. Selecione o banco de dados correto (ou crie um novo)
-- 3. Clique na aba "SQL"
-- 4. Cole este script COMPLETO
-- 5. Clique em "Executar"
--
-- ========================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ========================================================================
-- 1. TABELA DE USUARIOS (BASE)
-- ========================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    endereco TEXT,
    tipo_usuario ENUM('admin', 'superadmin', 'professor', 'aluno') NOT NULL DEFAULT 'aluno',
    status ENUM('ativo', 'inativo', 'suspenso') NOT NULL DEFAULT 'ativo',
    primeiro_acesso TINYINT(1) DEFAULT 1,
    lgpd_aceite TINYINT(1) DEFAULT 0,
    lgpd_aceite_data TIMESTAMP NULL,
    lgpd_aceite_ip VARCHAR(45) NULL,
    foto_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Campos de seguranca
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

-- ========================================================================
-- 2. TABELA DE GRADUACOES
-- ========================================================================

CREATE TABLE IF NOT EXISTS graduacoes_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cor VARCHAR(7) NOT NULL,
    ordem INT NOT NULL,
    tempo_minimo_meses INT DEFAULT 0,
    aulas_minimas INT DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_ordem (ordem),
    INDEX idx_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 3. TABELA DE PLANOS
-- ========================================================================

CREATE TABLE IF NOT EXISTS planos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    valor_mensal DECIMAL(10,2) NOT NULL,
    duracao_meses INT DEFAULT 1,
    aulas_por_semana INT DEFAULT 0,
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    mostrar_site TINYINT(1) DEFAULT 0,
    destaque TINYINT(1) DEFAULT 0,
    ordem INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 4. TABELA DE PROFESSORES
-- ========================================================================

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

-- ========================================================================
-- 5. TABELA DE RESPONSAVEIS (para menores de idade)
-- ========================================================================

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

-- ========================================================================
-- 6. TABELA DE ALUNOS
-- ========================================================================

CREATE TABLE IF NOT EXISTS alunos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    graduacao VARCHAR(50) DEFAULT 'Branca',
    graduacao_atual_id INT DEFAULT 1,
    plano_id INT,
    professor_responsavel INT,
    responsavel_id INT,
    programa ENUM('Adultos', 'Infantil', 'Juvenil', 'Master') DEFAULT 'Adultos',
    data_inicio DATE NOT NULL,
    data_fim DATE NULL,
    graus_faixa INT DEFAULT 0,
    contato_emergencia VARCHAR(200),
    observacoes_medicas TEXT,
    tipo_sanguineo VARCHAR(10),
    alergias TEXT,
    medicamentos_uso TEXT,
    plano_saude VARCHAR(100),
    status ENUM('ativo', 'inativo', 'trancado') DEFAULT 'ativo',
    bolsista TINYINT(1) DEFAULT 0,
    valor_mensalidade_customizado DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (graduacao_atual_id) REFERENCES graduacoes_sistema(id) ON DELETE SET NULL,
    FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL,
    FOREIGN KEY (professor_responsavel) REFERENCES professores(id) ON DELETE SET NULL,
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id) ON DELETE SET NULL,
    INDEX idx_matricula (matricula),
    INDEX idx_status (status),
    INDEX idx_programa (programa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 7. TABELA DE PAGAMENTOS/MENSALIDADES
-- ========================================================================

CREATE TABLE IF NOT EXISTS pagamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    plano_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    valor_pago DECIMAL(10,2) NULL,
    mes_referencia DATE NOT NULL,
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

-- ========================================================================
-- 8. TABELA DE FREQUENCIA
-- ========================================================================

CREATE TABLE IF NOT EXISTS frequencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    professor_id INT,
    turma_id INT,
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

-- ========================================================================
-- 9. TABELA DE TURMAS
-- ========================================================================

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

-- ========================================================================
-- 10. TABELA DE LOGS DE SEGURANCA
-- ========================================================================

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

-- ========================================================================
-- 11. TABELA DE FORMULARIOS DE CADASTRO PUBLICO
-- ========================================================================

CREATE TABLE IF NOT EXISTS formularios_cadastro (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Dados pessoais
    nome VARCHAR(100) NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,

    -- Endereco
    endereco TEXT NOT NULL,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),

    -- Contato de emergencia
    contato_emergencia_nome VARCHAR(100) NOT NULL,
    contato_emergencia_telefone VARCHAR(20) NOT NULL,
    contato_emergencia_parentesco VARCHAR(50) NOT NULL,

    -- Dados medicos
    tipo_sanguineo ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Nao sei') NOT NULL,
    condicoes_medicas TEXT,
    medicamentos_uso TEXT,
    alergias TEXT,
    plano_saude VARCHAR(100),

    -- Responsavel (para menores de 16 anos)
    responsavel_id INT,
    possui_responsavel BOOLEAN DEFAULT FALSE,
    responsavel_nome VARCHAR(100),
    responsavel_telefone VARCHAR(20),
    responsavel_parentesco VARCHAR(50),

    -- LGPD
    aceite_lgpd TINYINT(1) DEFAULT 0,
    aceite_lgpd_data TIMESTAMP NULL,
    aceite_imagem TINYINT(1) DEFAULT 0,
    aceite_imagem_data TIMESTAMP NULL,

    -- Status do formulario
    status ENUM('pendente', 'aprovado', 'rejeitado') DEFAULT 'pendente',
    observacoes_admin TEXT,

    -- Dados do usuario criado
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

-- ========================================================================
-- 12. TABELAS DO CMS
-- ========================================================================

-- Tabela de secoes do CMS
CREATE TABLE IF NOT EXISTS cms_secoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ordem INT DEFAULT 0,
    ativo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_chave (chave),
    INDEX idx_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de conteudos do CMS
CREATE TABLE IF NOT EXISTS cms_conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    secao_id INT NOT NULL,
    chave VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    tipo ENUM('texto', 'textarea', 'imagem', 'titulo', 'subtitulo', 'cor', 'link', 'html') NOT NULL,
    valor TEXT,
    alt_text VARCHAR(255),
    ordem INT DEFAULT 0,
    obrigatorio TINYINT(1) DEFAULT 0,
    max_caracteres INT DEFAULT NULL,
    placeholder TEXT,
    dicas TEXT,
    ativo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (secao_id) REFERENCES cms_secoes(id) ON DELETE CASCADE,
    INDEX idx_secao_id (secao_id),
    INDEX idx_chave (chave),
    INDEX idx_ordem (ordem),
    UNIQUE KEY unique_secao_chave (secao_id, chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de uploads do CMS
CREATE TABLE IF NOT EXISTS cms_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conteudo_id INT,
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho VARCHAR(500) NOT NULL,
    tamanho INT NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    largura INT DEFAULT NULL,
    altura INT DEFAULT NULL,
    alt_text VARCHAR(255),
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conteudo_id) REFERENCES cms_conteudos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_conteudo (conteudo_id),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de historico do CMS
CREATE TABLE IF NOT EXISTS cms_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conteudo_id INT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    usuario_id INT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conteudo_id) REFERENCES cms_conteudos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_conteudo (conteudo_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_data (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 13. TABELAS DE SISTEMA (Logs, Backups, Metricas)
-- ========================================================================

CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL DEFAULT 'info',
    categoria VARCHAR(100),
    usuario_id INT,
    acao VARCHAR(255),
    descricao TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_url VARCHAR(500),
    request_body TEXT,
    response_status INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_categoria (categoria),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_backups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('manual', 'automatico', 'pre_migration') NOT NULL DEFAULT 'manual',
    status ENUM('pendente', 'em_progresso', 'concluido', 'erro') NOT NULL DEFAULT 'pendente',
    usuario_id INT,
    arquivo VARCHAR(500),
    tamanho_bytes BIGINT DEFAULT 0,
    tabelas_incluidas JSON,
    mensagem_erro TEXT,
    inicio_em TIMESTAMP NULL,
    fim_em TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tipo (tipo),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('login_success', 'login_failure', 'logout', 'password_change', 'permission_denied', 'suspicious_activity', 'account_locked', 'account_unlocked', 'token_refresh', 'api_access') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_event_type (event_type),
    INDEX idx_severity (severity),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS terms_acceptance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    aluno_id INT,
    formulario_id INT,
    term_type ENUM('lgpd', 'uso_imagem', 'regulamento', 'contrato') NOT NULL,
    term_version VARCHAR(20) DEFAULT '1.0',
    accepted TINYINT(1) NOT NULL DEFAULT 0,
    accepted_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (formulario_id) REFERENCES formularios_cadastro(id) ON DELETE CASCADE,

    INDEX idx_user_id (user_id),
    INDEX idx_aluno_id (aluno_id),
    INDEX idx_term_type (term_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),
    tags JSON,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_metric_type (metric_type),
    INDEX idx_metric_name (metric_name),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- 14. TABELA DE JUSTIFICATIVAS DE FALTAS
-- ========================================================================

CREATE TABLE IF NOT EXISTS justificativas_falta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    data_falta DATE NOT NULL,
    motivo TEXT NOT NULL,
    documento_path VARCHAR(500),
    status ENUM('pendente', 'aprovada', 'rejeitada') DEFAULT 'pendente',
    aprovado_por INT,
    observacoes_admin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (aprovado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_aluno_id (aluno_id),
    INDEX idx_data_falta (data_falta),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- INSERIR DADOS INICIAIS
-- ========================================================================

-- Graduacoes padrao do Jiu-Jitsu
INSERT IGNORE INTO graduacoes_sistema (id, nome, cor, ordem, tempo_minimo_meses, aulas_minimas, descricao) VALUES
(1, 'Branca', '#FFFFFF', 1, 0, 0, 'Graduacao inicial'),
(2, 'Azul', '#0066CC', 2, 18, 100, 'Primeira graduacao colorida'),
(3, 'Roxa', '#663399', 3, 24, 150, 'Graduacao intermediaria'),
(4, 'Marrom', '#8B4513', 4, 18, 200, 'Graduacao avancada'),
(5, 'Preta', '#000000', 5, 36, 300, 'Graduacao de instrutor'),
(6, 'Coral', '#FF6B35', 6, 60, 500, 'Graduacao de mestre'),
(7, 'Vermelha', '#DC143C', 7, 120, 1000, 'Grao-mestre');

-- Planos padrao
INSERT IGNORE INTO planos (id, nome, descricao, valor_mensal, aulas_por_semana, mostrar_site, ordem) VALUES
(1, 'Plano Basico', 'Plano mensal basico com 2 aulas por semana', 120.00, 2, 1, 1),
(2, 'Plano Padrao', 'Plano mensal padrao com 3 aulas por semana', 150.00, 3, 1, 2),
(3, 'Plano Premium', 'Plano mensal premium com aulas ilimitadas', 200.00, 0, 1, 3),
(4, 'Plano Infantil', 'Plano especial para criancas', 100.00, 2, 1, 4);

-- Usuario administrador padrao (senha: password123)
INSERT IGNORE INTO usuarios (id, nome, email, senha, tipo_usuario, status) VALUES
(1, 'Administrador Sistema', 'admin@graciebarra.com', '$2a$12$yF9URnfUD1w4Qex7wdTtJuUcjKdkePJc18vMa40Sembs5Gk3yQryu', 'superadmin', 'ativo');

-- ========================================================================
-- INSERIR SECOES DO CMS
-- ========================================================================

INSERT INTO cms_secoes (id, chave, nome, descricao, ordem) VALUES
(1, 'hero', 'Secao Principal', 'Banner principal do site', 1),
(2, 'sobre', 'Sobre Nos', 'Informacoes sobre a academia', 2),
(3, 'carrossel', 'Carrossel de Imagens', 'Galeria principal', 3),
(4, 'depoimento', 'Depoimento do Mestre', 'Citacao do Mestre Carlos Gracie Jr.', 4),
(5, 'professores', 'Professores', 'Equipe de instrutores', 5),
(6, 'horarios', 'Horarios de Treino', 'Cronograma das aulas', 6),
(7, 'planos', 'Planos de Pagamento', 'Valores e modalidades', 7),
(8, 'contato', 'Contato', 'Informacoes de contato', 8),
(9, 'footer', 'Rodape', 'Rodape do site', 9)
ON DUPLICATE KEY UPDATE
    nome = VALUES(nome),
    descricao = VALUES(descricao),
    ordem = VALUES(ordem);

-- ========================================================================
-- INSERIR CONTEUDOS DO CMS
-- ========================================================================

INSERT INTO cms_conteudos (id, secao_id, chave, label, tipo, valor, ordem) VALUES
-- Hero Section
(1, 1, 'titulo_principal', 'Titulo Principal', 'texto', 'Gracie Barra', 1),
(2, 1, 'subtitulo_principal', 'Subtitulo', 'texto', 'Tradicao em Jiu-Jitsu', 2),
(3, 1, 'imagem_hero_principal', 'Imagem Principal (Gracie Barra)', 'imagem', '/uploads/cms/default-gb-logo.jpg', 3),
(4, 1, 'titulo_secundario', 'Titulo Secundario', 'texto', 'Cidade Nova', 4),
(5, 1, 'subtitulo_secundario', 'Subtitulo Secundario', 'texto', 'Manaus - AM', 5),
(6, 1, 'imagem_hero_secundaria', 'Imagem Secundaria (Cidade)', 'imagem', '/uploads/cms/default-cidade.jpg', 6),

-- Sobre Section
(7, 2, 'titulo_sobre', 'Titulo da Secao', 'texto', 'Uma comunidade global', 1),
(8, 2, 'texto_sobre', 'Texto Descritivo', 'textarea', 'A Gracie Barra e mais que uma academia de Jiu-Jitsu. Somos uma comunidade global dedicada ao crescimento pessoal atraves da arte suave.', 2),
(9, 2, 'cor_fundo_sobre', 'Cor de Fundo da Secao', 'cor', '#ffffff', 3),

-- Carrossel Section
(10, 3, 'carrossel_imagem_1', 'Imagem 1 do Carrossel', 'imagem', '/uploads/cms/default-carousel-1.jpg', 1),
(11, 3, 'carrossel_titulo_1', 'Titulo Imagem 1', 'texto', 'Treinos de Alta Qualidade', 2),
(12, 3, 'carrossel_descricao_1', 'Descricao Imagem 1', 'textarea', 'Metodologia comprovada com instrutores certificados pela Gracie Barra.', 3),
(13, 3, 'carrossel_imagem_2', 'Imagem 2 do Carrossel', 'imagem', '/uploads/cms/default-carousel-2.jpg', 4),
(14, 3, 'carrossel_titulo_2', 'Titulo Imagem 2', 'texto', 'Comunidade Unida', 5),
(15, 3, 'carrossel_descricao_2', 'Descricao Imagem 2', 'textarea', 'Faca parte de uma familia que se apoia mutuamente no crescimento.', 6),

-- Depoimento Section
(16, 4, 'depoimento_texto', 'Texto do Depoimento', 'textarea', 'Minha vida e dedicada ao Jiu-Jitsu. Meu objetivo sempre foi construir uma irmandade para liderar a expansao do Jiu-Jitsu, respeitando sempre a essencia da nossa arte.', 1),
(17, 4, 'depoimento_autor', 'Autor do Depoimento', 'texto', 'Mestre Carlos Gracie Jr.', 2),
(18, 4, 'depoimento_imagem_fundo', 'Imagem de Fundo', 'imagem', '/uploads/cms/default-depoimento-bg.jpg', 3),

-- Professores Section
(19, 5, 'professor_1_nome', 'Nome Professor 1', 'texto', 'Professor Joao Silva', 1),
(20, 5, 'professor_1_foto', 'Foto Professor 1', 'imagem', '/uploads/cms/default-professor-1.jpg', 2),
(21, 5, 'professor_2_nome', 'Nome Professor 2', 'texto', 'Professor Maria Santos', 3),
(22, 5, 'professor_2_foto', 'Foto Professor 2', 'imagem', '/uploads/cms/default-professor-2.jpg', 4),

-- Horarios Section
(23, 6, 'horario_segunda', 'Segunda-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avancados\n20:00 - Competition Team', 1),
(24, 6, 'horario_terca', 'Terca-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avancados\n20:00 - No-Gi', 2),
(25, 6, 'horario_quarta', 'Quarta-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avancados\n20:00 - Competition Team', 3),
(26, 6, 'horario_quinta', 'Quinta-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avancados\n20:00 - No-Gi', 4),
(27, 6, 'horario_sexta', 'Sexta-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avancados\n20:00 - Open Mat', 5),
(28, 6, 'horario_sabado', 'Sabado', 'textarea', '08:00 - Kids\n09:00 - Fundamentais\n10:00 - Avancados', 6),
(29, 6, 'horario_domingo', 'Domingo', 'texto', 'Fechado', 7),
(30, 6, 'cor_fundo_horarios', 'Cor de Fundo da Secao', 'cor', '#f8f9fa', 8),

-- Planos Section
(31, 7, 'plano_1_nome', 'Nome do Plano 1', 'texto', 'Plano Basico', 1),
(32, 7, 'plano_1_preco', 'Preco do Plano 1', 'texto', 'R$ 150,00/mes', 2),
(33, 7, 'plano_1_descricao', 'Descricao do Plano 1', 'textarea', '2x por semana\nAcesso as aulas fundamentais\nKimono incluso', 3),
(34, 7, 'plano_2_nome', 'Nome do Plano 2', 'texto', 'Plano Completo', 4),
(35, 7, 'plano_2_preco', 'Preco do Plano 2', 'texto', 'R$ 220,00/mes', 5),
(36, 7, 'plano_2_descricao', 'Descricao do Plano 2', 'textarea', 'Ilimitado\nTodas as aulas\nKimono + Rashguard inclusos\nSeminarios gratuitos', 6),

-- Contato Section
(37, 8, 'endereco_completo', 'Endereco Completo', 'textarea', 'Rua das Palmeiras, 123\nCidade Nova\nManaus - AM\nCEP: 69000-000', 1),
(38, 8, 'telefone_principal', 'Telefone Principal', 'texto', '(92) 99999-9999', 2),
(39, 8, 'email_contato', 'E-mail de Contato', 'texto', 'contato@gbcidadenova.com.br', 3),
(40, 8, 'cor_fundo_contato', 'Cor de Fundo da Secao', 'cor', '#ffffff', 4),

-- Footer Section
(41, 9, 'texto_copyright', 'Texto de Copyright', 'texto', '2025 Gracie Barra Cidade Nova. Todos os direitos reservados.', 1)
ON DUPLICATE KEY UPDATE
    valor = VALUES(valor),
    label = VALUES(label),
    tipo = VALUES(tipo),
    ordem = VALUES(ordem);

-- ========================================================================
-- VERIFICACAO FINAL
-- ========================================================================

SET FOREIGN_KEY_CHECKS = 1;

SELECT '========================================' AS '';
SELECT 'TABELAS CRIADAS COM SUCESSO!' AS Status;
SELECT '========================================' AS '';

SELECT 'usuarios' AS Tabela, COUNT(*) AS Registros FROM usuarios
UNION ALL
SELECT 'graduacoes_sistema', COUNT(*) FROM graduacoes_sistema
UNION ALL
SELECT 'planos', COUNT(*) FROM planos
UNION ALL
SELECT 'cms_secoes', COUNT(*) FROM cms_secoes
UNION ALL
SELECT 'cms_conteudos', COUNT(*) FROM cms_conteudos;

SELECT '========================================' AS '';
SELECT 'LOGIN PADRAO:' AS Info;
SELECT 'Email: admin@graciebarra.com' AS '';
SELECT 'Senha: password123' AS '';
SELECT '========================================' AS '';

-- ========================================================================
-- FIM DO SCRIPT
-- ========================================================================
