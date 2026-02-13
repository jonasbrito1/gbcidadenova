-- Migração 004: Sistema de Recorrência de Pagamentos

-- Tabela de recorrências de pagamento
CREATE TABLE IF NOT EXISTS pagamentos_recorrentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    plano_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL COMMENT 'Valor da mensalidade',
    dia_vencimento INT NOT NULL COMMENT 'Dia do mês para vencimento (1-31)',
    data_inicio DATE NOT NULL COMMENT 'Data de início da recorrência',
    data_proxima_cobranca DATE NOT NULL COMMENT 'Próxima data de cobrança',
    data_fim DATE NULL COMMENT 'Data de término da recorrência (NULL = sem fim)',
    status ENUM('ativo', 'pausado', 'cancelado', 'inadimplente') DEFAULT 'ativo',
    notificacao_3dias BOOLEAN DEFAULT FALSE COMMENT 'Se enviou notificação 3 dias antes',
    notificacao_1dia BOOLEAN DEFAULT FALSE COMMENT 'Se enviou notificação 1 dia antes',
    notificacao_vencimento BOOLEAN DEFAULT FALSE COMMENT 'Se enviou notificação no dia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (plano_id) REFERENCES planos(id),
    INDEX idx_proxima_cobranca (data_proxima_cobranca),
    INDEX idx_aluno_status (aluno_id, status),
    INDEX idx_notificacoes (data_proxima_cobranca, status, notificacao_3dias, notificacao_1dia, notificacao_vencimento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela de recorrências de pagamento com notificações automáticas';

-- Tabela de histórico de notificações
CREATE TABLE IF NOT EXISTS pagamentos_notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recorrencia_id INT NOT NULL,
    aluno_id INT NOT NULL,
    tipo_notificacao ENUM('3_dias_antes', '1_dia_antes', 'no_vencimento', 'atraso') NOT NULL,
    data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_enviado_para VARCHAR(255) NOT NULL,
    status ENUM('enviado', 'erro', 'pendente') DEFAULT 'pendente',
    tentativas INT DEFAULT 0,
    erro_mensagem TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recorrencia_id) REFERENCES pagamentos_recorrentes(id) ON DELETE CASCADE,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    INDEX idx_data_envio (data_envio),
    INDEX idx_recorrencia (recorrencia_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Histórico de notificações de pagamento enviadas';

-- Adicionar campos na tabela alunos se não existirem
ALTER TABLE alunos
ADD COLUMN dia_vencimento INT DEFAULT 1 COMMENT 'Dia do mês para vencimento da mensalidade';

ALTER TABLE alunos
ADD COLUMN data_primeira_mensalidade DATE NULL COMMENT 'Data da primeira mensalidade (dia da matrícula)';

-- Procedure para resetar flags de notificação mensalmente
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS reset_notificacoes_mensais()
BEGIN
    -- Reseta flags de notificação quando a próxima cobrança é atualizada
    UPDATE pagamentos_recorrentes
    SET
        notificacao_3dias = FALSE,
        notificacao_1dia = FALSE,
        notificacao_vencimento = FALSE
    WHERE data_proxima_cobranca > CURDATE()
    AND (notificacao_3dias = TRUE OR notificacao_1dia = TRUE OR notificacao_vencimento = TRUE);
END //

DELIMITER ;

-- Procedure para processar notificações (será chamada por cron job)
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS processar_notificacoes_pagamento()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE rec_id INT;
    DECLARE aluno_id_var INT;
    DECLARE data_venc DATE;
    DECLARE dias_ate_venc INT;

    -- Cursor para recorrências ativas
    DECLARE cur CURSOR FOR
        SELECT id, aluno_id, data_proxima_cobranca
        FROM pagamentos_recorrentes
        WHERE status = 'ativo'
        AND data_proxima_cobranca <= DATE_ADD(CURDATE(), INTERVAL 3 DAY);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO rec_id, aluno_id_var, data_venc;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET dias_ate_venc = DATEDIFF(data_venc, CURDATE());

        -- Notificação 3 dias antes
        IF dias_ate_venc = 3 THEN
            UPDATE pagamentos_recorrentes
            SET notificacao_3dias = TRUE
            WHERE id = rec_id AND notificacao_3dias = FALSE;

            INSERT INTO pagamentos_notificacoes (recorrencia_id, aluno_id, tipo_notificacao, status)
            VALUES (rec_id, aluno_id_var, '3_dias_antes', 'pendente');
        END IF;

        -- Notificação 1 dia antes
        IF dias_ate_venc = 1 THEN
            UPDATE pagamentos_recorrentes
            SET notificacao_1dia = TRUE
            WHERE id = rec_id AND notificacao_1dia = FALSE;

            INSERT INTO pagamentos_notificacoes (recorrencia_id, aluno_id, tipo_notificacao, status)
            VALUES (rec_id, aluno_id_var, '1_dia_antes', 'pendente');
        END IF;

        -- Notificação no vencimento
        IF dias_ate_venc = 0 THEN
            UPDATE pagamentos_recorrentes
            SET notificacao_vencimento = TRUE
            WHERE id = rec_id AND notificacao_vencimento = FALSE;

            INSERT INTO pagamentos_notificacoes (recorrencia_id, aluno_id, tipo_notificacao, status)
            VALUES (rec_id, aluno_id_var, 'no_vencimento', 'pendente');
        END IF;

        -- Notificação de atraso (após vencimento)
        IF dias_ate_venc < 0 THEN
            UPDATE pagamentos_recorrentes
            SET status = 'inadimplente'
            WHERE id = rec_id AND status = 'ativo';

            INSERT INTO pagamentos_notificacoes (recorrencia_id, aluno_id, tipo_notificacao, status)
            VALUES (rec_id, aluno_id_var, 'atraso', 'pendente');
        END IF;

    END LOOP;

    CLOSE cur;
END //

DELIMITER ;

-- View para facilitar consultas de pagamentos pendentes
CREATE OR REPLACE VIEW vw_pagamentos_pendentes AS
SELECT
    pr.id AS recorrencia_id,
    pr.aluno_id,
    u.nome AS aluno_nome,
    u.email AS aluno_email,
    p.nome AS plano_nome,
    pr.valor,
    pr.dia_vencimento,
    pr.data_proxima_cobranca,
    DATEDIFF(pr.data_proxima_cobranca, CURDATE()) AS dias_ate_vencimento,
    pr.status,
    pr.notificacao_3dias,
    pr.notificacao_1dia,
    pr.notificacao_vencimento,
    CASE
        WHEN DATEDIFF(pr.data_proxima_cobranca, CURDATE()) > 3 THEN 'Sem notificação'
        WHEN DATEDIFF(pr.data_proxima_cobranca, CURDATE()) = 3 THEN 'Notificar em 3 dias'
        WHEN DATEDIFF(pr.data_proxima_cobranca, CURDATE()) = 1 THEN 'Notificar em 1 dia'
        WHEN DATEDIFF(pr.data_proxima_cobranca, CURDATE()) = 0 THEN 'Notificar hoje'
        WHEN DATEDIFF(pr.data_proxima_cobranca, CURDATE()) < 0 THEN 'Vencido'
    END AS acao_notificacao
FROM pagamentos_recorrentes pr
INNER JOIN alunos a ON pr.aluno_id = a.id
INNER JOIN usuarios u ON a.usuario_id = u.id
INNER JOIN planos p ON pr.plano_id = p.id
WHERE pr.status IN ('ativo', 'inadimplente')
ORDER BY pr.data_proxima_cobranca ASC;

SELECT 'Migração 004 concluída: Sistema de recorrência de pagamentos criado!' as message;
