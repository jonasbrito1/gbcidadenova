const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const {
    getManausNow,
    getSQLDate,
    getDiaSemana
} = require('../utils/timezone');

// ==========================================
// ENDPOINTS PARA ALUNOS
// ==========================================

/**
 * GET /api/frequencia-novo/turmas-disponiveis
 * Lista turmas disponíveis para o aluno registrar presença
 */
router.get('/turmas-disponiveis', authenticateToken, async (req, res) => {
    try {
        console.log('[FREQ DEBUG] req.user:', JSON.stringify(req.user));
        const userId = req.user.id;
        console.log('[FREQ DEBUG] userId:', userId);

        // Buscar ID do aluno
        const alunos = await db.query(
            'SELECT id, programa FROM alunos WHERE usuario_id = ? AND status = "ativo"',
            [userId]
        );

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado ou inativo' });
        }

        const alunoId = alunos[0].id;
        const alunoPrograma = alunos[0].programa;
        const dataAtual = getSQLDate();
        const agora = getManausNow();
        const diaSemana = getDiaSemana(agora);

        console.log('[FREQ DEBUG] Buscando turmas para aluno:', {
            alunoId,
            alunoPrograma,
            diaSemana,
            dataAtual,
            diaNumero: agora.day()
        });

        // Buscar TODAS as turmas do programa do aluno no dia de hoje (sem necessidade de matrícula específica)
        const turmas = await db.query(`
            SELECT
                t.id,
                t.nome,
                t.dia_semana,
                t.horario_inicio,
                t.horario_fim,
                t.programa,
                t.capacidade_maxima,
                up.nome as professor_nome,
                -- Verificar se já registrou presença hoje
                CASE
                    WHEN f.id IS NOT NULL THEN 1
                    ELSE 0
                END as ja_registrou_hoje,
                f.status_validacao,
                f.presente
            FROM turmas t
            LEFT JOIN professores p ON t.professor_id = p.id
            LEFT JOIN usuarios up ON p.usuario_id = up.id
            LEFT JOIN frequencia f ON f.turma_id = t.id
                AND f.aluno_id = ?
                AND f.data_aula = ?
            WHERE t.programa = ?
                AND t.status = 'ativo'
                AND t.dia_semana = ?
            ORDER BY t.horario_inicio
        `, [alunoId, dataAtual, alunoPrograma, diaSemana]);

        console.log('[FREQ DEBUG] Turmas encontradas:', turmas.length, turmas.map(t => ({ id: t.id, nome: t.nome, dia: t.dia_semana, programa: t.programa })));

        // Simplificar: permitir registro em todas as turmas do programa
        // Única restrição: não pode registrar mais de uma vez na mesma turma no mesmo dia
        const turmasComStatus = turmas.map(turma => {
            const podeRegistrar = !turma.ja_registrou_hoje;
            const mensagem = turma.ja_registrou_hoje ? 'Presença já registrada' : 'Disponível para registro';

            console.log(`[FREQ DEBUG] Turma ${turma.id} (${turma.nome}):`, {
                horario_inicio: turma.horario_inicio,
                horario_fim: turma.horario_fim,
                dia_semana: turma.dia_semana,
                programa: turma.programa,
                ja_registrou: turma.ja_registrou_hoje,
                pode_registrar: podeRegistrar,
                mensagem
            });

            return {
                ...turma,
                pode_registrar: podeRegistrar,
                dentro_janela_horario: true, // Sempre true, sem restrição de horário
                mensagem
            };
        });

        res.json({
            data_atual: dataAtual,
            dia_semana: diaSemana,
            turmas: turmasComStatus
        });

    } catch (error) {
        console.error('Erro ao buscar turmas disponíveis:', error);
        res.status(500).json({ error: 'Erro ao buscar turmas disponíveis' });
    }
});

/**
 * POST /api/frequencia-novo/registrar-presenca
 * Aluno registra sua própria presença
 */
