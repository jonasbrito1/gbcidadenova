-- Criar tabelas para o CMS
USE gracie_barra_db;

-- Tabela para seções do CMS
CREATE TABLE IF NOT EXISTS cms_secoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ordem INT NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chave (chave),
    INDEX idx_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para conteúdos do CMS
CREATE TABLE IF NOT EXISTS cms_conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    secao_id INT NOT NULL,
    chave VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    tipo ENUM('texto', 'textarea', 'imagem', 'cor', 'titulo', 'subtitulo', 'link', 'html') NOT NULL,
    valor TEXT,
    alt_text VARCHAR(255),
    ordem INT NOT NULL DEFAULT 0,
    obrigatorio BOOLEAN DEFAULT FALSE,
    max_caracteres INT DEFAULT NULL,
    placeholder VARCHAR(255),
    dicas TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (secao_id) REFERENCES cms_secoes(id) ON DELETE CASCADE,
    INDEX idx_secao_id (secao_id),
    INDEX idx_chave (chave),
    INDEX idx_ordem (ordem),
    UNIQUE KEY unique_secao_chave (secao_id, chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir seções padrão
INSERT IGNORE INTO cms_secoes (id, chave, nome, descricao, ordem) VALUES
(1, 'hero', 'Seção Principal', 'Banner principal do site', 1),
(2, 'sobre', 'Sobre Nós', 'Informações sobre a academia', 2),
(3, 'carrossel', 'Carrossel de Imagens', 'Galeria principal', 3),
(4, 'depoimento', 'Depoimento do Mestre', 'Citação do Mestre Carlos Gracie Jr.', 4),
(5, 'professores', 'Professores', 'Equipe de instrutores', 5),
(6, 'horarios', 'Horários de Treino', 'Cronograma das aulas', 6),
(7, 'planos', 'Planos de Pagamento', 'Valores e modalidades', 7),
(8, 'contato', 'Contato', 'Informações de contato', 8),
(9, 'footer', 'Rodapé', 'Rodapé do site', 9);

-- Inserir conteúdos padrão
INSERT IGNORE INTO cms_conteudos (id, secao_id, chave, label, tipo, valor, ordem) VALUES
-- Hero Section
(1, 1, 'titulo_principal', 'Título Principal', 'texto', 'Gracie Barra', 1),
(2, 1, 'subtitulo_principal', 'Subtítulo', 'texto', 'Tradição em Jiu-Jitsu', 2),
(3, 1, 'imagem_hero_principal', 'Imagem Principal (Gracie Barra)', 'imagem', '/uploads/cms/default-gb-logo.jpg', 3),
(4, 1, 'titulo_secundario', 'Título Secundário', 'texto', 'Cidade Nova', 4),
(5, 1, 'subtitulo_secundario', 'Subtítulo Secundário', 'texto', 'Manaus - AM', 5),
(6, 1, 'imagem_hero_secundaria', 'Imagem Secundária (Cidade)', 'imagem', '/uploads/cms/default-cidade.jpg', 6),

-- Sobre Section
(7, 2, 'titulo_sobre', 'Título da Seção', 'texto', 'Uma comunidade global', 1),
(8, 2, 'texto_sobre', 'Texto Descritivo', 'textarea', 'A Gracie Barra é mais que uma academia de Jiu-Jitsu. Somos uma comunidade global dedicada ao crescimento pessoal através da arte suave.', 2),
(9, 2, 'cor_fundo_sobre', 'Cor de Fundo da Seção', 'cor', '#ffffff', 3),

-- Carrossel Section
(10, 3, 'carrossel_imagem_1', 'Imagem 1 do Carrossel', 'imagem', '/uploads/cms/default-carousel-1.jpg', 1),
(11, 3, 'carrossel_titulo_1', 'Título Imagem 1', 'texto', 'Treinos de Alta Qualidade', 2),
(12, 3, 'carrossel_descricao_1', 'Descrição Imagem 1', 'textarea', 'Metodologia comprovada com instrutores certificados pela Gracie Barra.', 3),
(13, 3, 'carrossel_imagem_2', 'Imagem 2 do Carrossel', 'imagem', '/uploads/cms/default-carousel-2.jpg', 4),
(14, 3, 'carrossel_titulo_2', 'Título Imagem 2', 'texto', 'Comunidade Unida', 5),
(15, 3, 'carrossel_descricao_2', 'Descrição Imagem 2', 'textarea', 'Faça parte de uma família que se apoia mutuamente no crescimento.', 6),

-- Depoimento Section
(16, 4, 'depoimento_texto', 'Texto do Depoimento', 'textarea', 'Minha vida é dedicada ao Jiu-Jitsu. Meu objetivo sempre foi construir uma irmandade para liderar a expansão do Jiu-Jitsu, respeitando sempre a essência da nossa arte.', 1),
(17, 4, 'depoimento_autor', 'Autor do Depoimento', 'texto', 'Mestre Carlos Gracie Jr.', 2),
(18, 4, 'depoimento_imagem_fundo', 'Imagem de Fundo', 'imagem', '/uploads/cms/default-depoimento-bg.jpg', 3),

-- Professores Section
(19, 5, 'professor_1_nome', 'Nome Professor 1', 'texto', 'Professor João Silva', 1),
(20, 5, 'professor_1_foto', 'Foto Professor 1', 'imagem', '/uploads/cms/default-professor-1.jpg', 2),
(21, 5, 'professor_2_nome', 'Nome Professor 2', 'texto', 'Professor Maria Santos', 3),
(22, 5, 'professor_2_foto', 'Foto Professor 2', 'imagem', '/uploads/cms/default-professor-2.jpg', 4),

-- Horários Section
(23, 6, 'horario_segunda', 'Segunda-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avançados\n20:00 - Competition Team', 1),
(24, 6, 'horario_terca', 'Terça-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avançados\n20:00 - No-Gi', 2),
(25, 6, 'horario_quarta', 'Quarta-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avançados\n20:00 - Competition Team', 3),
(26, 6, 'horario_quinta', 'Quinta-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avançados\n20:00 - No-Gi', 4),
(27, 6, 'horario_sexta', 'Sexta-feira', 'textarea', '06:00 - Fundamentais\n19:00 - Avançados\n20:00 - Open Mat', 5),
(28, 6, 'horario_sabado', 'Sábado', 'textarea', '08:00 - Kids\n09:00 - Fundamentais\n10:00 - Avançados', 6),
(29, 6, 'horario_domingo', 'Domingo', 'texto', 'Fechado', 7),
(30, 6, 'cor_fundo_horarios', 'Cor de Fundo da Seção', 'cor', '#f8f9fa', 8),

-- Planos Section
(31, 7, 'plano_1_nome', 'Nome do Plano 1', 'texto', 'Plano Básico', 1),
(32, 7, 'plano_1_preco', 'Preço do Plano 1', 'texto', 'R$ 150,00/mês', 2),
(33, 7, 'plano_1_descricao', 'Descrição do Plano 1', 'textarea', '2x por semana\nAcesso às aulas fundamentais\nKimono incluso', 3),
(34, 7, 'plano_2_nome', 'Nome do Plano 2', 'texto', 'Plano Completo', 4),
(35, 7, 'plano_2_preco', 'Preço do Plano 2', 'texto', 'R$ 220,00/mês', 5),
(36, 7, 'plano_2_descricao', 'Descrição do Plano 2', 'textarea', 'Ilimitado\nTodas as aulas\nKimono + Rashguard inclusos\nSeminários gratuitos', 6),

-- Contato Section
(37, 8, 'endereco_completo', 'Endereço Completo', 'textarea', 'Rua das Palmeiras, 123\nCidade Nova\nManaus - AM\nCEP: 69000-000', 1),
(38, 8, 'telefone_principal', 'Telefone Principal', 'texto', '(92) 99999-9999', 2),
(39, 8, 'email_contato', 'E-mail de Contato', 'texto', 'contato@gbcidadenova.com.br', 3),
(40, 8, 'cor_fundo_contato', 'Cor de Fundo da Seção', 'cor', '#ffffff', 4),

-- Footer Section
(41, 9, 'texto_copyright', 'Texto de Copyright', 'texto', '© 2025 Gracie Barra Cidade Nova. Todos os direitos reservados.', 1);