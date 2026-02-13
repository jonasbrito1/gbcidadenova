const { query } = require('../config/database');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const { sendBirthdayEmail } = require('./emailService');

/**
 * Serviço de Notificação de Aniversários
 * - Envia emails automáticos para alunos aniversariantes
 * - Notifica administradores sobre aniversariantes do dia
 */

/**
 * Buscar todos os administradores ativos do sistema
 * @returns {Array} Lista de administradores com nome e email
 */
async function buscarAdministradores() {
    try {
        const admins = await query(`
            SELECT
                id,
                nome,
                email
            FROM usuarios
            WHERE tipo_usuario = 'admin'
              AND status = 'ativo'
              AND email IS NOT NULL
        `);

        logger.info(`[Aniversários] Encontrados ${admins.length} administradores ativos`);
        return admins;
    } catch (error) {
        logger.error('[Aniversários] Erro ao buscar administradores:', error);
        throw error;
    }
}

/**
 * Buscar alunos que fazem aniversário hoje
 * @returns {Array} Lista de alunos aniversariantes
 */
async function buscarAniversariantesHoje() {
    try {
        const hoje = new Date();
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth() + 1; // JavaScript months are 0-indexed

        const aniversariantes = await query(`
            SELECT
                a.id,
                u.nome,
                u.email,
                u.telefone,
                u.data_nascimento,
                a.programa,
                a.graduacao,
                DAY(u.data_nascimento) as dia_aniversario,
                MONTH(u.data_nascimento) as mes_aniversario,
                YEAR(CURDATE()) - YEAR(u.data_nascimento) -
                    CASE
                        WHEN MONTH(CURDATE()) < MONTH(u.data_nascimento) OR
                             (MONTH(CURDATE()) = MONTH(u.data_nascimento) AND DAY(CURDATE()) < DAY(u.data_nascimento))
                        THEN 1
                        ELSE 0
                    END as idade_proxima
            FROM alunos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            WHERE u.status = 'ativo'
              AND DAY(u.data_nascimento) = ?
              AND MONTH(u.data_nascimento) = ?
            ORDER BY u.nome
        `, [diaHoje, mesHoje]);

        logger.info(`[Aniversários] Encontrados ${aniversariantes.length} aniversariantes para hoje (${diaHoje}/${mesHoje})`);
        return aniversariantes;
    } catch (error) {
        logger.error('[Aniversários] Erro ao buscar aniversariantes:', error);
        throw error;
    }
}

/**
 * Verificar se email de aniversário já foi enviado este ano para o aluno
 * @param {number} alunoId - ID do aluno
 * @returns {boolean} true se já foi enviado
 */
async function verificarEmailJaEnviado(alunoId) {
    try {
        const resultado = await query(`
            SELECT id FROM mensagens_aniversario_enviadas
            WHERE aluno_id = ?
              AND ano_aniversario = YEAR(CURDATE())
              AND tipo_mensagem = 'email'
        `, [alunoId]);

        return resultado.length > 0;
    } catch (error) {
        logger.error(`[Aniversários] Erro ao verificar email enviado para aluno ${alunoId}:`, error);
        return false; // Em caso de erro, tenta enviar
    }
}

/**
 * Registrar email de aniversário enviado
 * @param {number} alunoId - ID do aluno
 */
async function registrarEmailEnviado(alunoId) {
    try {
        await query(`
            INSERT INTO mensagens_aniversario_enviadas
            (aluno_id, ano_aniversario, tipo_mensagem, enviado_por)
            VALUES (?, YEAR(CURDATE()), 'email', NULL)
        `, [alunoId]);

        logger.info(`[Aniversários] Email registrado para aluno ID ${alunoId}`);
    } catch (error) {
        logger.error(`[Aniversários] Erro ao registrar email para aluno ${alunoId}:`, error);
    }
}

/**
 * Enviar emails de aniversário automaticamente para alunos
 * @param {Array} aniversariantes - Lista de aniversariantes
 * @returns {Object} Resultado do envio
 */
