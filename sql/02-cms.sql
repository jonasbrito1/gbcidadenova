-- =================================================================
-- SISTEMA DE GERENCIAMENTO DE CONTEÚDO (CMS)
-- Permite aos administradores editar conteúdo do site
-- =================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =================================================================
-- TABELA DE SEÇÕES DO SITE
-- =================================================================

CREATE TABLE IF NOT EXISTS cms_secoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_chave (chave),
    INDEX idx_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- TABELA DE CONTEÚDOS
-- =================================================================

CREATE TABLE IF NOT EXISTS cms_conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    secao_id INT NOT NULL,
    chave VARCHAR(100) NOT NULL,
    tipo ENUM('texto', 'titulo', 'subtitulo', 'imagem', 'link', 'html') NOT NULL,
    label VARCHAR(100) NOT NULL,
    valor TEXT,
    valor_anterior TEXT,
    ordem INT DEFAULT 0,
    obrigatorio BOOLEAN DEFAULT FALSE,
    max_caracteres INT DEFAULT NULL,
    placeholder TEXT,
    dicas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (secao_id) REFERENCES cms_secoes(id) ON DELETE CASCADE,
    INDEX idx_secao (secao_id),
    INDEX idx_chave (chave),
    INDEX idx_ordem (ordem),
    UNIQUE KEY uk_secao_chave (secao_id, chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- TABELA DE IMAGENS/UPLOADS
-- =================================================================

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

-- =================================================================
-- TABELA DE HISTÓRICO DE ALTERAÇÕES
-- =================================================================

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

-- =================================================================
-- INSERIR SEÇÕES PADRÃO DO SITE
-- =================================================================

INSERT INTO cms_secoes (chave, nome, descricao, ordem) VALUES
('hero', 'Seção Principal (Hero)', 'Área principal do site com título, subtítulo e call-to-action', 1),
('sobre', 'Sobre Nós', 'Seção com informações sobre a academia', 2),
('professores', 'Professores', 'Seção com informações dos instrutores', 3),
('programas', 'Programas de Treino', 'Diferentes modalidades e programas oferecidos', 4),
('horarios', 'Horários de Treino', 'Tabela de horários das aulas', 5),
('cta', 'Comece sua Jornada', 'Seção de call-to-action para novos alunos', 6),
('contato', 'Contato', 'Informações de contato e localização', 7),
('footer', 'Rodapé', 'Informações do rodapé do site', 8);

-- =================================================================
-- INSERIR CONTEÚDOS PADRÃO
-- =================================================================

-- Seção Hero
INSERT INTO cms_conteudos (secao_id, chave, tipo, label, valor, ordem, obrigatorio, max_caracteres, placeholder, dicas) VALUES
((SELECT id FROM cms_secoes WHERE chave = 'hero'), 'titulo_principal', 'titulo', 'Título Principal', 'Gracie Barra', 1, TRUE, 50, 'Ex: Gracie Barra', 'Título principal da seção hero'),
((SELECT id FROM cms_secoes WHERE chave = 'hero'), 'subtitulo_principal', 'titulo', 'Subtítulo Principal', 'Cidade Nova', 2, TRUE, 50, 'Ex: Cidade Nova', 'Subtítulo que complementa o título principal'),
((SELECT id FROM cms_secoes WHERE chave = 'hero'), 'descricao_hero', 'texto', 'Descrição', 'Jiu-Jitsu para todos os níveis e idades. Venha fazer parte da maior equipe de Jiu-Jitsu do mundo!', 3, TRUE, 200, 'Descreva a academia...', 'Texto descritivo da academia'),
((SELECT id FROM cms_secoes WHERE chave = 'hero'), 'botao_cta_texto', 'texto', 'Texto do Botão', 'Comece Agora', 4, TRUE, 30, 'Ex: Comece Agora', 'Texto do botão de call-to-action'),
((SELECT id FROM cms_secoes WHERE chave = 'hero'), 'imagem_hero', 'imagem', 'Imagem de Fundo', '', 5, FALSE, NULL, NULL, 'Imagem de fundo da seção principal');

-- Seção Sobre
INSERT INTO cms_conteudos (secao_id, chave, tipo, label, valor, ordem, obrigatorio, max_caracteres, placeholder, dicas) VALUES
((SELECT id FROM cms_secoes WHERE chave = 'sobre'), 'titulo_sobre', 'titulo', 'Título da Seção', 'Sobre a Gracie Barra Cidade Nova', 1, TRUE, 60, 'Ex: Sobre Nós', 'Título da seção sobre'),
((SELECT id FROM cms_secoes WHERE chave = 'sobre'), 'texto_sobre', 'texto', 'Texto Sobre', 'A Gracie Barra Cidade Nova é uma academia dedicada ao ensino do Jiu-Jitsu brasileiro, seguindo a metodologia e filosofia da maior organização de Jiu-Jitsu do mundo.', 2, TRUE, 500, 'Conte sobre a academia...', 'Texto descritivo sobre a academia'),
((SELECT id FROM cms_secoes WHERE chave = 'sobre'), 'imagem_sobre', 'imagem', 'Imagem da Seção', '', 3, FALSE, NULL, NULL, 'Imagem representativa da academia');

-- Seção Contato
INSERT INTO cms_conteudos (secao_id, chave, tipo, label, valor, ordem, obrigatorio, max_caracteres, placeholder, dicas) VALUES
((SELECT id FROM cms_secoes WHERE chave = 'contato'), 'titulo_contato', 'titulo', 'Título da Seção', 'Entre em Contato', 1, TRUE, 50, 'Ex: Fale Conosco', 'Título da seção de contato'),
((SELECT id FROM cms_secoes WHERE chave = 'contato'), 'endereco', 'texto', 'Endereço', 'Rua das Palmeiras, 123 - Cidade Nova', 2, TRUE, 150, 'Digite o endereço...', 'Endereço completo da academia'),
((SELECT id FROM cms_secoes WHERE chave = 'contato'), 'telefone', 'texto', 'Telefone', '(11) 99999-9999', 3, TRUE, 20, '(11) 99999-9999', 'Telefone principal da academia'),
((SELECT id FROM cms_secoes WHERE chave = 'contato'), 'email', 'texto', 'E-mail', 'contato@gbcidadenova.com.br', 4, TRUE, 50, 'email@academia.com', 'E-mail principal da academia'),
((SELECT id FROM cms_secoes WHERE chave = 'contato'), 'horario_funcionamento', 'texto', 'Horário de Funcionamento', 'Segunda a Sexta: 6h às 22h\nSábado: 8h às 18h', 5, TRUE, 100, 'Descreva os horários...', 'Horários de funcionamento da academia');

-- Seção CTA
INSERT INTO cms_conteudos (secao_id, chave, tipo, label, valor, ordem, obrigatorio, max_caracteres, placeholder, dicas) VALUES
((SELECT id FROM cms_secoes WHERE chave = 'cta'), 'titulo_cta', 'titulo', 'Título da Seção', 'Comece sua Jornada Hoje', 1, TRUE, 50, 'Ex: Comece Agora', 'Título da seção de call-to-action'),
((SELECT id FROM cms_secoes WHERE chave = 'cta'), 'subtitulo_cta', 'subtitulo', 'Subtítulo', 'Transforme sua vida através do Jiu-Jitsu', 2, TRUE, 80, 'Subtítulo motivacional...', 'Subtítulo da seção de call-to-action'),
((SELECT id FROM cms_secoes WHERE chave = 'cta'), 'botao_cta_principal', 'texto', 'Texto do Botão Principal', 'Agende sua Aula Experimental', 3, TRUE, 40, 'Ex: Agende Agora', 'Texto do botão principal'),
((SELECT id FROM cms_secoes WHERE chave = 'cta'), 'botao_cta_secundario', 'texto', 'Texto do Botão Secundário', 'Saiba Mais', 4, FALSE, 30, 'Ex: Saiba Mais', 'Texto do botão secundário');

-- Seção Footer
INSERT INTO cms_conteudos (secao_id, chave, tipo, label, valor, ordem, obrigatorio, max_caracteres, placeholder, dicas) VALUES
((SELECT id FROM cms_secoes WHERE chave = 'footer'), 'texto_footer', 'texto', 'Texto do Rodapé', '© 2025 Gracie Barra Cidade Nova. Todos os direitos reservados.', 1, TRUE, 100, 'Texto de copyright...', 'Texto de direitos autorais'),
((SELECT id FROM cms_secoes WHERE chave = 'footer'), 'link_instagram', 'link', 'Link Instagram', 'https://instagram.com/gbcidadenova', 2, FALSE, 200, 'https://instagram.com/...', 'Link para Instagram da academia'),
((SELECT id FROM cms_secoes WHERE chave = 'footer'), 'link_facebook', 'link', 'Link Facebook', 'https://facebook.com/gbcidadenova', 3, FALSE, 200, 'https://facebook.com/...', 'Link para Facebook da academia'),
((SELECT id FROM cms_secoes WHERE chave = 'footer'), 'link_whatsapp', 'link', 'Link WhatsApp', 'https://wa.me/5511999999999', 4, FALSE, 200, 'https://wa.me/...', 'Link para WhatsApp da academia');

SET FOREIGN_KEY_CHECKS = 1;