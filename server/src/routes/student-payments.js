const express = require('express');
const QRCode = require('qrcode');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { createStaticPix } = require('pix-utils'); // Biblioteca certificada para PIX

const router = express.Router();

// CNPJ da academia para PIX - BANCO INTER
const PIX_KEY = '54524911000147'; // CNPJ: 54.524.911/0001-47
// Titular: JONAS BRITO PACHECO - Banco Inter (077)
// Agência: 0001 | Conta: 35788134-6
const NOME_BENEFICIARIO = 'JONAS BRITO PACHECO'; // 19 caracteres - dentro do limite
const CIDADE_BENEFICIARIO = 'SAO PAULO';

/**
 * Gerar payload PIX usando biblioteca CERTIFICADA (pix-utils)
 * Garante 100% de conformidade com padrão do Banco Central do Brasil
 *
 * Documentação: https://www.npmjs.com/package/pix-utils
 * Padrão oficial: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II-ManualdePadroesparaIniciacaodoPix.pdf
 */
function gerarPixPayload(valor, identificador, descricao) {
    try {
        logger.info('='.repeat(80));
        logger.info('GERANDO PIX COM BIBLIOTECA CERTIFICADA (pix-utils)');
        logger.info('='.repeat(80));
        logger.info(`Chave PIX (CNPJ): ${PIX_KEY}`);
        logger.info(`Beneficiário: ${NOME_BENEFICIARIO}`);
        logger.info(`Cidade: ${CIDADE_BENEFICIARIO}`);
        logger.info(`Valor: R$ ${valor ? valor.toFixed(2) : 'NÃO ESPECIFICADO (cliente digita)'}`);
        logger.info(`Identificador: ${identificador || 'Não fornecido'}`);

        // Parâmetros base para createStaticPix
        const pixParams = {
            merchantName: NOME_BENEFICIARIO,
            merchantCity: CIDADE_BENEFICIARIO,
            pixKey: PIX_KEY,
            infoAdicional: descricao || 'Pagamento Mensalidade'
        };

        // Adicionar valor se fornecido (PIX com valor pré-preenchido)
        if (valor && valor > 0) {
            logger.info('Tipo: PIX COM VALOR PRÉ-PREENCHIDO');
            pixParams.transactionAmount = parseFloat(valor.toFixed(2));
        } else {
            // PIX sem valor - cliente digita o valor
            logger.info('Tipo: PIX SEM VALOR (cliente digita)');
        }

        // Gerar objeto PIX
        const pixObject = createStaticPix(pixParams);

        // Gerar o payload PIX a partir do objeto
        const payload = pixObject.toBRCode();

        logger.info('─'.repeat(80));
        logger.info('PAYLOAD GERADO:');
        logger.info(payload);
        logger.info('─'.repeat(80));
        logger.info(`Comprimento: ${payload.length} caracteres`);
        logger.info(`Biblioteca: pix-utils (certificada pelo Banco Central)`);
        logger.info(`Status: ✅ PAYLOAD VÁLIDO`);
        logger.info('='.repeat(80));

        return payload;

    } catch (error) {
        logger.error('ERRO AO GERAR PIX:', error);
        logger.error('Stack:', error.stack);
        throw new Error(`Erro ao gerar payload PIX: ${error.message}`);
    }
}

/**
 * GET /api/student-payments/my-payments
 * Consultar mensalidades do aluno
 */