router.post('/registrar-presenca', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { turma_id } = req.body;

        if (!turma_id) {
            return res.status(400).json({ error: 'turma_id é obrigatório' });
        }

        // Buscar aluno
        const alunos = await db.query(
            'SELECT id, programa FROM alunos WHERE usuario_id = ? AND status = "ativo"',
            [userId]
        );

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const alunoId = alunos[0].id;
        const alunoPrograma = alunos[0].programa;
        const dataAtual = getSQLDate();

        console.log('[FREQ DEBUG] Registrando presença:', { alunoId, alunoPrograma, turma_id, dataAtual });

        // Buscar turma (sem verificar matrícula específica)
        const turmas = await db.query(`
            SELECT t.*
            FROM turmas t
            WHERE t.id = ?
                AND t.status = 'ativo'
        `, [turma_id]);

        if (turmas.length === 0) {
            return res.status(404).json({
                error: 'Turma não encontrada ou inativa'
            });
        }

        const turma = turmas[0];

        // Verificar se o programa da turma corresponde ao programa do aluno
        if (turma.programa !== alunoPrograma) {
            console.log('[FREQ DEBUG] Programa incompatível:', { turmaPrograma: turma.programa, alunoPrograma });
            return res.status(403).json({
                error: 'Esta turma não pertence ao seu programa'
            });
        }

        // Verificar se já registrou presença nesta turma hoje (única validação)
        const presencasExistentes = await db.query(
            `SELECT id FROM frequencia
             WHERE aluno_id = ? AND turma_id = ? AND data_aula = ?`,
            [alunoId, turma_id, dataAtual]
        );

        if (presencasExistentes.length > 0) {
            return res.status(400).json({
                error: 'Você já registrou presença nesta turma hoje'
            });
        }

        // Buscar período de graduação ativo
        const periodos = await db.query(
            `SELECT id FROM periodos_graduacao WHERE status = 'ativo' LIMIT 1`
        );

        const periodoId = periodos.length > 0 ? periodos[0].id : null;

        // Registrar presença
        const localizacao = req.ip || req.connection.remoteAddress;

        const result = await db.query(`
            INSERT INTO frequencia (
                aluno_id,
                turma_id,
                periodo_graduacao_id,
                data_aula,
                horario_inicio,
                horario_fim,
                presente,
                tipo_registro,
                status_validacao,
                localizacao_registro,
                tipo_aula
            ) VALUES (?, ?, ?, ?, ?, ?, 1, 'aluno', 'pendente', ?, 'regular')
        `, [
            alunoId,
            turma_id,
            periodoId,
            dataAtual,
            turma.horario_inicio,
            turma.horario_fim,
            localizacao
        ]);

        res.json({
            success: true,
            message: 'Presença registrada com sucesso! Aguardando validação do professor.',
            frequencia_id: result.insertId,
            status: 'pendente'
        });

    } catch (error) {
        console.error('Erro ao registrar presença:', error);
        res.status(500).json({ error: 'Erro ao registrar presença' });
    }
});

/**
 * GET /api/frequencia-novo/minhas-presencas
 * Histórico de presenças do aluno logado
 */
