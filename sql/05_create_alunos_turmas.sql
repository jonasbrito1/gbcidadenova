-- Tabela de relacionamento entre alunos e turmas
CREATE TABLE IF NOT EXISTS alunos_turmas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id INT NOT NULL,
    turma_id INT NOT NULL,
    data_matricula DATE NOT NULL DEFAULT (CURRENT_DATE),
    status ENUM('ativo', 'inativo', 'trancado') DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE,
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,

    UNIQUE KEY unique_aluno_turma (aluno_id, turma_id),
    INDEX idx_aluno (aluno_id),
    INDEX idx_turma (turma_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
