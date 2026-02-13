const express = require('express');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/student-attendance/check-in
 * Aluno registra presença em uma aula (check-in)
 */
router.post('/check-in', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { turma_id } = req.body;

        if (!turma_id) {
            return res.status(400).json({ error: 'ID da turma é obrigatório' });
        }

        // Buscar aluno
        const alunos = await query(`
            SELECT a.id, u.nome
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.usuario_id = ?
        `, [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const aluno = alunos[0];

        // Verificar se o aluno está matriculado nessa turma
        const matriculas = await query(
            'SELECT id FROM alunos_turmas WHERE aluno_id = ? AND turma_id = ?',
            [aluno.id, turma_id]
        );

        if (matriculas.length === 0) {
            return res.status(403).json({ error: 'Você não está matriculado nesta turma' });
        }

        // Verificar se a turma existe e está ativa
        const turmas = await query(
            'SELECT id, nome, dia_semana, horario_inicio, horario_fim FROM turmas WHERE id = ? AND ativo = TRUE',
            [turma_id]
        );

        if (turmas.length === 0) {
            return res.status(404).json({ error: 'Turma não encontrada ou inativa' });
        }

        const turma = turmas[0];

        // Verificar se já registrou presença hoje nessa turma
        const hoje = new Date().toISOString().split('T')[0];
        const frequenciasHoje = await query(
            'SELECT id FROM frequencia WHERE aluno_id = ? AND turma_id = ? AND DATE(data_aula) = ?',
            [aluno.id, turma_id, hoje]
        );

        if (frequenciasHoje.length > 0) {
            return res.status(400).json({ error: 'Presença já registrada hoje para esta turma' });
        }

        // Registrar presença (pendente de validação)
        await query(`
            INSERT INTO frequencia (
                aluno_id, turma_id, data_aula, horario_inicio, horario_fim, presente, tipo_registro, status_validacao, created_at
            ) VALUES (?, ?, NOW(), ?, ?, TRUE, 'aluno', 'pendente', NOW())
        `, [aluno.id, turma_id, turma.horario_inicio, turma.horario_fim]);

        logger.info(`Check-in registrado: ${aluno.nome} na turma ${turma.nome} (pendente de validação)`);

        res.json({
            message: 'Presença registrada com sucesso e aguardando validação do professor',
            turma: turma.nome,
            data: hoje,
            status_validacao: 'pendente'
        });

    } catch (error) {
        logger.error('Erro ao registrar presença:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-attendance/my-history
 * Consultar histórico de frequências do aluno
 */
router.get('/my-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mes, ano } = req.query;

        // Buscar aluno
        const alunos = await query('SELECT id FROM alunos WHERE usuario_id = ?', [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const alunoId = alunos[0].id;

        // Montar filtros de data
        let whereClause = 'f.aluno_id = ?';
        const params = [alunoId];

        if (mes && ano) {
            whereClause += ' AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mes, ano);
        } else if (ano) {
            whereClause += ' AND YEAR(f.data_aula) = ?';
            params.push(ano);
        }

        // Buscar frequências
        const frequencias = await query(`
            SELECT
                f.*,
                t.nome as turma_nome,
                t.programa
            FROM frequencia f
            INNER JOIN turmas t ON f.turma_id = t.id
            WHERE ${whereClause}
            ORDER BY f.data_aula DESC
            LIMIT 100
        `, params);

        // Calcular estatísticas
        const estatisticas = await query(`
            SELECT
                COUNT(*) as total_aulas,
                SUM(CASE WHEN presente = TRUE THEN 1 ELSE 0 END) as presencas,
                SUM(CASE WHEN presente = FALSE THEN 1 ELSE 0 END) as faltas,
                ROUND((SUM(CASE WHEN presente = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as percentual_frequencia
            FROM frequencia f
            WHERE ${whereClause}
        `, params);

        res.json({
            frequencias,
            estatisticas: estatisticas[0] || {
                total_aulas: 0,
                presencas: 0,
                faltas: 0,
                percentual_frequencia: 0
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar histórico de frequência:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-attendance/available-classes-today
 * Consultar aulas disponíveis hoje para check-in
 */
router.get('/available-classes-today', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar aluno
        const alunos = await query('SELECT id FROM alunos WHERE usuario_id = ?', [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const alunoId = alunos[0].id;

        // Obter dia da semana atual em português
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const diaAtual = diasSemana[new Date().getDay()];
        const hoje = new Date().toISOString().split('T')[0];

        // Buscar turmas do aluno que são hoje e que ele ainda não fez check-in
        const turmasDisponiveis = await query(`
            SELECT
                t.id,
                t.nome,
                t.dia_semana,
                t.horario_inicio,
                t.horario_fim,
                t.programa,
                (SELECT COUNT(*) FROM frequencia
                 WHERE aluno_id = ? AND turma_id = t.id AND DATE(data_aula) = ?) as ja_registrou
            FROM alunos_turmas at
            INNER JOIN turmas t ON at.turma_id = t.id
            WHERE at.aluno_id = ?
              AND t.ativo = TRUE
              AND t.dia_semana = ?
            ORDER BY t.horario_inicio
        `, [alunoId, hoje, alunoId, diaAtual]);

        res.json({
            dia_atual: diaAtual,
            turmas: turmasDisponiveis.map(t => ({
                ...t,
                pode_registrar: t.ja_registrou === 0
            }))
        });

    } catch (error) {
        logger.error('Erro ao buscar aulas disponíveis:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-attendance/graduation-progress
 * Consultar progresso do aluno para próxima graduação
 * Requisitos: 3 aulas/semana e 12 aulas/mês
 */
router.get('/graduation-progress', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar aluno e graduação atual
        const alunos = await query(`
            SELECT
                a.id,
                a.data_graduacao_atual,
                gs.nome as graduacao_nome,
                gs.cor as graduacao_cor,
                gs.ordem as graduacao_ordem
            FROM alunos a
            LEFT JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.usuario_id = ?
        `, [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const aluno = alunos[0];

        // Calcular frequência do mês atual
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();

        const frequenciaMesAtual = await query(`
            SELECT COUNT(*) as total_aulas_mes
            FROM frequencia
            WHERE aluno_id = ?
              AND MONTH(data_aula) = ?
              AND YEAR(data_aula) = ?
              AND presente = TRUE
        `, [aluno.id, mesAtual, anoAtual]);

        // Calcular frequência das últimas 4 semanas
        const ultimasQuatroSemanas = await query(`
            SELECT
                WEEK(data_aula) as semana,
                COUNT(*) as aulas_semana
            FROM frequencia
            WHERE aluno_id = ?
              AND data_aula >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
              AND presente = TRUE
            GROUP BY WEEK(data_aula)
            ORDER BY semana DESC
        `, [aluno.id]);

        // Calcular média de aulas por semana
        const totalAulasUltimasSemanas = ultimasQuatroSemanas.reduce((acc, s) => acc + s.aulas_semana, 0);
        const mediaSemanal = ultimasQuatroSemanas.length > 0 ? totalAulasUltimasSemanas / ultimasQuatroSemanas.length : 0;

        // Buscar próxima graduação
        const proximaGraduacao = await query(`
            SELECT nome, cor, ordem
            FROM graduacoes_sistema
            WHERE ordem > ?
            ORDER BY ordem ASC
            LIMIT 1
        `, [aluno.graduacao_ordem || 0]);

        // Verificar se atende aos requisitos
        const aulasMesAtual = frequenciaMesAtual[0].total_aulas_mes;
        const atendeRequisitoMensal = aulasMesAtual >= 12;
        const atendeRequisitoSemanal = mediaSemanal >= 3;
        const aptoGraduacao = atendeRequisitoMensal && atendeRequisitoSemanal;

        res.json({
            graduacao_atual: {
                nome: aluno.graduacao_nome || 'Sem graduação',
                cor: aluno.graduacao_cor || '#CCCCCC',
                ordem: aluno.graduacao_ordem || 0,
                data_graduacao: aluno.data_graduacao_atual
            },
            proxima_graduacao: proximaGraduacao.length > 0 ? {
                nome: proximaGraduacao[0].nome,
                cor: proximaGraduacao[0].cor,
                ordem: proximaGraduacao[0].ordem
            } : null,
            progresso: {
                aulas_mes_atual: aulasMesAtual,
                aulas_necessarias_mes: 12,
                percentual_mensal: Math.min(100, (aulasMesAtual / 12) * 100).toFixed(1),
                atende_requisito_mensal: atendeRequisitoMensal,

                media_aulas_semana: mediaSemanal.toFixed(1),
                aulas_necessarias_semana: 3,
                percentual_semanal: Math.min(100, (mediaSemanal / 3) * 100).toFixed(1),
                atende_requisito_semanal: atendeRequisitoSemanal,

                ultimas_semanas: ultimasQuatroSemanas,

                apto_graduacao: aptoGraduacao,
                mensagem: aptoGraduacao
                    ? 'Parabéns! Você está apto para a próxima graduação.'
                    : 'Continue treinando para alcançar os requisitos de graduação.'
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar progresso de graduação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-attendance/dependente/:dependenteId/history
 * Consultar histórico de frequência de um dependente (filho)
 * Apenas se o usuário logado for o responsável
 */
router.get('/dependente/:dependenteId/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { dependenteId } = req.params;
        const { mes, ano } = req.query;

        // Buscar email do usuário logado
        const [usuario] = await query('SELECT email FROM usuarios WHERE id = ?', [userId]);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const emailResponsavel = usuario.email;

        // Verificar se o dependente pertence ao responsável
        const [aluno] = await query(`
            SELECT id
            FROM alunos
            WHERE id = ? AND (email_responsavel = ? OR usuario_id = ?)
        `, [dependenteId, emailResponsavel, userId]);

        if (!aluno) {
            return res.status(403).json({ error: 'Acesso negado a este dependente' });
        }

        // Montar filtros de data
        let whereClause = 'f.aluno_id = ?';
        const params = [dependenteId];

        if (mes && ano) {
            whereClause += ' AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mes, ano);
        } else if (ano) {
            whereClause += ' AND YEAR(f.data_aula) = ?';
            params.push(ano);
        }

        // Buscar frequências do dependente
        const frequencias = await query(`
            SELECT
                f.*,
                t.nome as turma_nome,
                t.programa
            FROM frequencia f
            INNER JOIN turmas t ON f.turma_id = t.id
            WHERE ${whereClause}
            ORDER BY f.data_aula DESC
            LIMIT 100
        `, params);

        // Calcular estatísticas do dependente
        const estatisticas = await query(`
            SELECT
                COUNT(*) as total_aulas,
                SUM(CASE WHEN presente = TRUE THEN 1 ELSE 0 END) as presencas,
                SUM(CASE WHEN presente = FALSE THEN 1 ELSE 0 END) as faltas,
                ROUND((SUM(CASE WHEN presente = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as percentual_frequencia
            FROM frequencia f
            WHERE ${whereClause}
        `, params);

        res.json({
            frequencias,
            estatisticas: estatisticas[0] || {
                total_aulas: 0,
                presencas: 0,
                faltas: 0,
                percentual_frequencia: 0
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar histórico de frequência do dependente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
