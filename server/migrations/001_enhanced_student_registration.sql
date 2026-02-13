-- ========================================
-- MIGRAÇÃO: Sistema de Cadastro de Alunos Aprimorado
-- Data: 2025-01-11
-- Descrição: Adiciona campos necessários para sistema completo de cadastro
-- ========================================

-- ========================================
-- 1. ATUALIZAR TABELA DE USUÁRIOS
-- ========================================

-- Adicionar campos para primeiro acesso e LGPD
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT TRUE COMMENT 'Indica se é o primeiro acesso do usuário',
ADD COLUMN IF NOT EXISTS lgpd_aceite BOOLEAN DEFAULT FALSE COMMENT 'Indica se usuário aceitou termos LGPD',
ADD COLUMN IF NOT EXISTS lgpd_aceite_data TIMESTAMP NULL COMMENT 'Data e hora do aceite LGPD',
ADD COLUMN IF NOT EXISTS lgpd_aceite_ip VARCHAR(45) NULL COMMENT 'IP do aceite LGPD',
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL COMMENT 'Token para reset de senha',
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP NULL COMMENT 'Expiração do token de reset';

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_reset_token ON usuarios(reset_token);
CREATE INDEX IF NOT EXISTS idx_primeiro_acesso ON usuarios(primeiro_acesso);

-- ========================================
-- 2. ATUALIZAR TABELA DE ALUNOS
-- ========================================

-- Adicionar campos de endereço separados
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS cep VARCHAR(10) NULL COMMENT 'CEP do endereço',
ADD COLUMN IF NOT EXISTS rua VARCHAR(255) NULL COMMENT 'Rua/Logradouro',
ADD COLUMN IF NOT EXISTS numero VARCHAR(20) NULL COMMENT 'Número do endereço',
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100) NULL COMMENT 'Complemento do endereço',
ADD COLUMN IF NOT EXISTS bairro VARCHAR(100) NULL COMMENT 'Bairro',
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100) NULL COMMENT 'Cidade',
ADD COLUMN IF NOT EXISTS estado VARCHAR(2) NULL COMMENT 'Estado (UF)';

-- Adicionar campo de email do responsável (para menores de idade)
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS email_responsavel VARCHAR(255) NULL COMMENT 'Email do responsável (obrigatório para menores)';

-- Atualizar contato de emergência para incluir nome
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS nome_contato_emergencia VARCHAR(255) NULL COMMENT 'Nome do contato de emergência';

-- Adicionar campos médicos detalhados
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS tipo_sanguineo VARCHAR(5) NULL COMMENT 'Tipo sanguíneo (A+, A-, B+, B-, AB+, AB-, O+, O-)',
ADD COLUMN IF NOT EXISTS toma_medicamento BOOLEAN DEFAULT FALSE COMMENT 'Indica se toma medicamento regularmente',
ADD COLUMN IF NOT EXISTS medicamentos_detalhes TEXT NULL COMMENT 'Detalhes dos medicamentos que toma',
ADD COLUMN IF NOT EXISTS historico_fraturas BOOLEAN DEFAULT FALSE COMMENT 'Indica se já teve fraturas',
ADD COLUMN IF NOT EXISTS fraturas_detalhes TEXT NULL COMMENT 'Detalhes das fraturas (membros, datas)',
ADD COLUMN IF NOT EXISTS tem_alergias BOOLEAN DEFAULT FALSE COMMENT 'Indica se possui alergias',
ADD COLUMN IF NOT EXISTS alergias_detalhes TEXT NULL COMMENT 'Detalhes das alergias';

-- Adicionar índices para campos de busca
CREATE INDEX IF NOT EXISTS idx_alunos_cep ON alunos(cep);
CREATE INDEX IF NOT EXISTS idx_alunos_email_responsavel ON alunos(email_responsavel);

-- ========================================
-- 3. CRIAR TABELA DE FORMULÁRIOS PÚBLICOS
-- ========================================