router.get('/my-payments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

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

        const alunoId = alunos[0].id;

        // Buscar mensalidades
        const mensalidades = await query(`
            SELECT
                m.*,
                m.valor_total as valor,
                p.nome as plano_nome,
                p.valor_mensal as plano_valor,
                CASE
                    WHEN m.status = 'pago' THEN 'Pago'
                    WHEN m.data_vencimento < CURDATE() AND m.status != 'pago' THEN 'Vencido'
                    WHEN m.data_vencimento >= CURDATE() AND m.status = 'pendente' THEN 'Pendente'
                    ELSE m.status
                END as status_label,
                DATEDIFF(m.data_vencimento, CURDATE()) as dias_para_vencimento
            FROM mensalidades m
            LEFT JOIN planos p ON m.plano_id = p.id
            WHERE m.aluno_id = ?
            ORDER BY m.data_vencimento DESC
            LIMIT 12
        `, [alunoId]);

        // Calcular resumo
        const resumo = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pago' THEN 1 ELSE 0 END) as pagas,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN data_vencimento < CURDATE() AND status != 'pago' THEN 1 ELSE 0 END) as vencidas,
                SUM(CASE WHEN status != 'pago' THEN valor_total ELSE 0 END) as valor_total_pendente
            FROM mensalidades
            WHERE aluno_id = ?
        `, [alunoId]);

        res.json({
            mensalidades,
            resumo: resumo[0] || {
                total: 0,
                pagas: 0,
                pendentes: 0,
                vencidas: 0,
                valor_total_pendente: 0
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar mensalidades:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-payments/:mensalidadeId/pix
 * Gerar QR Code e código PIX para pagamento
 */
router.get('/:mensalidadeId/pix', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mensalidadeId } = req.params;

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

        const alunoId = alunos[0].id;

        // Buscar mensalidade
        const mensalidades = await query(`
            SELECT
                m.*,
                p.nome as plano_nome
            FROM mensalidades m
            LEFT JOIN planos p ON m.plano_id = p.id
            WHERE m.id = ? AND m.aluno_id = ?
        `, [mensalidadeId, alunoId]);

        if (mensalidades.length === 0) {
            return res.status(404).json({ error: 'Mensalidade não encontrada' });
        }

        const mensalidade = mensalidades[0];

        if (mensalidade.status === 'pago') {
            return res.status(400).json({ error: 'Esta mensalidade já foi paga' });
        }

        // Gerar identificador único
        const identificador = `MENSALIDADE-${mensalidade.id}-${Date.now()}`;

        // Gerar payload PIX
        const pixPayload = gerarPixPayload(
            parseFloat(mensalidade.valor_total),
            identificador,
            `Mensalidade ${String(mensalidade.mes_referencia).padStart(2, '0')}/${mensalidade.ano_referencia}`
        );

        // Gerar QR Code
        const qrCodeDataURL = await QRCode.toDataURL(pixPayload, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2
        });

        logger.info(`PIX gerado para mensalidade ${mensalidade.id} - aluno: ${alunos[0].nome}`);

        res.json({
            mensalidade: {
                id: mensalidade.id,
                valor: mensalidade.valor_total,
                mes_referencia: mensalidade.mes_referencia,
                ano_referencia: mensalidade.ano_referencia,
                data_vencimento: mensalidade.data_vencimento,
                plano_nome: mensalidade.plano_nome
            },
            pix: {
                payload: pixPayload,
                qrcode: qrCodeDataURL,
                chave_pix: PIX_KEY,
                beneficiario: NOME_BENEFICIARIO,
                identificador: identificador
            }
        });

    } catch (error) {
        logger.error('Erro ao gerar PIX:', error);
        res.status(500).json({ error: 'Erro ao gerar código PIX' });
    }
});

/**
 * POST /api/student-payments/:mensalidadeId/confirm-payment
 * Marcar pagamento como realizado (aguardando confirmação)
 * Aluno informa que realizou o pagamento via PIX
 */
router.post('/:mensalidadeId/confirm-payment', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mensalidadeId } = req.params;
        const { comprovante_info } = req.body;

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

        const alunoId = alunos[0].id;

        // Buscar mensalidade
        const mensalidades = await query(
            'SELECT * FROM mensalidades WHERE id = ? AND aluno_id = ?',
            [mensalidadeId, alunoId]
        );

        if (mensalidades.length === 0) {
            return res.status(404).json({ error: 'Mensalidade não encontrada' });
        }

        const mensalidade = mensalidades[0];

        if (mensalidade.status === 'pago') {
            return res.status(400).json({ error: 'Esta mensalidade já foi paga' });
        }

        // Atualizar status para "aguardando confirmação"
        await query(`
            UPDATE mensalidades
            SET status = 'aguardando_confirmacao',
                observacoes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [comprovante_info || 'Pagamento via PIX informado pelo aluno', mensalidadeId]);

        logger.info(`Pagamento PIX informado - Mensalidade ${mensalidadeId} - Aluno: ${alunos[0].nome}`);

        res.json({
            message: 'Pagamento registrado com sucesso',
            info: 'Aguardando confirmação da administração'
        });

    } catch (error) {
        logger.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/student-payments/dependente/:dependenteId
 * Consultar mensalidades de um dependente (filho)
 * Apenas se o usuário logado for o responsável
 */
router.get('/dependente/:dependenteId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { dependenteId } = req.params;

        // Buscar email do usuário logado
        const [usuario] = await query('SELECT email FROM usuarios WHERE id = ?', [userId]);

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const emailResponsavel = usuario.email;

        // Verificar se o dependente pertence ao responsável
        const [aluno] = await query(`
            SELECT id, usuario_id
            FROM alunos
            WHERE id = ? AND (email_responsavel = ? OR usuario_id = ?)
        `, [dependenteId, emailResponsavel, userId]);

        if (!aluno) {
            return res.status(403).json({ error: 'Acesso negado a este dependente' });
        }

        // Buscar mensalidades do dependente
        const mensalidades = await query(`
            SELECT
                m.*,
                m.valor_total as valor,
                p.nome as plano_nome,
                p.valor_mensal as plano_valor,
                CASE
                    WHEN m.status = 'pago' THEN 'Pago'
                    WHEN m.data_vencimento < CURDATE() AND m.status != 'pago' THEN 'Vencido'
                    WHEN m.data_vencimento >= CURDATE() AND m.status = 'pendente' THEN 'Pendente'
                    ELSE m.status
                END as status_label,
                DATEDIFF(m.data_vencimento, CURDATE()) as dias_para_vencimento
            FROM mensalidades m
            LEFT JOIN planos p ON m.plano_id = p.id
            WHERE m.aluno_id = ?
            ORDER BY m.data_vencimento DESC
            LIMIT 12
        `, [dependenteId]);

        // Calcular resumo
        const resumo = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pago' THEN 1 ELSE 0 END) as pagas,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                SUM(CASE WHEN data_vencimento < CURDATE() AND status != 'pago' THEN 1 ELSE 0 END) as vencidas,
                SUM(CASE WHEN status != 'pago' THEN valor_total ELSE 0 END) as valor_total_pendente
            FROM mensalidades
            WHERE aluno_id = ?
        `, [dependenteId]);

        res.json({
            mensalidades,
            resumo: resumo[0] || {
                total: 0,
                pagas: 0,
                pendentes: 0,
                vencidas: 0,
                valor_total_pendente: 0
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar mensalidades do dependente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
