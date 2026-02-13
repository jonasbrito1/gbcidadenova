-- ================================================================
-- MIGRAÇÃO GRACIE BARRA - HOSTINGER
-- Database: u674882802_gb
-- User: u674882802_jonasgb
-- ================================================================

-- Definir charset padrão
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- ================================================================
-- TABELAS FALTANTES NO HOSTINGER
-- ================================================================

-- Tabela: assinaturas
CREATE TABLE IF NOT EXISTS `assinaturas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aluno_id` int(11) NOT NULL,
  `plano_id` int(11) NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date DEFAULT NULL,
  `status` enum('ativa','cancelada','suspensa','expirada') DEFAULT 'ativa',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aluno_id` (`aluno_id`),
  KEY `plano_id` (`plano_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: bandeiras_pagamento
CREATE TABLE IF NOT EXISTS `bandeiras_pagamento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `taxa_percentual` decimal(5,2) DEFAULT 0.00,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: cms_conteudos
CREATE TABLE IF NOT EXISTS `cms_conteudos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `secao_id` int(11) NOT NULL,
  `chave` varchar(100) NOT NULL,
  `tipo` enum('texto','imagem','html','lista') NOT NULL,
  `valor` text,
  `ordem` int(11) DEFAULT 0,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `secao_id` (`secao_id`),
  KEY `chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: cms_historico
CREATE TABLE IF NOT EXISTS `cms_historico` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conteudo_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `valor_anterior` text,
  `valor_novo` text,
  `acao` enum('criacao','edicao','exclusao') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `conteudo_id` (`conteudo_id`),
  KEY `usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: cms_secoes
