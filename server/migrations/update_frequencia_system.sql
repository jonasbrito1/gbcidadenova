-- ====================================================
-- ATUALIZAÇÃO DO SISTEMA DE FREQUÊNCIA E GRADUAÇÃO
-- Data: 2025-11-12
-- Descrição: Implementação completa do novo fluxo de frequência
-- ====================================================

USE gracie_barra_db;

-- 1. ATUALIZAR TABELA FREQUENCIA
-- Adicionar colunas para rastreamento e controle

ALTER TABLE frequencia
ADD COLUMN IF NOT EXISTS validado_por_id INT NULL AFTER status_validacao,
ADD COLUMN IF NOT EXISTS validado_em TIMESTAMP NULL AFTER validado_por_id,
ADD COLUMN IF NOT EXISTS periodo_graduacao_id INT NULL AFTER turma_id,
ADD COLUMN IF NOT EXISTS localizacao_registro VARCHAR(255) NULL COMMENT 'IP ou localização do registro' AFTER tipo_registro;

-- Adicionar foreign key para validador
ALTER TABLE frequencia
ADD CONSTRAINT fk_freq_validador FOREIGN KEY (validado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 2. CRIAR TABELA DE PERÍODOS DE GRADUAÇÃO
CREATE TABLE IF NOT EXISTS periodos_graduacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL COMMENT 'Ex: 1º Semestre de 2025',
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    semestre ENUM('1', '2') NOT NULL,
    ano INT NOT NULL,
    aulas_minimas_exigidas INT DEFAULT 48 COMMENT 'Mínimo de aulas para aprovação',
    frequencia_minima_percent DECIMAL(5,2) DEFAULT 75.00 COMMENT 'Frequência mínima em %',
    status ENUM('planejado', 'ativo', 'concluido') DEFAULT 'planejado',
    observacoes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_periodo_status (status),
    INDEX idx_periodo_datas (data_inicio, data_fim),
    UNIQUE KEY unique_semestre_ano (semestre, ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Períodos semestrais de graduação da Gracie Barra';

-- 3. CRIAR TABELA DE REQUISITOS DE GRADUAÇÃO
CREATE TABLE IF NOT EXISTS requisitos_graduacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    graduacao_atual_id INT NOT NULL,
    graduacao_proxima_id INT NOT NULL,
    frequencia_minima_percent DECIMAL(5,2) DEFAULT 75.00,
    aulas_minimas INT DEFAULT 48,
    tempo_minimo_meses INT DEFAULT 6,
    observacoes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (graduacao_atual_id) REFERENCES graduacoes_sistema(id) ON DELETE CASCADE,
    FOREIGN KEY (graduacao_proxima_id) REFERENCES graduacoes_sistema(id) ON DELETE CASCADE,
    UNIQUE KEY unique_transicao (graduacao_atual_id, graduacao_proxima_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Requisitos para transição entre graduações';

-- 4. CRIAR TABELA DE HISTÓRICO DE GRADUAÇÕES
CREATE TABLE IF NOT EXISTS historico_graduacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    graduacao_anterior_id INT NULL,
    graduacao_nova_id INT NOT NULL,
    periodo_graduacao_id INT NULL,
    data_graduacao DATE NOT NULL,
    aulas_realizadas INT DEFAULT 0,
    frequencia_percent DECIMAL(5,2) DEFAULT 0.00,
    aprovado_por_id INT NULL COMMENT 'Professor/Admin que aprovou',
    observacoes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (graduacao_anterior_id) REFERENCES graduacoes_sistema(id) ON DELETE SET NULL,
    FOREIGN KEY (graduacao_nova_id) REFERENCES graduacoes_sistema(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_graduacao_id) REFERENCES periodos_graduacao(id) ON DELETE SET NULL,
    FOREIGN KEY (aprovado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_aluno (aluno_id),
    INDEX idx_data (data_graduacao),
    INDEX idx_periodo (periodo_graduacao_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Histórico completo de graduações dos alunos';

-- 5. ADICIONAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_freq_tipo_registro ON frequencia(tipo_registro);
CREATE INDEX IF NOT EXISTS idx_freq_status_validacao ON frequencia(status_validacao);
CREATE INDEX IF NOT EXISTS idx_freq_periodo ON frequencia(periodo_graduacao_id);
CREATE INDEX IF NOT EXISTS idx_freq_data_turma ON frequencia(data_aula, turma_id);
CREATE INDEX IF NOT EXISTS idx_freq_aluno_data ON frequencia(aluno_id, data_aula);

-- 6. ADICIONAR FOREIGN KEY DO PERÍODO DE GRADUAÇÃO
ALTER TABLE frequencia
ADD CONSTRAINT fk_freq_periodo FOREIGN KEY (periodo_graduacao_id)
REFERENCES periodos_graduacao(id) ON DELETE SET NULL;

-- 7. ATUALIZAR TABELA ALUNOS
-- Adicionar campo para data da última graduação
ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS data_ultima_graduacao DATE NULL COMMENT 'Data da última mudança de faixa' AFTER graduacao_atual_id,
ADD COLUMN IF NOT EXISTS proximo_periodo_graduacao_id INT NULL COMMENT 'Próximo período elegível para graduação' AFTER data_ultima_graduacao;

ALTER TABLE alunos
ADD CONSTRAINT fk_aluno_prox_periodo FOREIGN KEY (proximo_periodo_graduacao_id)
REFERENCES periodos_graduacao(id) ON DELETE SET NULL;

-- 8. INSERIR PERÍODO ATUAL DE GRADUAÇÃO
-- Calcula automaticamente se é 1º ou 2º semestre baseado na data atual
INSERT INTO periodos_graduacao (nome, data_inicio, data_fim, semestre, ano, status)
VALUES (
    CONCAT(IF(MONTH(CURDATE()) <= 6, '1º', '2º'), ' Semestre de ', YEAR(CURDATE())),
    IF(MONTH(CURDATE()) <= 6,
        CONCAT(YEAR(CURDATE()), '-01-01'),
        CONCAT(YEAR(CURDATE()), '-07-01')
    ),
    IF(MONTH(CURDATE()) <= 6,
        CONCAT(YEAR(CURDATE()), '-06-30'),
        CONCAT(YEAR(CURDATE()), '-12-31')
    ),
    IF(MONTH(CURDATE()) <= 6, '1', '2'),
    YEAR(CURDATE()),
    'ativo'
)
ON DUPLICATE KEY UPDATE
    status = 'ativo',
    updated_at = CURRENT_TIMESTAMP;

-- 9. INSERIR REQUISITOS PADRÃO DE GRADUAÇÃO
-- Estes são valores padrão da Gracie Barra, podem ser ajustados
INSERT INTO requisitos_graduacao (graduacao_atual_id, graduacao_proxima_id, frequencia_minima_percent, aulas_minimas, tempo_minimo_meses)
SELECT
    g1.id as graduacao_atual_id,
    g2.id as graduacao_proxima_id,
    75.00 as frequencia_minima_percent,
    48 as aulas_minimas,
    6 as tempo_minimo_meses
FROM graduacoes_sistema g1
INNER JOIN graduacoes_sistema g2 ON g2.ordem = g1.ordem + 1
WHERE NOT EXISTS (
    SELECT 1 FROM requisitos_graduacao r
    WHERE r.graduacao_atual_id = g1.id
    AND r.graduacao_proxima_id = g2.id
);

-- 10. CRIAR VIEW PARA PROGRESSO DE GRADUAÇÃO DOS ALUNOS
CREATE OR REPLACE VIEW vw_progresso_graduacao AS
SELECT
    a.id as aluno_id,
    u.nome as aluno_nome,
    a.matricula,
    gs.nome as graduacao_atual,
    gs.ordem as ordem_atual,
    a.data_inicio as data_inicio_academia,
    a.data_ultima_graduacao,
    TIMESTAMPDIFF(MONTH, COALESCE(a.data_ultima_graduacao, a.data_inicio), CURDATE()) as meses_na_graduacao,
    pg.id as periodo_id,
    pg.nome as periodo_nome,
    pg.data_inicio as periodo_inicio,
    pg.data_fim as periodo_fim,
    pg.aulas_minimas_exigidas,
    pg.frequencia_minima_percent,
    -- Contar aulas no período
    COUNT(DISTINCT CASE
        WHEN f.presente = 1
        AND f.status_validacao = 'validado'
        AND f.periodo_graduacao_id = pg.id
        THEN f.id
    END) as aulas_realizadas,
    -- Calcular frequência
    ROUND(
        (COUNT(DISTINCT CASE WHEN f.presente = 1 AND f.status_validacao = 'validado' AND f.periodo_graduacao_id = pg.id THEN f.id END) /
        NULLIF(COUNT(DISTINCT CASE WHEN f.periodo_graduacao_id = pg.id THEN f.id END), 0)) * 100,
        2
    ) as frequencia_percent,
    -- Verificar se atende requisitos
    CASE
        WHEN rg.tempo_minimo_meses IS NOT NULL
        AND TIMESTAMPDIFF(MONTH, COALESCE(a.data_ultima_graduacao, a.data_inicio), CURDATE()) >= rg.tempo_minimo_meses
        AND COUNT(DISTINCT CASE WHEN f.presente = 1 AND f.status_validacao = 'validado' AND f.periodo_graduacao_id = pg.id THEN f.id END) >= rg.aulas_minimas
        AND (COUNT(DISTINCT CASE WHEN f.presente = 1 AND f.status_validacao = 'validado' AND f.periodo_graduacao_id = pg.id THEN f.id END) /
             NULLIF(COUNT(DISTINCT CASE WHEN f.periodo_graduacao_id = pg.id THEN f.id END), 0)) * 100 >= rg.frequencia_minima_percent
        THEN 'Apto'
        ELSE 'Em Progresso'
    END as status_graduacao,
    gs_prox.nome as proxima_graduacao,
    rg.aulas_minimas as aulas_necessarias,
    rg.frequencia_minima_percent as frequencia_necessaria,
    rg.tempo_minimo_meses as tempo_necessario_meses
FROM alunos a
INNER JOIN usuarios u ON a.usuario_id = u.id
INNER JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
LEFT JOIN graduacoes_sistema gs_prox ON gs_prox.ordem = gs.ordem + 1
LEFT JOIN requisitos_graduacao rg ON rg.graduacao_atual_id = gs.id AND rg.graduacao_proxima_id = gs_prox.id
LEFT JOIN periodos_graduacao pg ON pg.status = 'ativo'
LEFT JOIN frequencia f ON f.aluno_id = a.id
WHERE a.status = 'ativo'
GROUP BY
    a.id, u.nome, a.matricula, gs.nome, gs.ordem, a.data_inicio,
    a.data_ultima_graduacao, pg.id, pg.nome, pg.data_inicio, pg.data_fim,
    pg.aulas_minimas_exigidas, pg.frequencia_minima_percent,
    gs_prox.nome, rg.aulas_minimas, rg.frequencia_minima_percent, rg.tempo_minimo_meses;

-- ====================================================
-- FIM DA MIGRAÇÃO
-- ====================================================

SELECT '✅ Schema atualizado com sucesso!' as status;
SELECT CONCAT('Período ativo: ', nome) as periodo_ativo FROM periodos_graduacao WHERE status = 'ativo';