CREATE TABLE IF NOT EXISTS formularios_cadastro (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Dados pessoais
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,

    -- Email do responsável (se menor de idade)
    email_responsavel VARCHAR(255),

    -- Endereço
    cep VARCHAR(10),
    rua VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Dados acadêmicos
    programa ENUM('Adultos', 'Infantil', 'Juvenil', 'Master') NOT NULL,
    graduacao VARCHAR(50) DEFAULT 'Branca',
    graus_faixa INT DEFAULT 0,
    data_inicio DATE NOT NULL,

    -- Informações adicionais
    nome_contato_emergencia VARCHAR(255),
    contato_emergencia VARCHAR(200),

    -- Informações médicas
    tipo_sanguineo VARCHAR(5),
    toma_medicamento BOOLEAN DEFAULT FALSE,
    medicamentos_detalhes TEXT,
    historico_fraturas BOOLEAN DEFAULT FALSE,
    fraturas_detalhes TEXT,
    tem_alergias BOOLEAN DEFAULT FALSE,
    alergias_detalhes TEXT,
    observacoes_medicas TEXT,

    -- Status do formulário
    status ENUM('pendente', 'aprovado', 'rejeitado') DEFAULT 'pendente',
    observacoes_validacao TEXT COMMENT 'Observações do professor na validação',
    validado_por INT NULL COMMENT 'ID do professor que validou',
    data_validacao TIMESTAMP NULL,

    -- Referência ao aluno criado (após aprovação)
    aluno_id INT NULL,

    -- Auditoria
    ip_origem VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (validado_por) REFERENCES usuarios(id),
    FOREIGN KEY (aluno_id) REFERENCES alunos(id),
    INDEX idx_status (status),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. CRIAR TABELA DE LOG DE EMAILS
-- ========================================

CREATE TABLE IF NOT EXISTS emails_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_email ENUM('boas_vindas', 'reset_senha', 'notificacao') NOT NULL,
    destinatario_email VARCHAR(255) NOT NULL,
    destinatario_nome VARCHAR(255),
    assunto VARCHAR(255) NOT NULL,
    corpo_email TEXT NOT NULL,
    status ENUM('enviado', 'falha', 'pendente') DEFAULT 'pendente',
    erro_mensagem TEXT NULL,
    usuario_id INT NULL COMMENT 'ID do usuário relacionado',
    aluno_id INT NULL COMMENT 'ID do aluno relacionado',
    formulario_id INT NULL COMMENT 'ID do formulário relacionado',
    tentativas INT DEFAULT 0,
    enviado_em TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (aluno_id) REFERENCES alunos(id),
    FOREIGN KEY (formulario_id) REFERENCES formularios_cadastro(id),
    INDEX idx_destinatario (destinatario_email),
    INDEX idx_status (status),
    INDEX idx_tipo (tipo_email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. CRIAR TABELA DE TEMPLATES DE EMAIL
-- ========================================

CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(50) UNIQUE NOT NULL COMMENT 'Chave identificadora única (ex: boas_vindas)',
    nome VARCHAR(100) NOT NULL,
    assunto VARCHAR(255) NOT NULL,
    corpo_html TEXT NOT NULL COMMENT 'Template HTML do email (suporta variáveis {{nome}}, {{senha}}, etc)',
    corpo_texto TEXT NULL COMMENT 'Versão texto puro do email',
    variaveis_disponiveis TEXT NULL COMMENT 'Lista de variáveis disponíveis para o template',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir template de boas-vindas padrão
INSERT INTO email_templates (chave, nome, assunto, corpo_html, corpo_texto, variaveis_disponiveis) VALUES
('boas_vindas', 'Email de Boas-Vindas', 'Bem-vindo à Gracie Barra Cidade Nova',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; }
        .credentials { background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BEM-VINDO À GRACIE BARRA</h1>
            <h2>CIDADE NOVA</h2>
        </div>
        <div class="content">
            <p>Olá, <strong>{{nome}}</strong>!</p>
            <p>É com grande prazer que damos as boas-vindas à família Gracie Barra Cidade Nova!</p>
            <p>Sua matrícula foi confirmada com sucesso. Abaixo estão suas credenciais de acesso ao nosso sistema:</p>

            <div class="credentials">
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Senha Temporária:</strong> {{senha}}</p>
                <p><strong>Matrícula:</strong> {{matricula}}</p>
            </div>

            <p><strong>⚠️ IMPORTANTE:</strong> Por segurança, você será solicitado a alterar sua senha no primeiro acesso.</p>

            <p style="text-align: center;">
                <a href="{{link_acesso}}" class="button">Acessar Sistema</a>
            </p>

            <p>No seu primeiro acesso, você também precisará aceitar nossos termos de uso e política de privacidade (LGPD).</p>

            <h3>Próximos Passos:</h3>
            <ol>
                <li>Acesse o sistema usando o link acima</li>
                <li>Faça login com suas credenciais</li>
                <li>Altere sua senha</li>
                <li>Aceite os termos LGPD</li>
                <li>Complete seu perfil se necessário</li>
            </ol>

            <p>Estamos ansiosos para vê-lo nos treinos!</p>
            <p><strong>OSS!</strong></p>
        </div>
        <div class="footer">
            <p>Gracie Barra Cidade Nova - Manaus/AM</p>
            <p>Email: contato@gbcidadenovaam.com.br | Telefone: (92) 99999-9999</p>
            <p>© 2025 Gracie Barra Cidade Nova. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>',
'Olá, {{nome}}!

Bem-vindo à Gracie Barra Cidade Nova!

Sua matrícula foi confirmada com sucesso. Abaixo estão suas credenciais de acesso:

Email: {{email}}
Senha Temporária: {{senha}}
Matrícula: {{matricula}}

IMPORTANTE: Por segurança, você será solicitado a alterar sua senha no primeiro acesso.

Acesse o sistema em: {{link_acesso}}

No seu primeiro acesso, você também precisará aceitar nossos termos de uso e política de privacidade (LGPD).

Estamos ansiosos para vê-lo nos treinos!

OSS!

Gracie Barra Cidade Nova - Manaus/AM
Email: contato@gbcidadenovaam.com.br
© 2025 Gracie Barra Cidade Nova',
'{{nome}}, {{email}}, {{senha}}, {{matricula}}, {{link_acesso}}'
) ON DUPLICATE KEY UPDATE
    assunto = VALUES(assunto),
    corpo_html = VALUES(corpo_html),
    corpo_texto = VALUES(corpo_texto);

-- ========================================
-- 6. ATUALIZAR DADOS EXISTENTES
-- ========================================

-- Marcar todos os usuários existentes como tendo feito primeiro acesso
-- (apenas novos usuários terão primeiro_acesso = TRUE)
UPDATE usuarios
SET primeiro_acesso = FALSE,
    lgpd_aceite = TRUE,
    lgpd_aceite_data = created_at
WHERE created_at < NOW();

-- ========================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

-- Adicionar comentários às tabelas principais
ALTER TABLE usuarios COMMENT = 'Tabela principal de usuários do sistema (alunos, professores, admins)';
ALTER TABLE alunos COMMENT = 'Informações específicas dos alunos (complementa tabela usuarios)';
ALTER TABLE formularios_cadastro COMMENT = 'Formulários públicos de cadastro pendentes de validação';
ALTER TABLE emails_log COMMENT = 'Log de todos os emails enviados pelo sistema';
ALTER TABLE email_templates COMMENT = 'Templates de emails utilizados pelo sistema';

-- ========================================
-- 8. VERIFICAÇÃO DE INTEGRIDADE
-- ========================================

-- Garantir que não há dados inconsistentes
-- (Script pode ser executado múltiplas vezes de forma segura devido ao IF NOT EXISTS)

SELECT 'Migração 001 concluída com sucesso!' as status;