CREATE TABLE IF NOT EXISTS `cms_secoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `identificador` varchar(50) NOT NULL,
  `descricao` text,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identificador` (`identificador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: cms_uploads
CREATE TABLE IF NOT EXISTS `cms_uploads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conteudo_id` int(11) DEFAULT NULL,
  `nome_original` varchar(255) NOT NULL,
  `nome_arquivo` varchar(255) NOT NULL,
  `caminho` varchar(500) NOT NULL,
  `tipo_mime` varchar(100) DEFAULT NULL,
  `tamanho` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `conteudo_id` (`conteudo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: conciliacao_bancaria
CREATE TABLE IF NOT EXISTS `conciliacao_bancaria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pagamento_id` int(11) DEFAULT NULL,
  `data_conciliacao` date NOT NULL,
  `valor_conciliado` decimal(10,2) NOT NULL,
  `status` enum('pendente','conciliado','divergente') DEFAULT 'pendente',
  `observacoes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pagamento_id` (`pagamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: configuracoes_financeiras
CREATE TABLE IF NOT EXISTS `configuracoes_financeiras` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chave` varchar(100) NOT NULL,
  `valor` text,
  `tipo` enum('texto','numero','booleano','json') DEFAULT 'texto',
  `descricao` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: configuracoes_gateway
CREATE TABLE IF NOT EXISTS `configuracoes_gateway` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_gateway` varchar(50) NOT NULL,
  `chave_api` varchar(255) DEFAULT NULL,
  `chave_secreta` varchar(255) DEFAULT NULL,
  `ambiente` enum('teste','producao') DEFAULT 'teste',
  `ativo` tinyint(1) DEFAULT 1,
  `configuracoes_json` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: contratacoes_planos
CREATE TABLE IF NOT EXISTS `contratacoes_planos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aluno_id` int(11) NOT NULL,
  `plano_id` int(11) NOT NULL,
  `forma_pagamento` enum('boleto','cartao_credito','pix','dinheiro') NOT NULL,
  `valor_contratado` decimal(10,2) NOT NULL,
  `data_contratacao` datetime DEFAULT CURRENT_TIMESTAMP,
  `data_vencimento` date DEFAULT NULL,
  `status` enum('ativa','cancelada','suspensa','finalizada') DEFAULT 'ativa',
  `observacoes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aluno_id` (`aluno_id`),
  KEY `plano_id` (`plano_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: descontos_promocoes
CREATE TABLE IF NOT EXISTS `descontos_promocoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `tipo_desconto` enum('percentual','fixo') DEFAULT 'percentual',
  `valor_desconto` decimal(10,2) NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date NOT NULL,
  `ativo` tinyint(1) DEFAULT 1,
  `limite_uso` int(11) DEFAULT NULL,
  `usos_realizados` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: formularios_cadastro
CREATE TABLE IF NOT EXISTS `formularios_cadastro` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(200) NOT NULL,
  `data_nascimento` date NOT NULL,
  `telefone` varchar(20) NOT NULL,
  `email` varchar(200) NOT NULL,
  `endereco` varchar(500) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `responsavel_nome` varchar(100) DEFAULT NULL,
  `responsavel_telefone` varchar(20) DEFAULT NULL,
  `contato_emergencia_nome` varchar(200) DEFAULT NULL,
  `contato_emergencia_telefone` varchar(20) DEFAULT NULL,
  `contato_emergencia_parentesco` varchar(50) DEFAULT NULL,
  `tipo_sanguineo` varchar(10) DEFAULT NULL,
  `condicoes_medicas` text,
  `medicamentos_uso` text,
  `alergias` text,
  `plano_saude` varchar(100) DEFAULT NULL,
  `ja_treinou_jiu_jitsu` enum('sim','nao') DEFAULT 'nao',
  `graduacao_atual` varchar(50) DEFAULT NULL,
  `tempo_treino` varchar(100) DEFAULT NULL,
  `responsavel_id` int(11) DEFAULT NULL,
  `possui_responsavel` tinyint(1) DEFAULT 0,
  `status` enum('pendente','aprovado','rejeitado') DEFAULT 'pendente',
  `observacoes_admin` text,
  `usuario_id` int(11) DEFAULT NULL,
  `aluno_id` int(11) DEFAULT NULL,
  `analisado_por` int(11) DEFAULT NULL,
  `data_analise` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `plano_id` int(11) DEFAULT NULL,
  `forma_pagamento_escolhida` enum('parcelado','avista') DEFAULT 'parcelado',
  `responsavel_legal_nome` varchar(200) DEFAULT NULL,
  `responsavel_legal_telefone` varchar(20) DEFAULT NULL,
  `responsavel_legal_email` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `status` (`status`),
  KEY `plano_id` (`plano_id`),
  KEY `analisado_por` (`analisado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: graduacoes_sistema
CREATE TABLE IF NOT EXISTS `graduacoes_sistema` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `faixa` varchar(50) NOT NULL,
  `grau` int(11) DEFAULT NULL,
  `ordem` int(11) NOT NULL,
  `cor_hex` varchar(7) DEFAULT NULL,
  `categoria` enum('infantil','juvenil','adulto') DEFAULT 'adulto',
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ordem` (`ordem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: historico_contratacoes
CREATE TABLE IF NOT EXISTS `historico_contratacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contratacao_id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `acao` enum('criacao','alteracao','cancelamento','suspensao','reativacao') NOT NULL,
  `descricao` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contratacao_id` (`contratacao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: historico_financeiro
CREATE TABLE IF NOT EXISTS `historico_financeiro` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_registro` enum('pagamento','estorno','desconto','taxa') NOT NULL,
  `registro_id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `acao` varchar(100) NOT NULL,
  `detalhes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tipo_registro` (`tipo_registro`,`registro_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: logs_seguranca (atualizada)
CREATE TABLE IF NOT EXISTS `logs_seguranca` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `tipo_evento` varchar(50) NOT NULL,
  `descricao` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `tipo_evento` (`tipo_evento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: mensalidades
CREATE TABLE IF NOT EXISTS `mensalidades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aluno_id` int(11) NOT NULL,
  `plano_id` int(11) DEFAULT NULL,
  `mes_referencia` date NOT NULL,
  `valor_original` decimal(10,2) NOT NULL,
  `valor_final` decimal(10,2) NOT NULL,
  `data_vencimento` date NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `status` enum('pendente','pago','atrasado','cancelado') DEFAULT 'pendente',
  `forma_pagamento` enum('boleto','cartao_credito','pix','dinheiro') DEFAULT NULL,
  `observacoes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aluno_id` (`aluno_id`),
  KEY `status` (`status`),
  KEY `mes_referencia` (`mes_referencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: mensalidades_descontos
CREATE TABLE IF NOT EXISTS `mensalidades_descontos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mensalidade_id` int(11) NOT NULL,
  `desconto_id` int(11) DEFAULT NULL,
  `tipo_desconto` enum('percentual','fixo') NOT NULL,
  `valor_desconto` decimal(10,2) NOT NULL,
  `motivo` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `mensalidade_id` (`mensalidade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: notificacoes_pagamento
CREATE TABLE IF NOT EXISTS `notificacoes_pagamento` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aluno_id` int(11) NOT NULL,
  `mensalidade_id` int(11) DEFAULT NULL,
  `tipo` enum('vencimento','atraso','confirmacao','falha') NOT NULL,
  `canal` enum('email','sms','whatsapp','sistema') NOT NULL,
  `mensagem` text,
  `enviado_em` datetime DEFAULT NULL,
  `status_envio` enum('pendente','enviado','falhou') DEFAULT 'pendente',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aluno_id` (`aluno_id`),
  KEY `mensalidade_id` (`mensalidade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: pagamentos_detalhes
CREATE TABLE IF NOT EXISTS `pagamentos_detalhes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pagamento_id` int(11) NOT NULL,
  `bandeira_id` int(11) DEFAULT NULL,
  `numero_parcelas` int(11) DEFAULT 1,
  `valor_parcela` decimal(10,2) DEFAULT NULL,
  `taxa_processamento` decimal(10,2) DEFAULT 0.00,
  `codigo_autorizacao` varchar(100) DEFAULT NULL,
  `nsu` varchar(100) DEFAULT NULL,
  `tid` varchar(100) DEFAULT NULL,
  `dados_adicionais` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pagamento_id` (`pagamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: parcelamentos
CREATE TABLE IF NOT EXISTS `parcelamentos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mensalidade_id` int(11) NOT NULL,
  `numero_parcelas` int(11) NOT NULL,
  `parcela_atual` int(11) NOT NULL,
  `valor_parcela` decimal(10,2) NOT NULL,
  `data_vencimento` date NOT NULL,
  `status` enum('pendente','pago','atrasado') DEFAULT 'pendente',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `mensalidade_id` (`mensalidade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: responsaveis
CREATE TABLE IF NOT EXISTS `responsaveis` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(200) NOT NULL,
  `cpf` varchar(14) DEFAULT NULL,
  `telefone` varchar(20) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `parentesco` varchar(50) DEFAULT NULL,
  `endereco` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: transacoes_financeiras
CREATE TABLE IF NOT EXISTS `transacoes_financeiras` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mensalidade_id` int(11) DEFAULT NULL,
  `tipo_transacao` enum('entrada','saida','estorno') NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `descricao` text,
  `data_transacao` datetime NOT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `mensalidade_id` (`mensalidade_id`),
  KEY `tipo_transacao` (`tipo_transacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: transacoes_gateway
CREATE TABLE IF NOT EXISTS `transacoes_gateway` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pagamento_id` int(11) NOT NULL,
  `gateway_nome` varchar(50) NOT NULL,
  `transacao_id_gateway` varchar(255) DEFAULT NULL,
  `status_gateway` varchar(50) DEFAULT NULL,
  `valor` decimal(10,2) NOT NULL,
  `resposta_gateway` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pagamento_id` (`pagamento_id`),
  KEY `transacao_id_gateway` (`transacao_id_gateway`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: turmas
CREATE TABLE IF NOT EXISTS `turmas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descricao` text,
  `professor_id` int(11) DEFAULT NULL,
  `horario` varchar(100) DEFAULT NULL,
  `dias_semana` varchar(100) DEFAULT NULL,
  `capacidade_maxima` int(11) DEFAULT NULL,
  `nivel` enum('iniciante','intermediario','avancado','todos') DEFAULT 'todos',
  `ativa` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `professor_id` (`professor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: webhooks_financeiros
CREATE TABLE IF NOT EXISTS `webhooks_financeiros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gateway_nome` varchar(50) NOT NULL,
  `evento` varchar(100) NOT NULL,
  `payload` text,
  `processado` tinyint(1) DEFAULT 0,
  `processado_em` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `processado` (`processado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- INSERIR DADOS INICIAIS - PLANOS (do sistema local)
-- ================================================================

INSERT INTO `planos` (`id`, `nome`, `descricao`, `valor_mensal`, `duracao_meses`, `aulas_por_semana`, `status`, `valor_avista`, `beneficios`, `tipo`, `destaque`, `valor_total`) VALUES
(5, 'Plano Mensal', 'Plano básico com renovação mensal', 140.00, 1, 0, 'ativo', 119.00, '[\"Aulas todos os dias\",\"Todos os programas GB\",\"Horários flexíveis\",\"Suporte técnico\"]', 'mensal', 0, 140.00),
(6, 'Plano 3 Meses', 'Plano trimestral com desconto progressivo', 140.00, 3, 0, 'ativo', 357.00, '[\"Aulas todos os dias\",\"Todos os programas GB\",\"Horários flexíveis\",\"Suporte técnico personalizado\",\"Avaliação de progresso\"]', 'trimestral', 0, 420.00),
(7, 'Plano 6 Meses', 'Plano semestral - O mais escolhido pelos alunos', 130.00, 6, 0, 'ativo', 663.00, '[\"Aulas todos os dias\",\"Todos os programas GB\",\"Prioridade nos horários\",\"Mentoria individual mensal\",\"Participação em eventos\",\"Kit Gracie Barra incluso\"]', 'semestral', 1, 780.00),
(8, 'Plano 1 Ano', 'Plano anual premium com máximo benefício', 120.00, 12, 0, 'ativo', 1224.00, '[\"Aulas todos os dias\",\"Todos os programas GB\",\"Acesso VIP aos eventos\",\"Coaching personalizado\",\"Seminários exclusivos\",\"Kit Gracie Barra Premium\",\"Programa de fidelidade\"]', 'anual', 0, 1440.00)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  descricao = VALUES(descricao),
  valor_mensal = VALUES(valor_mensal),
  valor_avista = VALUES(valor_avista),
  beneficios = VALUES(beneficios),
  tipo = VALUES(tipo),
  destaque = VALUES(destaque),
  valor_total = VALUES(valor_total);

-- ================================================================
-- INSERIR GRADUAÇÕES PADRÃO
-- ================================================================

INSERT INTO `graduacoes_sistema` (`nome`, `faixa`, `grau`, `ordem`, `cor_hex`, `categoria`, `ativo`) VALUES
('Faixa Branca', 'Branca', 0, 1, '#FFFFFF', 'adulto', 1),
('Faixa Cinza', 'Cinza', 0, 2, '#808080', 'infantil', 1),
('Faixa Amarela', 'Amarela', 0, 3, '#FFD700', 'infantil', 1),
('Faixa Laranja', 'Laranja', 0, 4, '#FFA500', 'infantil', 1),
('Faixa Verde', 'Verde', 0, 5, '#008000', 'infantil', 1),
('Faixa Azul', 'Azul', 0, 6, '#0000FF', 'adulto', 1),
('Faixa Roxa', 'Roxa', 0, 7, '#800080', 'adulto', 1),
('Faixa Marrom', 'Marrom', 0, 8, '#8B4513', 'adulto', 1),
('Faixa Preta', 'Preta', 1, 9, '#000000', 'adulto', 1),
('Faixa Preta 2º Grau', 'Preta', 2, 10, '#000000', 'adulto', 1),
('Faixa Preta 3º Grau', 'Preta', 3, 11, '#000000', 'adulto', 1),
('Faixa Preta 4º Grau', 'Preta', 4, 12, '#000000', 'adulto', 1),
('Faixa Preta 5º Grau', 'Preta', 5, 13, '#000000', 'adulto', 1)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- ================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ================================================================
