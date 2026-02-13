const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Configurar transporter SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

/**
 * Enviar email de notificação de pagamento
 */
async function enviarNotificacaoPagamento(recorrenciaId, tipoNotificacao) {
    try {
        // Buscar dados da recorrência e do aluno
        const [recorrencia] = await query(`
            SELECT
                pr.*,
                u.nome AS aluno_nome,
                u.email AS aluno_email,
                a.matricula,
                p.nome AS plano_nome
            FROM pagamentos_recorrentes pr
            INNER JOIN alunos a ON pr.aluno_id = a.id
            INNER JOIN usuarios u ON a.usuario_id = u.id
            INNER JOIN planos p ON pr.plano_id = p.id
            WHERE pr.id = ?
        `, [recorrenciaId]);

        if (!recorrencia) {
            logger.warn(`Recorrência ${recorrenciaId} não encontrada`);
            return { success: false, error: 'Recorrência não encontrada' };
        }

        const { aluno_nome, aluno_email, matricula, plano_nome, valor, data_proxima_cobranca, dia_vencimento } = recorrencia;

        // Formatar data
        const dataFormatada = new Date(data_proxima_cobranca).toLocaleDateString('pt-BR');
        const valorFormatado = parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Definir assunto e corpo do email baseado no tipo de notificação
        let assunto, corpo;

        switch (tipoNotificacao) {
            case '3_dias_antes':
                assunto = `Lembrete: Sua mensalidade vence em 3 dias`;
                corpo = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #003d7a 0%, #0056b3 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Gracie Barra Cidade Nova</h1>
                        </div>

                        <div style="padding: 30px; background-color: #f8f9fa;">
                            <h2 style="color: #003d7a;">Olá, ${aluno_nome}!</h2>

                            <p style="font-size: 16px; line-height: 1.6; color: #333;">
                                Este é um lembrete de que sua mensalidade <strong>vence em 3 dias</strong>.
                            </p>

                            <div style="background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <h3 style="color: #003d7a; margin-top: 0;">Detalhes do Pagamento</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;"><strong>Matrícula:</strong></td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">${matricula}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;"><strong>Plano:</strong></td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">${plano_nome}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;"><strong>Valor:</strong></td>
                                        <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #c8102e; font-size: 18px; font-weight: bold;">${valorFormatado}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;"><strong>Vencimento:</strong></td>
                                        <td style="padding: 10px 0; color: #c8102e; font-weight: bold;">${dataFormatada}</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="font-size: 14px; color: #666;">
                                Para evitar atrasos e manter seu treino em dia, por favor efetue o pagamento até a data de vencimento.
                            </p>

                            <p style="font-size: 14px; color: #666;">
                                Em caso de dúvidas, entre em contato conosco.
                            </p>
                        </div>

                        <div style="background-color: #003d7a; padding: 20px; text-align: center;">
                            <p style="color: white; margin: 0; font-size: 12px;">
                                Gracie Barra Cidade Nova - Excelência em Jiu-Jitsu<br>
                                contato@gbcidadenovaam.com.br
                            </p>
                        </div>
                    </div>
                `;
                break;

            case '1_dia_antes':
                assunto = `⚠️ Sua mensalidade vence amanhã`;
                corpo = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #c8102e 0%, #8a0c1f 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">⚠️ Lembrete Importante</h1>
                        </div>

                        <div style="padding: 30px; background-color: #f8f9fa;">
                            <h2 style="color: #c8102e;">Olá, ${aluno_nome}!</h2>

                            <p style="font-size: 16px; line-height: 1.6; color: #333;">
                                Sua mensalidade <strong style="color: #c8102e;">vence amanhã (${dataFormatada})</strong>.
                            </p>

                            <div style="background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #c8102e;">
                                <p style="margin: 0; font-size: 18px; color: #c8102e; font-weight: bold;">
                                    Valor: ${valorFormatado}
                                </p>
                                <p style="margin: 10px 0 0 0; color: #666;">
                                    Plano: ${plano_nome} | Matrícula: ${matricula}
                                </p>
                            </div>

                            <p style="font-size: 14px; color: #666;">
                                Por favor, efetue o pagamento o quanto antes para evitar a suspensão do seu acesso às aulas.
                            </p>
                        </div>

                        <div style="background-color: #003d7a; padding: 20px; text-align: center;">
                            <p style="color: white; margin: 0; font-size: 12px;">
                                Gracie Barra Cidade Nova<br>
                                contato@gbcidadenovaam.com.br
                            </p>
                        </div>
                    </div>
                `;
                break;

            case 'no_vencimento':
                assunto = `⏰ Hoje é o vencimento da sua mensalidade`;
                corpo = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #c8102e 0%, #8a0c1f 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">⏰ Vencimento Hoje</h1>
                        </div>

                        <div style="padding: 30px; background-color: #f8f9fa;">
                            <h2 style="color: #c8102e;">Olá, ${aluno_nome}!</h2>

                            <p style="font-size: 16px; line-height: 1.6; color: #333;">
                                Hoje (<strong>${dataFormatada}</strong>) é o vencimento da sua mensalidade.
                            </p>

                            <div style="background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #c8102e;">
                                <p style="margin: 0; font-size: 20px; color: #c8102e; font-weight: bold; text-align: center;">
                                    ${valorFormatado}
                                </p>
                                <p style="margin: 10px 0 0 0; color: #666; text-align: center;">
                                    ${plano_nome}
                                </p>
                            </div>

                            <p style="font-size: 14px; color: #666;">
                                Por favor, efetue o pagamento hoje para evitar atrasos e manter seu acesso às aulas.
                            </p>

                            <p style="font-size: 14px; color: #666; font-weight: bold;">
                                Qualquer dúvida, entre em contato conosco imediatamente.
                            </p>
                        </div>

                        <div style="background-color: #003d7a; padding: 20px; text-align: center;">
                            <p style="color: white; margin: 0; font-size: 12px;">
                                Gracie Barra Cidade Nova<br>
                                contato@gbcidadenovaam.com.br
                            </p>
                        </div>
                    </div>
                `;
                break;

            case 'atraso':
                assunto = `🚨 Mensalidade em atraso - Ação necessária`;
                corpo = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #8a0c1f 0%, #5a0714 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0;">🚨 Pagamento em Atraso</h1>
                        </div>

                        <div style="padding: 30px; background-color: #f8f9fa;">
                            <h2 style="color: #8a0c1f;">Olá, ${aluno_nome}</h2>

                            <p style="font-size: 16px; line-height: 1.6; color: #333;">
                                Identificamos que sua mensalidade está <strong style="color: #c8102e;">em atraso</strong>.
                            </p>

                            <div style="background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 3px solid #c8102e;">
                                <p style="margin: 0; font-size: 14px; color: #666;">Vencimento:</p>
                                <p style="margin: 5px 0; font-size: 18px; color: #c8102e; font-weight: bold;">${dataFormatada}</p>
                                <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;">Valor:</p>
                                <p style="margin: 0; font-size: 24px; color: #c8102e; font-weight: bold;">${valorFormatado}</p>
                            </div>

                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                                <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Atenção:</p>
                                <p style="margin: 5px 0 0 0; color: #856404;">
                                    Seu acesso às aulas pode ser suspenso até a regularização do pagamento.
                                </p>
                            </div>

                            <p style="font-size: 14px; color: #666; margin-top: 20px;">
                                <strong>Por favor, regularize seu pagamento o mais rápido possível.</strong>
                            </p>

                            <p style="font-size: 14px; color: #666;">
                                Se já efetuou o pagamento, por favor desconsidere este aviso e nos envie o comprovante.
                            </p>
                        </div>

                        <div style="background-color: #003d7a; padding: 20px; text-align: center;">
                            <p style="color: white; margin: 0; font-size: 12px;">
                                Gracie Barra Cidade Nova<br>
                                contato@gbcidadenovaam.com.br<br>
                                Entre em contato urgentemente
                            </p>
                        </div>
                    </div>
                `;
                break;

            default:
                logger.error(`Tipo de notificação desconhecido: ${tipoNotificacao}`);
                return { success: false, error: 'Tipo de notificação inválido' };
        }

        // Enviar email
        await transporter.sendMail({
            from: `"Gracie Barra Cidade Nova" <${process.env.SMTP_USER}>`,
            to: aluno_email,
            subject: assunto,
            html: corpo
        });

        // Registrar notificação no banco
        await query(`
            INSERT INTO pagamentos_notificacoes (
                recorrencia_id, aluno_id, tipo_notificacao,
                email_enviado_para, status, tentativas
            ) VALUES (?, ?, ?, ?, 'enviado', 1)
        `, [recorrenciaId, recorrencia.aluno_id, tipoNotificacao, aluno_email]);

        logger.info(`Notificação de pagamento enviada: ${tipoNotificacao} para ${aluno_email}`);

        return { success: true, message: 'Notificação enviada com sucesso' };

    } catch (error) {
        logger.error(`Erro ao enviar notificação de pagamento:`, error);

        // Registrar erro no banco
        try {
            const [recorrencia] = await query('SELECT aluno_id FROM pagamentos_recorrentes WHERE id = ?', [recorrenciaId]);
            if (recorrencia) {
                await query(`
                    INSERT INTO pagamentos_notificacoes (
                        recorrencia_id, aluno_id, tipo_notificacao,
                        email_enviado_para, status, tentativas, erro_mensagem
                    ) VALUES (?, ?, ?, '', 'erro', 1, ?)
                `, [recorrenciaId, recorrencia.aluno_id, tipoNotificacao, error.message]);
            }
        } catch (dbError) {
            logger.error('Erro ao registrar falha de notificação:', dbError);
        }

        return { success: false, error: error.message };
    }
}

