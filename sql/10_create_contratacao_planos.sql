-- ========================================
-- SISTEMA DE CONTRATAÇÃO DE PLANOS
-- Controla planos contratados pelos alunos
-- ========================================

-- Tabela de Contratações de Planos
CREATE TABLE IF NOT EXISTS contratacoes_planos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    plano_id INT NOT NULL,
    formulario_id INT COMMENT 'ID do formulário de origem (se vier de cadastro público)',

    -- Valores no momento da contratação
    valor_contratado DECIMAL(10,2) NOT NULL,
    forma_pagamento ENUM('avista', 'parcelado') NOT NULL DEFAULT 'parcelado',
    valor_pago DECIMAL(10,2) COMMENT 'Valor efetivamente pago (com desconto se à vista)',
    desconto_aplicado DECIMAL(10,2) DEFAULT 0,

    -- Vigência do plano
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,

    -- Status da contratação
    status ENUM('ativa', 'cancelada', 'expirada', 'suspensa') DEFAULT 'ativa',
    motivo_cancelamento TEXT,
    cancelado_por INT,
    data_cancelamento TIMESTAMP NULL,

    -- Mensalidades geradas
    mensalidades_geradas BOOLEAN DEFAULT FALSE,
    total_mensalidades INT COMMENT 'Número de mensalidades que serão geradas',

    -- Link de pagamento (se houver)
    link_pagamento TEXT,
    qr_code_pix TEXT,
    pix_copia_cola TEXT,

    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (plano_id) REFERENCES planos(id),
    FOREIGN KEY (formulario_id) REFERENCES formularios_cadastro(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelado_por) REFERENCES usuarios(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id),

    INDEX idx_aluno (aluno_id),
    INDEX idx_plano (plano_id),
    INDEX idx_status (status),
    INDEX idx_vigencia (data_inicio, data_fim),
    INDEX idx_formulario (formulario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Histórico de Contratações
CREATE TABLE IF NOT EXISTS historico_contratacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contratacao_id INT NOT NULL,
    acao VARCHAR(50) NOT NULL COMMENT 'criacao, cancelamento, suspensao, reativacao',
    descricao TEXT,
    usuario_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (contratacao_id) REFERENCES contratacoes_planos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_contratacao (contratacao_id),
    INDEX idx_acao (acao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar plano_id ao formulário de cadastro
SET @exist_plano := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'formularios_cadastro'
    AND COLUMN_NAME = 'plano_id');

SET @sqlstmt_plano := IF(@exist_plano = 0,
    'ALTER TABLE formularios_cadastro ADD COLUMN plano_id INT COMMENT ''Plano escolhido pelo candidato''',
    'SELECT ''Column plano_id already exists'' as message');

PREPARE stmt_plano FROM @sqlstmt_plano;
EXECUTE stmt_plano;
DEALLOCATE PREPARE stmt_plano;

SET @exist_forma_pag := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'formularios_cadastro'
    AND COLUMN_NAME = 'forma_pagamento_escolhida');

SET @sqlstmt_forma_pag := IF(@exist_forma_pag = 0,
    'ALTER TABLE formularios_cadastro ADD COLUMN forma_pagamento_escolhida ENUM(''avista'', ''parcelado'') DEFAULT ''parcelado''',
    'SELECT ''Column forma_pagamento_escolhida already exists'' as message');

PREPARE stmt_forma_pag FROM @sqlstmt_forma_pag;
EXECUTE stmt_forma_pag;
DEALLOCATE PREPARE stmt_forma_pag;

-- Adicionar FK se não existir
SET @exist_fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'formularios_cadastro'
    AND COLUMN_NAME = 'plano_id'
    AND REFERENCED_TABLE_NAME = 'planos');

SET @sqlstmt_fk := IF(@exist_fk = 0,
    'ALTER TABLE formularios_cadastro ADD FOREIGN KEY (plano_id) REFERENCES planos(id)',
    'SELECT ''FK already exists'' as message');

PREPARE stmt_fk FROM @sqlstmt_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- View para contratações ativas
CREATE OR REPLACE VIEW vw_contratacoes_ativas AS
SELECT
    c.id,
    c.aluno_id,
    u.nome as aluno_nome,
    u.email as aluno_email,
    u.telefone as aluno_telefone,
    p.nome as plano_nome,
    p.tipo as plano_tipo,
    c.valor_contratado,
    c.forma_pagamento,
    c.valor_pago,
    c.desconto_aplicado,
    c.data_inicio,
    c.data_fim,
    DATEDIFF(c.data_fim, CURDATE()) as dias_restantes,
    c.status,
    c.mensalidades_geradas,
    c.total_mensalidades,
    c.created_at
FROM contratacoes_planos c
INNER JOIN alunos a ON c.aluno_id = a.id
INNER JOIN usuarios u ON a.usuario_id = u.id
INNER JOIN planos p ON c.plano_id = p.id
WHERE c.status = 'ativa'
ORDER BY c.created_at DESC;

-- Stored Procedure para criar contratação e gerar mensalidades
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_criar_contratacao_e_mensalidades$$