router.get('/minhas-presencas', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mes, ano, limit = 50, offset = 0 } = req.query;

        // Buscar aluno
        const alunos = await db.query(
            'SELECT id FROM alunos WHERE usuario_id = ?',
            [userId]
        );

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const alunoId = alunos[0].id;

        let query = `
            SELECT
                f.id,
                f.data_aula,
                f.horario_inicio,
                f.horario_fim,
                f.presente,
                f.tipo_registro,
                f.status_validacao,
                f.created_at,
                f.validado_em,
                t.nome as turma_nome,
                t.dia_semana,
                t.programa,
                up.nome as professor_nome,
                uv.nome as validado_por_nome
            FROM frequencia f
            INNER JOIN turmas t ON f.turma_id = t.id
            INNER JOIN professores p ON t.professor_id = p.id
            INNER JOIN usuarios up ON p.usuario_id = up.id
            LEFT JOIN usuarios uv ON f.validado_por_id = uv.id
            WHERE f.aluno_id = ?
        `;

        const params = [alunoId];

        // Apenas adicionar filtro se mes e ano forem números válidos
        const mesNum = parseInt(mes);
        const anoNum = parseInt(ano);
        if (mes && ano && !isNaN(mesNum) && !isNaN(anoNum)) {
            query += ' AND MONTH(f.data_aula) = ? AND YEAR(f.data_aula) = ?';
            params.push(mesNum, anoNum);
        }

        // Garantir que limit e offset sejam números válidos
        // Nota: LIMIT e OFFSET não funcionam bem com prepared statements em algumas versões do MySQL
        // Por isso interpolamos diretamente (valores já sanitizados como inteiros)
        const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 100));
        const offsetNum = Math.max(0, parseInt(offset) || 0);
        query += ` ORDER BY f.data_aula DESC, f.horario_inicio DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const presencas = await db.query(query, params);

        res.json({
            total: presencas.length,
            presencas
        });

    } catch (error) {
        console.error('Erro ao buscar presenças:', error);
        res.status(500).json({ error: 'Erro ao buscar presenças' });
    }
});

/**
 * GET /api/frequencia-novo/meu-progresso
 * Progresso do aluno para graduação
 */
router.get('/meu-progresso', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar aluno
        const alunos = await db.query(`
            SELECT
                a.*,
                gs.nome as graduacao_atual_nome,
                gs.cor as graduacao_atual_cor,
                gs.ordem as graduacao_ordem,
                a.graus_faixa,
                (SELECT nome FROM graduacoes_sistema WHERE ordem > gs.ordem ORDER BY ordem ASC LIMIT 1) as proxima_graduacao_nome,
                (SELECT cor FROM graduacoes_sistema WHERE ordem > gs.ordem ORDER BY ordem ASC LIMIT 1) as proxima_graduacao_cor
            FROM alunos a
            INNER JOIN graduacoes_sistema gs ON a.graduacao_atual_id = gs.id
            WHERE a.usuario_id = ?
        `, [userId]);

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const aluno = alunos[0];

        // Buscar período ativo
        const periodos = await db.query(
            `SELECT * FROM periodos_graduacao WHERE status = 'ativo' LIMIT 1`
        );

        if (periodos.length === 0) {
            return res.json({
                aluno: {
                    nome: aluno.nome,
                    matricula: aluno.matricula,
                    graduacao_atual: aluno.graduacao_atual_nome,
                    cor_graduacao: aluno.graduacao_atual_cor
                },
                erro: 'Nenhum período de graduação ativo'
            });
        }

        const periodo = periodos[0];

        // Contar presenças validadas no período
        const stats = await db.query(`
            SELECT
                COUNT(CASE WHEN presente = 1 AND status_validacao = 'validado' THEN 1 END) as presencas_validadas,
                COUNT(CASE WHEN status_validacao = 'pendente' THEN 1 END) as presencas_pendentes,
                COUNT(CASE WHEN status_validacao = 'rejeitado' THEN 1 END) as presencas_rejeitadas,
                COUNT(*) as total_registros
            FROM frequencia
            WHERE aluno_id = ?
                AND periodo_graduacao_id = ?
        `, [aluno.id, periodo.id]);

        const estatisticas = stats[0];

        // Buscar requisitos para próxima graduação
        let requisitos = null;
        if (aluno.proxima_graduacao_nome) {
            const reqs = await db.query(`
                SELECT * FROM requisitos_graduacao
                WHERE graduacao_atual_id = ?
                    AND graduacao_proxima_id = (
                        SELECT id FROM graduacoes_sistema WHERE ordem = ? + 1
                    )
            `, [aluno.graduacao_atual_id, aluno.graduacao_ordem]);

            if (reqs.length > 0) {
                requisitos = reqs[0];
            }
        }

        // Calcular tempo na graduação atual
        const dataReferencia = aluno.data_ultima_graduacao || aluno.data_inicio;
        const mesesNaGraduacao = Math.floor(
            (new Date() - new Date(dataReferencia)) / (1000 * 60 * 60 * 24 * 30)
        );

        // Calcular se está apto
        const aulasNecessarias = requisitos?.aulas_minimas || periodo.aulas_minimas_exigidas;
        const tempoNecessario = requisitos?.tempo_minimo_meses || 6;
        const frequenciaNecessaria = requisitos?.frequencia_minima_percent || periodo.frequencia_minima_percent;

        const frequenciaPercent = estatisticas.total_registros > 0
            ? (estatisticas.presencas_validadas / estatisticas.total_registros) * 100
            : 0;

        const aptoTempo = mesesNaGraduacao >= tempoNecessario;
        const aptoAulas = estatisticas.presencas_validadas >= aulasNecessarias;
        const aptoFrequencia = frequenciaPercent >= frequenciaNecessaria;
        const aptoGraduacao = aptoTempo && aptoAulas && aptoFrequencia;

        // Calcular progresso percentual e dias restantes
        const progressoPercentual = aulasNecessarias > 0
            ? Math.round((estatisticas.presencas_validadas / aulasNecessarias) * 100)
            : 0;

        const diasRestantes = Math.max(0, Math.ceil(
            (new Date(periodo.data_fim) - new Date()) / (1000 * 60 * 60 * 24)
        ));

        res.json({
            aluno: {
                nome: aluno.nome,
                matricula: aluno.matricula,
                data_inicio: aluno.data_inicio,
                data_ultima_graduacao: aluno.data_ultima_graduacao
            },
            graduacao_atual: {
                nome: aluno.graduacao_atual_nome,
                cor: aluno.graduacao_atual_cor,
                ordem: aluno.graduacao_ordem,
                graus: aluno.graus_faixa || 0
            },
            graduacao_cor: aluno.graduacao_atual_cor, // Para compatibilidade
            proxima_graduacao: aluno.proxima_graduacao_nome ? {
                nome: aluno.proxima_graduacao_nome,
                cor: aluno.proxima_graduacao_cor
            } : null,
            periodo: {
                nome: periodo.nome,
                data_inicio: periodo.data_inicio,
                data_fim: periodo.data_fim
            },
            periodo_nome: periodo.nome, // Para compatibilidade
            estatisticas: {
                presencas_validadas: estatisticas.presencas_validadas,
                presencas_pendentes: estatisticas.presencas_pendentes,
                presencas_rejeitadas: estatisticas.presencas_rejeitadas,
                total_registros: estatisticas.total_registros,
                frequencia_percent: Math.round(frequenciaPercent * 100) / 100
            },
            requisitos: {
                aulas_necessarias: aulasNecessarias,
                aulas_realizadas: estatisticas.presencas_validadas,
                aulas_faltantes: Math.max(0, aulasNecessarias - estatisticas.presencas_validadas),
                tempo_necessario_meses: tempoNecessario,
                meses_na_graduacao: mesesNaGraduacao,
                meses_faltantes: Math.max(0, tempoNecessario - mesesNaGraduacao),
                frequencia_necessaria: frequenciaNecessaria,
                frequencia_atual: Math.round(frequenciaPercent * 100) / 100
            },
            // Campos para a barra de progresso
            progresso_percentual: Math.min(100, progressoPercentual),
            presencas_periodo: estatisticas.presencas_validadas,
            presencas_necessarias: aulasNecessarias,
            dias_restantes: diasRestantes,
            apto_graduacao: aptoGraduacao,
            detalhes_aptidao: {
                tempo: aptoTempo,
                aulas: aptoAulas,
                frequencia: aptoFrequencia
            }
        });

    } catch (error) {
        console.error('Erro ao buscar progresso:', error);
        res.status(500).json({ error: 'Erro ao buscar progresso' });
    }
});

// ==========================================
// ENDPOINTS PARA ADMIN/PROFESSOR
// ==========================================

/**
 * GET /api/frequencia-novo/pendentes
 * Buscar presenças pendentes de validação
 */
router.get('/pendentes', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { data_inicio, data_fim, aluno_nome, turma_id, programa } = req.query;

        let query = `
            SELECT
                f.id,
                f.data_aula,
                f.created_at,
                f.localizacao_registro,
                a.matricula as aluno_matricula,
                u.nome as aluno_nome,
                t.id as turma_id,
                t.nome as turma_nome,
                t.horario_inicio,
                t.horario_fim,
                t.programa,
                t.dia_semana
            FROM frequencia f
            INNER JOIN alunos a ON f.aluno_id = a.id
            INNER JOIN usuarios u ON a.usuario_id = u.id
            INNER JOIN turmas t ON f.turma_id = t.id
            WHERE f.status_validacao = 'pendente'
        `;

        const params = [];

        if (data_inicio) {
            query += ' AND f.data_aula >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND f.data_aula <= ?';
            params.push(data_fim);
        }

        if (aluno_nome) {
            query += ' AND u.nome LIKE ?';
            params.push(`%${aluno_nome}%`);
        }

        if (turma_id) {
            query += ' AND t.id = ?';
            params.push(parseInt(turma_id));
        }

        if (programa) {
            query += ' AND t.programa = ?';
            params.push(programa);
        }

        query += ' ORDER BY f.created_at DESC';

        const presencas = await db.query(query, params);

        res.json({
            presencas,
            total: presencas.length
        });

    } catch (error) {
        console.error('Erro ao buscar presenças pendentes:', error);
        res.status(500).json({ error: 'Erro ao buscar presenças pendentes' });
    }
});

/**
 * PUT /api/frequencia-novo/validar/:id
 * Validar ou rejeitar presença registrada por aluno
 */
router.put('/validar/:id', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status_validacao, observacoes } = req.body;
        const validadorId = req.user.id;

        if (!['validado', 'rejeitado'].includes(status_validacao)) {
            return res.status(400).json({
                error: 'Status inválido. Use "validado" ou "rejeitado"'
            });
        }

        // Buscar frequência
        const frequencias = await db.query(
            'SELECT * FROM frequencia WHERE id = ?',
            [id]
        );

        if (frequencias.length === 0) {
            return res.status(404).json({ error: 'Registro de frequência não encontrado' });
        }

        const frequencia = frequencias[0];

        if (frequencia.status_validacao !== 'pendente') {
            return res.status(400).json({
                error: `Esta presença já foi ${frequencia.status_validacao}`
            });
        }

        // Atualizar status
        await db.query(`
            UPDATE frequencia
            SET status_validacao = ?,
                validado_por_id = ?,
                validado_em = NOW(),
                observacoes = CONCAT(COALESCE(observacoes, ''), ?)
            WHERE id = ?
        `, [
            status_validacao,
            validadorId,
            observacoes ? `\n[Validação] ${observacoes}` : '',
            id
        ]);

        res.json({
            success: true,
            message: `Presença ${status_validacao} com sucesso`,
            status_validacao
        });

    } catch (error) {
        console.error('Erro ao validar presença:', error);
        res.status(500).json({ error: 'Erro ao validar presença' });
    }
});

/**
 * POST /api/frequencia-novo/validar-lote
 * Validar ou rejeitar múltiplas presenças em lote
 */
router.post('/validar-lote', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { ids, status_validacao, observacoes } = req.body;
        const validadorId = req.user.id;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs de presenças são obrigatórios' });
        }

        if (!['validado', 'rejeitado'].includes(status_validacao)) {
            return res.status(400).json({
                error: 'Status inválido. Use "validado" ou "rejeitado"'
            });
        }

        let processados = 0;
        let erros = 0;
        const resultados = [];

        for (const id of ids) {
            try {
                // Buscar frequência
                const frequencias = await db.query(
                    'SELECT * FROM frequencia WHERE id = ? AND status_validacao = "pendente"',
                    [id]
                );

                if (frequencias.length === 0) {
                    resultados.push({ id, erro: 'Não encontrado ou já validado' });
                    erros++;
                    continue;
                }

                // Atualizar status
                await db.query(`
                    UPDATE frequencia
                    SET status_validacao = ?,
                        validado_por_id = ?,
                        validado_em = NOW(),
                        observacoes = CONCAT(COALESCE(observacoes, ''), ?)
                    WHERE id = ?
                `, [
                    status_validacao,
                    validadorId,
                    observacoes ? `\n[Validação em lote] ${observacoes}` : '',
                    id
                ]);

                resultados.push({ id, sucesso: true });
                processados++;

            } catch (erro) {
                console.error(`Erro ao validar presença ${id}:`, erro);
                resultados.push({ id, erro: erro.message });
                erros++;
            }
        }

        res.json({
            success: true,
            message: `${processados} presença(s) ${status_validacao}(s) com sucesso`,
            processados,
            erros,
            total: ids.length,
            resultados
        });

    } catch (error) {
        console.error('Erro ao validar presenças em lote:', error);
        res.status(500).json({ error: 'Erro ao validar presenças em lote' });
    }
});

/**
 * GET /api/frequencia-novo/turmas-ativas
 * Listar turmas ativas para filtros
 */
router.get('/turmas-ativas', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const turmas = await db.query(`
            SELECT id, nome, programa, dia_semana, horario_inicio, horario_fim
            FROM turmas
            WHERE status = 'ativo'
            ORDER BY nome
        `);

        res.json({ turmas });

    } catch (error) {
        console.error('Erro ao buscar turmas ativas:', error);
        res.status(500).json({ error: 'Erro ao buscar turmas ativas' });
    }
});

// ==========================================
// JUSTIFICATIVAS DE AUSÊNCIAS
// ==========================================

/**
 * POST /api/frequencia-novo/justificar-ausencia
 * Aluno justifica uma ausência
 */
router.post('/justificar-ausencia', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data_ausencia, motivo, anexo_url } = req.body;

        if (!data_ausencia || !motivo) {
            return res.status(400).json({ error: 'Data e motivo são obrigatórios' });
        }

        // Buscar aluno
        const alunos = await db.query(
            'SELECT id FROM alunos WHERE usuario_id = ?',
            [userId]
        );

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const alunoId = alunos[0].id;

        // Verificar se já existe justificativa para esta data
        const existentes = await db.query(
            'SELECT id FROM justificativas_ausencia WHERE aluno_id = ? AND data_ausencia = ?',
            [alunoId, data_ausencia]
        );

        if (existentes.length > 0) {
            return res.status(400).json({ error: 'Já existe uma justificativa para esta data' });
        }

        // Criar justificativa
        const result = await db.query(`
            INSERT INTO justificativas_ausencia
            (aluno_id, data_ausencia, motivo, anexo_url, status)
            VALUES (?, ?, ?, ?, 'pendente')
        `, [alunoId, data_ausencia, motivo, anexo_url || null]);

        res.status(201).json({
            success: true,
            message: 'Justificativa enviada com sucesso. Aguarde a análise.',
            id: result.insertId
        });

    } catch (error) {
        console.error('Erro ao criar justificativa:', error);
        res.status(500).json({ error: 'Erro ao criar justificativa' });
    }
});

/**
 * GET /api/frequencia-novo/minhas-justificativas
 * Lista justificativas do aluno logado
 */
router.get('/minhas-justificativas', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        // Buscar aluno
        const alunos = await db.query(
            'SELECT id FROM alunos WHERE usuario_id = ?',
            [userId]
        );

        if (alunos.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const alunoId = alunos[0].id;

        let query = `
            SELECT
                j.*,
                u.nome as analisado_por_nome
            FROM justificativas_ausencia j
            LEFT JOIN usuarios u ON j.analisado_por_id = u.id
            WHERE j.aluno_id = ?
        `;

        const params = [alunoId];

        if (status) {
            query += ' AND j.status = ?';
            params.push(status);
        }

        query += ' ORDER BY j.created_at DESC';

        const justificativas = await db.query(query, params);

        res.json({ justificativas });

    } catch (error) {
        console.error('Erro ao buscar justificativas:', error);
        res.status(500).json({ error: 'Erro ao buscar justificativas' });
    }
});

/**
 * GET /api/frequencia-novo/justificativas-pendentes
 * Lista justificativas pendentes (Admin/Professor)
 */
router.get('/justificativas-pendentes', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { data_inicio, data_fim, aluno_nome, status } = req.query;

        let query = `
            SELECT
                j.*,
                a.matricula as aluno_matricula,
                u.nome as aluno_nome,
                analisador.nome as analisado_por_nome
            FROM justificativas_ausencia j
            INNER JOIN alunos a ON j.aluno_id = a.id
            INNER JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN usuarios analisador ON j.analisado_por_id = analisador.id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND j.status = ?';
            params.push(status);
        } else {
            // Por padrão, mostrar apenas pendentes
            query += ' AND j.status = "pendente"';
        }

        if (data_inicio) {
            query += ' AND j.data_ausencia >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND j.data_ausencia <= ?';
            params.push(data_fim);
        }

        if (aluno_nome) {
            query += ' AND u.nome LIKE ?';
            params.push(`%${aluno_nome}%`);
        }

        query += ' ORDER BY j.created_at DESC';

        const justificativas = await db.query(query, params);

        res.json({
            justificativas,
            total: justificativas.length
        });

    } catch (error) {
        console.error('Erro ao buscar justificativas pendentes:', error);
        res.status(500).json({ error: 'Erro ao buscar justificativas' });
    }
});