/**
 * Processar notificações pendentes (executado por cron job)
 */
async function processarNotificacoesPendentes() {
    try {
        logger.info('Iniciando processamento de notificações de pagamento...');

        const hoje = new Date();
        const em3Dias = new Date(hoje);
        em3Dias.setDate(em3Dias.getDate() + 3);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        // Buscar recorrências ativas
        const recorrencias = await query(`
            SELECT * FROM pagamentos_recorrentes
            WHERE status = 'ativo'
            AND data_proxima_cobranca <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        `);

        logger.info(`Encontradas ${recorrencias.length} recorrências para processar`);

        let notificacoesEnviadas = 0;

        for (const recorrencia of recorrencias) {
            const dataVenc = new Date(recorrencia.data_proxima_cobranca);
            const diasAteVenc = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));

            // Notificação 3 dias antes
            if (diasAteVenc === 3 && !recorrencia.notificacao_3dias) {
                await enviarNotificacaoPagamento(recorrencia.id, '3_dias_antes');
                await query('UPDATE pagamentos_recorrentes SET notificacao_3dias = TRUE WHERE id = ?', [recorrencia.id]);
                notificacoesEnviadas++;
            }

            // Notificação 1 dia antes
            if (diasAteVenc === 1 && !recorrencia.notificacao_1dia) {
                await enviarNotificacaoPagamento(recorrencia.id, '1_dia_antes');
                await query('UPDATE pagamentos_recorrentes SET notificacao_1dia = TRUE WHERE id = ?', [recorrencia.id]);
                notificacoesEnviadas++;
            }

            // Notificação no vencimento
            if (diasAteVenc === 0 && !recorrencia.notificacao_vencimento) {
                await enviarNotificacaoPagamento(recorrencia.id, 'no_vencimento');
                await query('UPDATE pagamentos_recorrentes SET notificacao_vencimento = TRUE WHERE id = ?', [recorrencia.id]);
                notificacoesEnviadas++;
            }

            // Notificação de atraso
            if (diasAteVenc < 0 && recorrencia.status === 'ativo') {
                await enviarNotificacaoPagamento(recorrencia.id, 'atraso');
                await query('UPDATE pagamentos_recorrentes SET status = "inadimplente" WHERE id = ?', [recorrencia.id]);
                notificacoesEnviadas++;
            }
        }

        logger.info(`Processamento concluído: ${notificacoesEnviadas} notificações enviadas`);

        return { success: true, notificacoesEnviadas };

    } catch (error) {
        logger.error('Erro ao processar notificações:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    enviarNotificacaoPagamento,
    processarNotificacoesPendentes
};