async function enviarEmailsParaAniversariantes(aniversariantes) {
    const resultados = {
        enviados: 0,
        jaEnviados: 0,
        semEmail: 0,
        erros: 0,
        detalhes: []
    };

    for (const aluno of aniversariantes) {
        // Verificar se aluno tem email
        if (!aluno.email) {
            logger.warn(`[Aniversários] Aluno ${aluno.nome} (ID: ${aluno.id}) não tem email cadastrado`);
            resultados.semEmail++;
            resultados.detalhes.push({
                nome: aluno.nome,
                status: 'sem_email'
            });
            continue;
        }

        // Verificar se já foi enviado este ano
        const jaEnviado = await verificarEmailJaEnviado(aluno.id);
        if (jaEnviado) {
            logger.info(`[Aniversários] Email já enviado para ${aluno.nome} (${aluno.email}) este ano`);
            resultados.jaEnviados++;
            resultados.detalhes.push({
                nome: aluno.nome,
                status: 'ja_enviado'
            });
            continue;
        }

        // Enviar email de aniversário
        try {
            const result = await sendBirthdayEmail({
                nome: aluno.nome,
                email: aluno.email,
                alunoId: aluno.id
            });

            if (result.success) {
                // Registrar envio no banco
                await registrarEmailEnviado(aluno.id);
                resultados.enviados++;
                resultados.detalhes.push({
                    nome: aluno.nome,
                    status: 'enviado',
                    email: aluno.email
                });
                logger.info(`[Aniversários] ✅ Email de aniversário enviado para ${aluno.nome} (${aluno.email})`);
            } else {
                resultados.erros++;
                resultados.detalhes.push({
                    nome: aluno.nome,
                    status: 'erro',
                    erro: result.error
                });
                logger.error(`[Aniversários] ❌ Falha ao enviar para ${aluno.nome}: ${result.error}`);
            }
        } catch (error) {
            resultados.erros++;
            resultados.detalhes.push({
                nome: aluno.nome,
                status: 'erro',
                erro: error.message
            });
            logger.error(`[Aniversários] ❌ Erro ao enviar para ${aluno.nome}:`, error);
        }
    }

    logger.info(`[Aniversários] Resumo do envio automático: ${resultados.enviados} enviados, ${resultados.jaEnviados} já enviados, ${resultados.semEmail} sem email, ${resultados.erros} erros`);

    return resultados;
}

/**
 * Criar transporter de email
 */
function createTransport() {
    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br',
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    };

    return nodemailer.createTransport(config);
}

/**
 * Gerar HTML do email de notificação de aniversário
 * @param {Object} admin - Dados do administrador
 * @param {Array} aniversariantes - Lista de aniversariantes
 * @returns {String} HTML do email
 */