/**
 * PUT /api/frequencia-novo/analisar-justificativa/:id
 * Aprovar ou rejeitar justificativa (Admin/Professor)
 */
router.put('/analisar-justificativa/:id', authenticateToken, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, observacoes_analise } = req.body;
        const analisadorId = req.user.id;

        if (!['aprovado', 'rejeitado'].includes(status)) {
            return res.status(400).json({
                error: 'Status inválido. Use "aprovado" ou "rejeitado"'
            });
        }

        // Buscar justificativa
        const justificativas = await db.query(
            'SELECT * FROM justificativas_ausencia WHERE id = ?',
            [id]
        );

        if (justificativas.length === 0) {
            return res.status(404).json({ error: 'Justificativa não encontrada' });
        }

        const justificativa = justificativas[0];

        if (justificativa.status !== 'pendente') {
            return res.status(400).json({
                error: 'Esta justificativa já foi analisada'
            });
        }

        // Atualizar justificativa
        await db.query(`
            UPDATE justificativas_ausencia
            SET status = ?,
                analisado_por_id = ?,
                analisado_em = NOW(),
                observacoes_analise = ?
            WHERE id = ?
        `, [status, analisadorId, observacoes_analise || null, id]);

        res.json({
            success: true,
            message: `Justificativa ${status === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso`
        });

    } catch (error) {
        console.error('Erro ao analisar justificativa:', error);
        res.status(500).json({ error: 'Erro ao analisar justificativa' });
    }
});

module.exports = router;