CREATE PROCEDURE sp_criar_contratacao_e_mensalidades(
    IN p_aluno_id INT,
    IN p_plano_id INT,
    IN p_forma_pagamento VARCHAR(20),
    IN p_formulario_id INT,
    IN p_created_by INT,
    OUT p_contratacao_id INT
)
BEGIN
    DECLARE v_valor_total DECIMAL(10,2);
    DECLARE v_valor_avista DECIMAL(10,2);
    DECLARE v_valor_pago DECIMAL(10,2);
    DECLARE v_desconto DECIMAL(10,2);
    DECLARE v_duracao_meses INT;
    DECLARE v_data_inicio DATE;
    DECLARE v_data_fim DATE;
    DECLARE v_dia_vencimento INT;
    DECLARE v_contador INT DEFAULT 1;
    DECLARE v_mes_ref INT;
    DECLARE v_ano_ref INT;
    DECLARE v_data_vencimento DATE;

    -- Buscar dados do plano
    SELECT valor_total, COALESCE(valor_avista, valor_total), duracao_meses
    INTO v_valor_total, v_valor_avista, v_duracao_meses
    FROM planos
    WHERE id = p_plano_id;

    -- Calcular valor a pagar
    IF p_forma_pagamento = 'avista' THEN
        SET v_valor_pago = v_valor_avista;
        SET v_desconto = v_valor_total - v_valor_avista;
    ELSE
        SET v_valor_pago = v_valor_total;
        SET v_desconto = 0;
    END IF;

    -- Definir vigência
    SET v_data_inicio = CURDATE();
    SET v_data_fim = DATE_ADD(v_data_inicio, INTERVAL v_duracao_meses MONTH);

    -- Buscar dia de vencimento das configurações
    SELECT dia_vencimento INTO v_dia_vencimento
    FROM configuracoes_financeiras
    WHERE ativo = TRUE
    LIMIT 1;

    -- Criar contratação
    INSERT INTO contratacoes_planos (
        aluno_id, plano_id, formulario_id,
        valor_contratado, forma_pagamento, valor_pago, desconto_aplicado,
        data_inicio, data_fim,
        status, total_mensalidades, created_by
    ) VALUES (
        p_aluno_id, p_plano_id, p_formulario_id,
        v_valor_total, p_forma_pagamento, v_valor_pago, v_desconto,
        v_data_inicio, v_data_fim,
        'ativa', v_duracao_meses, p_created_by
    );

    SET p_contratacao_id = LAST_INSERT_ID();

    -- Registrar histórico
    INSERT INTO historico_contratacoes (contratacao_id, acao, descricao, usuario_id)
    VALUES (p_contratacao_id, 'criacao', CONCAT('Contratação criada - Plano: ', p_plano_id, ' - Forma: ', p_forma_pagamento), p_created_by);

    -- Gerar mensalidades
    WHILE v_contador <= v_duracao_meses DO
        SET v_mes_ref = MONTH(DATE_ADD(v_data_inicio, INTERVAL (v_contador - 1) MONTH));
        SET v_ano_ref = YEAR(DATE_ADD(v_data_inicio, INTERVAL (v_contador - 1) MONTH));

        -- Calcular data de vencimento
        SET v_data_vencimento = DATE(CONCAT(v_ano_ref, '-', LPAD(v_mes_ref, 2, '0'), '-', LPAD(v_dia_vencimento, 2, '0')));

        -- Inserir mensalidade
        INSERT INTO mensalidades (
            aluno_id,
            plano_id,
            valor_base,
            valor_total,
            mes_referencia,
            ano_referencia,
            data_vencimento,
            status
        ) VALUES (
            p_aluno_id,
            p_plano_id,
            v_valor_pago / v_duracao_meses,
            v_valor_pago / v_duracao_meses,
            v_mes_ref,
            v_ano_ref,
            v_data_vencimento,
            'pendente'
        );

        SET v_contador = v_contador + 1;
    END WHILE;

    -- Marcar mensalidades como geradas
    UPDATE contratacoes_planos
    SET mensalidades_geradas = TRUE
    WHERE id = p_contratacao_id;

END$$

DELIMITER ;

-- Trigger para notificar quando uma contratação é criada
DELIMITER $$

DROP TRIGGER IF EXISTS trg_notificar_nova_contratacao$$

CREATE TRIGGER trg_notificar_nova_contratacao
AFTER INSERT ON contratacoes_planos
FOR EACH ROW
BEGIN
    DECLARE v_aluno_nome VARCHAR(100);
    DECLARE v_aluno_email VARCHAR(100);
    DECLARE v_plano_nome VARCHAR(100);
    DECLARE v_mensagem TEXT;

    -- Buscar dados do aluno
    SELECT u.nome, u.email
    INTO v_aluno_nome, v_aluno_email
    FROM alunos a
    INNER JOIN usuarios u ON a.usuario_id = u.id
    WHERE a.id = NEW.aluno_id;

    -- Buscar nome do plano
    SELECT nome INTO v_plano_nome
    FROM planos
    WHERE id = NEW.plano_id;

    -- Criar mensagem
    SET v_mensagem = CONCAT(
        'Olá ', v_aluno_nome, '!\n\n',
        'Sua contratação do ', v_plano_nome, ' foi confirmada!\n',
        'Valor: R$ ', FORMAT(NEW.valor_pago, 2), '\n',
        'Forma de pagamento: ', IF(NEW.forma_pagamento = 'avista', 'À Vista', 'Parcelado'), '\n',
        'Vigência: ', DATE_FORMAT(NEW.data_inicio, '%d/%m/%Y'), ' até ', DATE_FORMAT(NEW.data_fim, '%d/%m/%Y'), '\n\n',
        'Em breve você receberá os links de pagamento por e-mail.'
    );

    -- Inserir notificação de pagamento
    INSERT INTO notificacoes_pagamento (
        mensalidade_id,
        aluno_id,
        tipo,
        canal,
        destinatario,
        assunto,
        mensagem
    ) VALUES (
        NULL,
        NEW.aluno_id,
        'pago',
        'email',
        v_aluno_email,
        CONCAT('Contratação confirmada - ', v_plano_nome),
        v_mensagem
    );
END$$

DELIMITER ;