function gerarHtmlEmail(admin, aniversariantes) {
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const listaAlunos = aniversariantes.map(aluno => `
        <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">
                <strong style="color: #dc2626; font-size: 16px;">${aluno.nome}</strong><br>
                <span style="color: #666; font-size: 14px;">
                    ${aluno.idade_proxima} anos | ${aluno.programa || 'Programa não definido'}
                </span><br>
                ${aluno.email ? `<span style="color: #888; font-size: 13px;">📧 ${aluno.email}</span>` : ''}
                ${aluno.telefone ? `<br><span style="color: #888; font-size: 13px;">📱 ${aluno.telefone}</span>` : ''}
            </td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Aniversariantes do Dia</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                        🎂 Aniversariantes do Dia
                    </h1>
                    <p style="color: #fee; margin: 10px 0 0 0; font-size: 16px;">
                        ${dataFormatada}
                    </p>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Olá, <strong>${admin.nome}</strong>!
                    </p>

                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                        ${aniversariantes.length === 1 ? 'Temos 1 aluno fazendo' : `Temos ${aniversariantes.length} alunos fazendo`} aniversário hoje na Gracie Barra Cidade Nova!
                        Este é um momento especial para demonstrar apreço e fortalecer o vínculo com nossos alunos.
                    </p>

                    <!-- Lista de Aniversariantes -->
                    <div style="background-color: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            ${listaAlunos}
                        </table>
                    </div>

                    <!-- Info: Emails Automáticos -->
                    <div style="background: linear-gradient(to right, #d1fae5, #a7f3d0); border-left: 4px solid #10b981; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <p style="color: #065f46; font-size: 15px; margin: 0 0 10px 0; font-weight: 600;">
                            ✅ Emails Automáticos Enviados
                        </p>
                        <p style="color: #047857; font-size: 14px; margin: 0; line-height: 1.6;">
                            Os alunos que possuem email cadastrado já receberam automaticamente uma mensagem de felicitação por email.
                        </p>
                    </div>

                    <!-- Call to Action -->
                    <div style="background: linear-gradient(to right, #fef3c7, #fde68a); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                        <p style="color: #92400e; font-size: 15px; margin: 0 0 15px 0; font-weight: 600;">
                            📱 Enviar Mensagem via WhatsApp (Opcional)
                        </p>
                        <p style="color: #78350f; font-size: 14px; margin: 0 0 15px 0; line-height: 1.6;">
                            Para uma experiência mais pessoal, você também pode enviar uma mensagem via WhatsApp.
                            Acesse o sistema para gerenciar as mensagens de aniversário.
                        </p>
                        <a href="${process.env.FRONTEND_URL || 'https://gbcidadenovaam.com.br'}/app/dashboard"
                           style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 15px; margin-top: 5px;">
                            Acessar Sistema
                        </a>
                    </div>

                    <!-- Dicas -->
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <p style="color: #1e40af; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                            💡 Dicas para Mensagem via WhatsApp:
                        </p>
                        <ul style="color: #1e3a8a; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>O contato pessoal via WhatsApp reforça o vínculo</li>
                            <li>Mencione conquistas ou evolução recente do aluno</li>
                            <li>Convide para treinar no dia especial</li>
                            <li>Mantenha um tom caloroso e genuíno</li>
                        </ul>
                    </div>

                    <p style="color: #888; font-size: 13px; margin: 20px 0 0 0; line-height: 1.6;">
                        <em>Esta é uma notificação automática enviada pelo Sistema Gracie Barra Cidade Nova.</em>
                    </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Gracie Barra Cidade Nova<br>
                        Sistema de Gestão de Academia
                    </p>
                </div>

            </div>
        </body>
        </html>
    `;
}

/**
 * Enviar email de notificação para um administrador
 * @param {Object} admin - Dados do administrador
 * @param {Array} aniversariantes - Lista de aniversariantes
 */
async function enviarEmailParaAdmin(admin, aniversariantes) {
    try {
        const transporter = createTransport();
        const htmlEmail = gerarHtmlEmail(admin, aniversariantes);

        const plural = aniversariantes.length > 1;
        const assunto = plural
            ? `🎂 ${aniversariantes.length} Aniversariantes Hoje - Gracie Barra`
            : `🎂 Aniversariante Hoje: ${aniversariantes[0].nome} - Gracie Barra`;

        const mailOptions = {
            from: `"Gracie Barra Cidade Nova" <${process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'}>`,
            to: admin.email,
            subject: assunto,
            html: htmlEmail
        };

        await transporter.sendMail(mailOptions);
        logger.info(`[Aniversários] Email enviado para ${admin.nome} (${admin.email})`);
        return true;
    } catch (error) {
        logger.error(`[Aniversários] Erro ao enviar email para ${admin.email}:`, error);
        return false;
    }
}

/**
 * Processar e enviar notificações de aniversário do dia
 * Função principal chamada pelo scheduler
 *
 * FLUXO:
 * 1. Busca aniversariantes do dia
 * 2. Envia emails de felicitação automaticamente para os alunos (NOVO)
 * 3. Notifica administradores sobre os aniversariantes
 */
async function processarNotificacoesAniversario() {
    try {
        logger.info('[Aniversários] Iniciando processamento de notificações de aniversário...');

        // Buscar aniversariantes do dia
        const aniversariantes = await buscarAniversariantesHoje();

        if (aniversariantes.length === 0) {
            logger.info('[Aniversários] Nenhum aniversariante para hoje. Processamento concluído.');
            return {
                success: true,
                aniversariantes: 0,
                emailsParaAlunos: { enviados: 0, jaEnviados: 0, semEmail: 0, erros: 0 },
                emailsParaAdmins: 0
            };
        }

        // ====================================================
        // ETAPA 1: Enviar emails automáticos para os alunos
        // ====================================================
        logger.info('[Aniversários] Etapa 1: Enviando emails para alunos aniversariantes...');
        const resultadoAlunos = await enviarEmailsParaAniversariantes(aniversariantes);

        // ====================================================
        // ETAPA 2: Notificar administradores
        // ====================================================
        logger.info('[Aniversários] Etapa 2: Notificando administradores...');

        const administradores = await buscarAdministradores();
        let emailsParaAdmins = 0;

        if (administradores.length === 0) {
            logger.warn('[Aniversários] Nenhum administrador ativo encontrado.');
        } else {
            // Enviar emails para todos os administradores
            const resultados = await Promise.allSettled(
                administradores.map(admin => enviarEmailParaAdmin(admin, aniversariantes))
            );

            // Contar emails enviados com sucesso
            resultados.forEach((resultado, index) => {
                if (resultado.status === 'fulfilled' && resultado.value === true) {
                    emailsParaAdmins++;
                } else {
                    logger.warn(`[Aniversários] Falha ao enviar para admin ${administradores[index].nome}`);
                }
            });
        }

        logger.info(`[Aniversários] ✅ Processamento concluído!`);
        logger.info(`[Aniversários]    - Aniversariantes: ${aniversariantes.length}`);
        logger.info(`[Aniversários]    - Emails para alunos: ${resultadoAlunos.enviados} enviados, ${resultadoAlunos.jaEnviados} já enviados, ${resultadoAlunos.erros} erros`);
        logger.info(`[Aniversários]    - Emails para admins: ${emailsParaAdmins}/${administradores.length}`);

        return {
            success: true,
            aniversariantes: aniversariantes.length,
            emailsParaAlunos: resultadoAlunos,
            emailsParaAdmins: emailsParaAdmins,
            totalAdmins: administradores.length,
            detalhes: aniversariantes.map(a => ({ nome: a.nome, idade: a.idade_proxima }))
        };

    } catch (error) {
        logger.error('[Aniversários] Erro no processamento de notificações:', error);
        return {
            success: false,
            erro: error.message
        };
    }
}

module.exports = {
    processarNotificacoesAniversario,
    buscarAniversariantesHoje,
    enviarEmailsParaAniversariantes,
    buscarAdministradores
};
