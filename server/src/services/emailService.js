const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Serviço de envio de emails
 * Utiliza Nodemailer com suporte a templates personalizados
 */

// Configuração do transporter
const createTransport = () => {
    // Configuração para Gmail ou SMTP personalizado
    const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
        auth: {
            user: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br',
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Permite certificados auto-assinados
        }
    };

    return nodemailer.createTransport(config);
};

/**
 * Buscar template de email do banco de dados
 * @param {string} chave - Chave do template (ex: 'boas_vindas')
 * @returns {Object} Template com assunto e corpo
 */
async function getEmailTemplate(chave) {
    try {
        const templates = await query(
            'SELECT assunto, corpo_html, corpo_texto FROM email_templates WHERE chave = ? AND ativo = TRUE',
            [chave]
        );

        if (templates.length === 0) {
            throw new Error(`Template '${chave}' não encontrado`);
        }

        return templates[0];
    } catch (error) {
        logger.error('Erro ao buscar template:', error);
        throw error;
    }
}

/**
 * Substituir variáveis no template
 * @param {string} template - Template com variáveis {{var}}
 * @param {Object} variables - Objeto com as variáveis a substituir
 * @returns {string} Template com variáveis substituídas
 */
function replaceVariables(template, variables) {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }

    return result;
}

/**
 * Enviar email usando template
 * @param {Object} options - Opções de envio
 * @param {string} options.to - Email do destinatário
 * @param {string} options.toName - Nome do destinatário
 * @param {string} options.templateKey - Chave do template
 * @param {Object} options.variables - Variáveis para substituir no template
 * @param {number} options.usuarioId - ID do usuário (opcional)
 * @param {number} options.alunoId - ID do aluno (opcional)
 * @param {number} options.formularioId - ID do formulário (opcional)
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendTemplateEmail(options) {
    const {
        to,
        toName,
        templateKey,
        variables = {},
        usuarioId = null,
        alunoId = null,
        formularioId = null
    } = options;

    let emailLogId = null;

    try {
        // Buscar template
        const template = await getEmailTemplate(templateKey);

        // Substituir variáveis
        const assunto = replaceVariables(template.assunto, variables);
        const corpoHtml = replaceVariables(template.corpo_html, variables);
        const corpoTexto = replaceVariables(template.corpo_texto, variables);

        // Registrar tentativa no log
        const logResult = await query(`
            INSERT INTO emails_log (
                tipo_email, destinatario_email, destinatario_nome,
                assunto, corpo_email, status, usuario_id, aluno_id, formulario_id
            ) VALUES (?, ?, ?, ?, ?, 'pendente', ?, ?, ?)
        `, [
            templateKey,
            to,
            toName,
            assunto,
            corpoHtml,
            usuarioId,
            alunoId,
            formularioId
        ]);

        emailLogId = logResult.insertId;

        // Criar transporter
        const transporter = createTransport();

        // Configurar email
        const mailOptions = {
            from: {
                name: 'Gracie Barra Cidade Nova',
                address: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'
            },
            to: to,
            subject: assunto,
            html: corpoHtml,
            text: corpoTexto
        };

        // Enviar email
        const info = await transporter.sendMail(mailOptions);

        // Atualizar log como enviado
        await query(`
            UPDATE emails_log
            SET status = 'enviado', enviado_em = NOW(), tentativas = tentativas + 1
            WHERE id = ?
        `, [emailLogId]);

        logger.info(`Email enviado com sucesso: ${to} (${templateKey})`);

        return {
            success: true,
            messageId: info.messageId,
            emailLogId
        };

    } catch (error) {
        logger.error('Erro ao enviar email:', error);

        // Atualizar log com erro
        if (emailLogId) {
            await query(`
                UPDATE emails_log
                SET status = 'falha', erro_mensagem = ?, tentativas = tentativas + 1
                WHERE id = ?
            `, [error.message, emailLogId]);
        }

        throw error;
    }
}

/**
 * Enviar email de boas-vindas com credenciais
 * @param {Object} data - Dados do aluno
 * @param {string} data.nome - Nome do aluno
 * @param {string} data.email - Email do aluno
 * @param {string} data.senha - Senha temporária
 * @param {string} data.matricula - Matrícula do aluno
 * @param {number} data.usuarioId - ID do usuário
 * @param {number} data.alunoId - ID do aluno
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendWelcomeEmail(data) {
    const { nome, email, senha, matricula, usuarioId, alunoId } = data;

    const linkAcesso = process.env.APP_URL || 'http://localhost:3000/login';

    return await sendTemplateEmail({
        to: email,
        toName: nome,
        templateKey: 'boas_vindas',
        variables: {
            nome,
            email,
            senha,
            matricula,
            link_acesso: linkAcesso
        },
        usuarioId,
        alunoId
    });
}

/**
 * Enviar email de reset de senha
 * @param {Object} data - Dados para reset
 * @param {string} data.nome - Nome do usuário
 * @param {string} data.email - Email do usuário
 * @param {string} data.resetToken - Token de reset
 * @param {number} data.usuarioId - ID do usuário
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendPasswordResetEmail(data) {
    const { nome, email, resetToken, usuarioId } = data;

    const linkReset = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Criar template simples para reset (pode ser adicionado ao banco depois)
    const assunto = 'Recuperação de Senha - Gracie Barra Cidade Nova';
    const corpoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
                .content { background: #f8f9fa; padding: 30px; }
                .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Recuperação de Senha</h2>
                </div>
                <div class="content">
                    <p>Olá, <strong>${nome}</strong>!</p>
                    <p>Recebemos uma solicitação de recuperação de senha para sua conta.</p>
                    <p>Clique no botão abaixo para redefinir sua senha:</p>
                    <p style="text-align: center;">
                        <a href="${linkReset}" class="button">Redefinir Senha</a>
                    </p>
                    <p><strong>Este link expira em 1 hora.</strong></p>
                    <p>Se você não solicitou esta recuperação, ignore este email.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const logResult = await query(`
            INSERT INTO emails_log (
                tipo_email, destinatario_email, destinatario_nome,
                assunto, corpo_email, status, usuario_id
            ) VALUES ('reset_senha', ?, ?, ?, ?, 'pendente', ?)
        `, [email, nome, assunto, corpoHtml, usuarioId]);

        const transporter = createTransport();
        const mailOptions = {
            from: {
                name: 'Gracie Barra Cidade Nova',
                address: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'
            },
            to: email,
            subject: assunto,
            html: corpoHtml
        };

        const info = await transporter.sendMail(mailOptions);

        await query(`
            UPDATE emails_log
            SET status = 'enviado', enviado_em = NOW(), tentativas = tentativas + 1
            WHERE id = ?
        `, [logResult.insertId]);

        logger.info(`Email de reset enviado: ${email}`);

        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        logger.error('Erro ao enviar email de reset:', error);
        throw error;
    }
}

/**
 * Enviar email de notificação de alteração de senha
 * @param {Object} data - Dados para envio
 * @param {string} data.nome - Nome do usuário
 * @param {string} data.email - Email do usuário
 * @param {string} data.novaSenha - Nova senha do usuário
 * @param {string} data.alteradoPor - Nome de quem alterou
 * @param {number} data.usuarioId - ID do usuário
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendPasswordChangedEmail(data) {
    const { nome, email, novaSenha, alteradoPor, usuarioId } = data;

    const linkAcesso = process.env.APP_URL || 'http://localhost:4010/login';
    const assunto = 'Senha Alterada - Gracie Barra Cidade Nova';
    const corpoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 8px; margin-top: 20px; }
                .credentials { background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; }
                .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔐 Senha Alterada</h2>
                </div>
                <div class="content">
                    <p>Olá, <strong>${nome}</strong>!</p>
                    <p>Sua senha foi alterada por <strong>${alteradoPor}</strong>.</p>

                    <div class="credentials">
                        <p><strong>Suas novas credenciais:</strong></p>
                        <p>📧 <strong>Email:</strong> ${email}</p>
                        <p>🔑 <strong>Senha:</strong> ${novaSenha}</p>
                    </div>

                    <p><strong>⚠️ IMPORTANTE:</strong></p>
                    <ul>
                        <li>Guarde esta senha em local seguro</li>
                        <li>Recomendamos que você altere sua senha após o primeiro login</li>
                        <li>Nunca compartilhe sua senha com outras pessoas</li>
                    </ul>

                    <p style="text-align: center;">
                        <a href="${linkAcesso}" class="button">Acessar Sistema</a>
                    </p>

                    <p>Se você não solicitou esta alteração, entre em contato conosco imediatamente.</p>
                </div>

                <div class="footer">
                    <p>Gracie Barra Cidade Nova - Sistema de Gestão</p>
                    <p>Este é um email automático, não responda.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const corpoTexto = `
Olá, ${nome}!

Sua senha foi alterada por ${alteradoPor}.

Suas novas credenciais:
- Email: ${email}
- Senha: ${novaSenha}

IMPORTANTE:
- Guarde esta senha em local seguro
- Recomendamos que você altere sua senha após o primeiro login
- Nunca compartilhe sua senha com outras pessoas

Acesse o sistema: ${linkAcesso}

Se você não solicitou esta alteração, entre em contato conosco imediatamente.

---
Gracie Barra Cidade Nova - Sistema de Gestão
Este é um email automático, não responda.
    `;

    try {
        const logResult = await query(`
            INSERT INTO emails_log (
                tipo_email, destinatario_email, destinatario_nome,
                assunto, corpo_email, status, usuario_id
            ) VALUES ('reset_senha', ?, ?, ?, ?, 'pendente', ?)
        `, [email, nome, assunto, corpoHtml, usuarioId]);

        const transporter = createTransport();
        const mailOptions = {
            from: {
                name: 'Gracie Barra Cidade Nova',
                address: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'
            },
            to: email,
            subject: assunto,
            html: corpoHtml,
            text: corpoTexto
        };

        const info = await transporter.sendMail(mailOptions);

        await query(`
            UPDATE emails_log
            SET status = 'enviado', enviado_em = NOW(), tentativas = tentativas + 1
            WHERE id = ?
        `, [logResult.insertId]);

        logger.info(`Email de senha alterada enviado: ${email}`);

        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {
        logger.error('Erro ao enviar email de senha alterada:', error);
        // Não lançar erro para não interromper a alteração da senha
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enviar email de primeiro acesso para novo usuário
 * @param {Object} data - Dados para envio
 * @param {string} data.nome - Nome do usuário
 * @param {string} data.email - Email do usuário
 * @param {string} data.senha - Senha do usuário
 * @param {string} data.tipo_usuario - Tipo de usuário (admin, professor, aluno)
 * @param {string} data.matricula - Matrícula (opcional, para alunos)
 * @param {number} data.usuarioId - ID do usuário
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendFirstAccessEmail(data) {
    const { nome, email, senha, tipo_usuario, matricula, usuarioId } = data;

    const linkAcesso = process.env.APP_URL || 'http://localhost:4010/login';

    // Definir título baseado no tipo de usuário
    const tipoTitulo = {
        'admin': 'Administrador',
        'professor': 'Professor',
        'aluno': 'Aluno'
    }[tipo_usuario] || 'Usuário';

    const assunto = `Bem-vindo ao Gracie Barra Cidade Nova - Acesso ao Sistema`;
    const corpoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 8px; margin-top: 20px; }
                .credentials { background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; }
                .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Bem-vindo ao Gracie Barra Cidade Nova!</h2>
                </div>
                <div class="content">
                    <p>Olá, <strong>${nome}</strong>!</p>
                    <p>Sua conta como <strong>${tipoTitulo}</strong> foi criada com sucesso em nosso sistema.</p>

                    <div class="credentials">
                        <p><strong>Suas credenciais de acesso:</strong></p>
                        <p>📧 <strong>Email:</strong> ${email}</p>
                        <p>🔑 <strong>Senha:</strong> ${senha}</p>
                        ${matricula ? `<p>📋 <strong>Matrícula:</strong> ${matricula}</p>` : ''}
                    </div>

                    <p><strong>⚠️ IMPORTANTE - Primeiro Acesso:</strong></p>
                    <ul>
                        <li>No primeiro acesso, você será solicitado a <strong>alterar sua senha</strong></li>
                        <li>Você precisará <strong>aceitar os termos da LGPD</strong> para continuar</li>
                        <li>Guarde estas credenciais em local seguro</li>
                        <li>Nunca compartilhe sua senha com outras pessoas</li>
                    </ul>

                    <p style="text-align: center;">
                        <a href="${linkAcesso}" class="button">Acessar Sistema</a>
                    </p>

                    <p>Se você tiver dúvidas ou problemas para acessar, entre em contato conosco.</p>
                </div>

                <div class="footer">
                    <p>Gracie Barra Cidade Nova - Sistema de Gestão</p>
                    <p>Este é um email automático, não responda.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const corpoTexto = `
Olá, ${nome}!

Sua conta como ${tipoTitulo} foi criada com sucesso em nosso sistema.

Suas credenciais de acesso:
- Email: ${email}
- Senha: ${senha}
${matricula ? `- Matrícula: ${matricula}` : ''}

IMPORTANTE - Primeiro Acesso:
- No primeiro acesso, você será solicitado a alterar sua senha
- Você precisará aceitar os termos da LGPD para continuar
- Guarde estas credenciais em local seguro
- Nunca compartilhe sua senha com outras pessoas

Acesse o sistema: ${linkAcesso}

Se você tiver dúvidas ou problemas para acessar, entre em contato conosco.

---
Gracie Barra Cidade Nova - Sistema de Gestão
Este é um email automático, não responda.
    `;

    let emailLogId = null;

    try {
        // Tentar registrar log no banco (opcional - não falha se banco não estiver disponível)
        try {
            const logResult = await query(`
                INSERT INTO emails_log (
                    tipo_email, destinatario_email, destinatario_nome,
                    assunto, corpo_email, status, usuario_id
                ) VALUES ('boas_vindas', ?, ?, ?, ?, 'pendente', ?)
            `, [email, nome, assunto, corpoHtml, usuarioId]);
            emailLogId = logResult.insertId;
        } catch (dbError) {
            logger.warn(`Não foi possível registrar log no banco para ${email}:`, dbError.message);
            // Continua mesmo se o banco falhar
        }

        // Enviar email (principal)
        const transporter = createTransport();
        const mailOptions = {
            from: {
                name: 'Gracie Barra Cidade Nova',
                address: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'
            },
            to: email,
            subject: assunto,
            html: corpoHtml,
            text: corpoTexto
        };

        const info = await transporter.sendMail(mailOptions);

        // Atualizar log se foi criado
        if (emailLogId) {
            try {
                await query(`
                    UPDATE emails_log
                    SET status = 'enviado', enviado_em = NOW(), tentativas = tentativas + 1
                    WHERE id = ?
                `, [emailLogId]);
            } catch (dbError) {
                logger.warn(`Não foi possível atualizar log ${emailLogId}:`, dbError.message);
                // Continua mesmo se a atualização falhar
            }
        }

        logger.info(`✅ Email de primeiro acesso enviado: ${email} (${tipo_usuario})`);

        return {
            success: true,
            messageId: info.messageId,
            emailLogId
        };

    } catch (error) {
        logger.error('❌ Erro ao enviar email de primeiro acesso:', error);

        // Registrar falha no log se possível
        if (emailLogId) {
            try {
                await query(`
                    UPDATE emails_log
                    SET status = 'falha', erro_mensagem = ?, tentativas = tentativas + 1
                    WHERE id = ?
                `, [error.message, emailLogId]);
            } catch (dbError) {
                // Ignora erro ao atualizar log
            }
        }

        // Não lançar erro para não interromper a criação do usuário
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enviar email de felicitação de aniversário
 * @param {Object} data - Dados para envio
 * @param {string} data.nome - Nome do aniversariante
 * @param {string} data.email - Email do aniversariante
 * @param {number} data.alunoId - ID do aluno
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendBirthdayEmail(data) {
    const { nome, email, alunoId } = data;

    const assunto = 'Feliz Aniversário - Gracie Barra Cidade Nova';
    const corpoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; }
                .message { background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 5px; }
                .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>FELIZ ANIVERSÁRIO!</h1>
                    <h2>GRACIE BARRA CIDADE NOVA</h2>
                </div>
                <div class="content">
                    <p>Olá, <strong>${nome}</strong>!</p>

                    <div class="message">
                        <p style="font-size: 1.1em; margin: 0;">
                            A equipe da Gracie Barra Cidade Nova deseja um <strong>FELIZ ANIVERSÁRIO!</strong>
                        </p>
                        <p style="margin: 15px 0 0 0;">
                            Que este novo ano seja repleto de conquistas, saúde e muito Jiu-Jitsu!
                            Seguimos juntos nessa jornada!
                        </p>
                        <p style="margin: 15px 0 0 0; font-weight: bold;">
                            OSS!
                        </p>
                    </div>

                    <p>Estamos felizes por tê-lo(a) como parte da nossa família GB!</p>
                </div>
                <div class="footer">
                    <p>Gracie Barra Cidade Nova - Manaus/AM</p>
                    <p>Email: contato@gbcidadenovaam.com.br</p>
                    <p>© ${new Date().getFullYear()} Gracie Barra Cidade Nova. Todos os direitos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const corpoTexto = `
Olá, ${nome}!

A equipe da Gracie Barra Cidade Nova deseja um FELIZ ANIVERSÁRIO!

Que este novo ano seja repleto de conquistas, saúde e muito Jiu-Jitsu! Seguimos juntos nessa jornada!

OSS!

Estamos felizes por tê-lo(a) como parte da nossa família GB!

---
Gracie Barra Cidade Nova - Manaus/AM
Email: contato@gbcidadenovaam.com.br
© ${new Date().getFullYear()} Gracie Barra Cidade Nova
    `;

    let emailLogId = null;

    try {
        // Registrar log no banco
        try {
            const logResult = await query(`
                INSERT INTO emails_log (
                    tipo_email, destinatario_email, destinatario_nome,
                    assunto, corpo_email, status, aluno_id
                ) VALUES ('notificacao', ?, ?, ?, ?, 'pendente', ?)
            `, [email, nome, assunto, corpoHtml, alunoId]);
            emailLogId = logResult.insertId;
        } catch (dbError) {
            logger.warn(`Não foi possível registrar log no banco para ${email}:`, dbError.message);
        }

        // Enviar email
        const transporter = createTransport();
        const mailOptions = {
            from: {
                name: 'Gracie Barra Cidade Nova',
                address: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'
            },
            to: email,
            subject: assunto,
            html: corpoHtml,
            text: corpoTexto
        };

        const info = await transporter.sendMail(mailOptions);

        // Atualizar log como enviado
        if (emailLogId) {
            try {
                await query(`
                    UPDATE emails_log
                    SET status = 'enviado', enviado_em = NOW(), tentativas = tentativas + 1
                    WHERE id = ?
                `, [emailLogId]);
            } catch (dbError) {
                logger.warn(`Não foi possível atualizar log ${emailLogId}:`, dbError.message);
            }
        }

        logger.info(`✅ Email de aniversário enviado: ${email}`);

        return {
            success: true,
            messageId: info.messageId,
            emailLogId
        };

    } catch (error) {
        logger.error('❌ Erro ao enviar email de aniversário:', error);

        // Registrar falha no log
        if (emailLogId) {
            try {
                await query(`
                    UPDATE emails_log
                    SET status = 'falha', erro_mensagem = ?, tentativas = tentativas + 1
                    WHERE id = ?
                `, [error.message, emailLogId]);
            } catch (dbError) {
                // Ignora erro ao atualizar log
            }
        }

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enviar email de lembrete de pagamento
 * @param {Object} data - Dados para envio
 * @param {string} data.destinatarioNome - Nome do destinatário
 * @param {string} data.destinatarioEmail - Email do destinatário
 * @param {number} data.valorTotal - Valor da mensalidade
 * @param {number} data.mesReferencia - Mês de referência
 * @param {number} data.anoReferencia - Ano de referência
 * @param {string} data.dataVencimento - Data de vencimento
 * @param {string} data.status - Status da mensalidade (pendente/atrasado)
 * @param {number} data.mensalidadeId - ID da mensalidade
 * @param {number} data.alunoId - ID do aluno
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendPaymentReminderEmail(data) {
    const {
        destinatarioNome,
        destinatarioEmail,
        valorTotal,
        mesReferencia,
        anoReferencia,
        dataVencimento,
        status,
        mensalidadeId,
        alunoId,
        mensagemCustomizada = null,
        tipoNotificacao = 'manual',
        numeroTentativa = 1,
        destinatarioTipo = 'aluno',
        enviadoPor = null
    } = data;

    // Calcular dias até vencimento ou dias em atraso
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diferencaDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

    let statusMensagem, diasInfo, assuntoTitulo;

    if (diferencaDias > 0) {
        // Antes do vencimento
        statusMensagem = `vence em ${diferencaDias} ${diferencaDias === 1 ? 'dia' : 'dias'}.`;
        diasInfo = `${diferencaDias} ${diferencaDias === 1 ? 'dia' : 'dias'}`;
        assuntoTitulo = diferencaDias === 2 ? 'Lembrete: Sua mensalidade vence em 2 dias' : 'Lembrete de Mensalidade';
    } else if (diferencaDias === 0) {
        // No dia do vencimento
        statusMensagem = 'vence hoje.';
        diasInfo = '0 dias (HOJE)';
        assuntoTitulo = 'Hoje é o dia do vencimento da sua mensalidade';
    } else {
        // Após vencimento (atrasado)
        const diasAtraso = Math.abs(diferencaDias);
        statusMensagem = 'está em atraso.';
        diasInfo = `${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'} em atraso`;
        assuntoTitulo = 'Mensalidade em Atraso';
    }

    // Definir cores baseadas no status
    let corGradiente, corPrincipal;
    if (diferencaDias < 0) {
        // Atrasado - vermelho
        corGradiente = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
        corPrincipal = '#dc2626';
    } else if (diferencaDias === 0) {
        // Vence hoje - laranja
        corGradiente = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        corPrincipal = '#f59e0b';
    } else {
        // Pendente - azul
        corGradiente = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
        corPrincipal = '#3b82f6';
    }

    // Formatar data de vencimento
    const dataVencimentoFormatada = new Date(dataVencimento).toLocaleDateString('pt-BR');

    // Formatar valor
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valorTotal);

    // Formatar mês/ano
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = meses[mesReferencia - 1];
    const periodoReferencia = `${mesNome}/${anoReferencia}`;

    const assunto = `${assuntoTitulo} - Gracie Barra Cidade Nova`;

    const corpoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: ${corGradiente};
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                .header h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: normal;
                    opacity: 0.9;
                }
                .content {
                    padding: 30px;
                }
                .greeting {
                    font-size: 18px;
                    margin-bottom: 20px;
                }
                .message-box {
                    background: #f8f9fa;
                    padding: 20px;
                    border-left: 4px solid ${corPrincipal};
                    margin: 20px 0;
                    border-radius: 5px;
                }
                .details {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #f3f4f6;
                }
                .detail-row:last-child {
                    border-bottom: none;
                }
                .detail-label {
                    font-weight: bold;
                    color: #6b7280;
                }
                .detail-value {
                    color: #111827;
                    font-weight: 600;
                }
                .valor-destaque {
                    font-size: 24px;
                    color: ${corPrincipal};
                }
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    background: ${corPrincipal};
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .cta-button {
                    display: inline-block;
                    background: ${corPrincipal};
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .importance-box {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                }
                .footer {
                    background: #1f2937;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                }
                .footer p {
                    margin: 5px 0;
                }
                @media only screen and (max-width: 600px) {
                    .container {
                        margin: 0;
                        border-radius: 0;
                    }
                    .content {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Lembrete de Mensalidade</h1>
                    <h2>GRACIE BARRA CIDADE NOVA</h2>
                </div>
                <div class="content">
                    <div class="greeting">
                        Olá, <strong>${destinatarioNome}</strong>!
                    </div>

                    <p style="margin: 20px 0;">
                        Esperamos que você esteja bem e aproveitando suas aulas de Jiu-Jitsu!
                    </p>

                    <p style="margin: 20px 0;">
                        Este é um lembrete de que sua mensalidade de <strong>${periodoReferencia}</strong> ${statusMensagem}
                    </p>

                    <h3 style="color: #374151; margin-top: 25px;">📋 Detalhes da Mensalidade:</h3>

                    <div class="details">
                        <div class="detail-row">
                            <span class="detail-label">Valor:</span>
                            <span class="detail-value valor-destaque">${valorFormatado}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Vencimento:</span>
                            <span class="detail-value">${dataVencimentoFormatada}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Dias até o vencimento:</span>
                            <span class="detail-value">${diasInfo}</span>
                        </div>
                    </div>

                    ${mensagemCustomizada ? `
                    <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <p style="margin: 0; font-weight: 500; color: #075985;">
                            <strong>📝 Mensagem da Academia:</strong>
                        </p>
                        <p style="margin: 10px 0 0 0; color: #0c4a6e;">
                            ${mensagemCustomizada}
                        </p>
                    </div>
                    ` : ''}

                    <p style="margin: 20px 0;">
                        Seu pagamento é fundamental para mantermos a qualidade das instalações,
                        equipamentos e o ambiente de treinamento que você merece. Com sua contribuição,
                        podemos continuar oferecendo as melhores condições para seu desenvolvimento no
                        Jiu-Jitsu.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'https://gbcidadenovaam.com.br'}/login" class="cta-button">
                            Acessar Portal de Pagamento
                        </a>
                    </div>

                    <p style="font-size: 13px; color: #6b7280; margin-top: 25px;">
                        Se você já realizou o pagamento, desconsidere esta mensagem.
                    </p>

                    <p style="font-size: 13px; color: #6b7280; margin-top: 10px;">
                        Em caso de dúvidas ou dificuldades, entre em contato conosco:
                    </p>

                    <div style="margin-top: 15px;">
                        <p style="margin: 5px 0;"><strong>📧 Email:</strong> contato@gbcidadenovaam.com.br</p>
                        <p style="margin: 5px 0;"><strong>📱 WhatsApp:</strong> (92) 98113-6742 ou (92) 98150-1174</p>
                    </div>

                    <p style="margin-top: 25px; color: #6b7280;">
                        Obrigado por fazer parte da família Gracie Barra - Cidade Nova!
                    </p>

                    <p style="margin-top: 15px; color: #374151;">
                        --<br/>
                        Atenciosamente,<br/>
                        <strong>Equipe Gracie Barra Cidade Nova</strong>
                    </p>
                </div>
                <div class="footer">
                    <p><strong>Gracie Barra Cidade Nova</strong></p>
                    <p>Manaus/AM</p>
                    <p>Email: contato@gbcidadenovaam.com.br</p>
                    <p style="margin-top: 10px; opacity: 0.7;">© 2026 Gracie Barra Cidade Nova. Todos os direitos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const corpoTexto = `
Olá, ${destinatarioNome}!

Esperamos que você esteja bem e aproveitando suas aulas de Jiu-Jitsu!

Este é um lembrete de que sua mensalidade de ${periodoReferencia} ${statusMensagem}

📋 Detalhes da Mensalidade:
• Valor: ${valorFormatado}
• Vencimento: ${dataVencimentoFormatada}
• Dias até o vencimento: ${diasInfo}

${mensagemCustomizada ? `\n📝 Mensagem da Academia:\n${mensagemCustomizada}\n` : ''}
Seu pagamento é fundamental para mantermos a qualidade das instalações,
equipamentos e o ambiente de treinamento que você merece. Com sua contribuição,
podemos continuar oferecendo as melhores condições para seu desenvolvimento no
Jiu-Jitsu.

[Acessar Portal de Pagamento: ${process.env.APP_URL || 'https://gbcidadenovaam.com.br'}/login]

Se você já realizou o pagamento, desconsidere esta mensagem.

Em caso de dúvidas ou dificuldades, entre em contato conosco:
📧 Email: contato@gbcidadenovaam.com.br
📱 WhatsApp: (92) 98113-6742 ou (92) 98150-1174

Obrigado por fazer parte da família Gracie Barra - Cidade Nova!

--
Atenciosamente,
Equipe Gracie Barra Cidade Nova
    `;

    let emailLogId = null;

    try {
        // Registrar log no banco
        try {
            const logResult = await query(`
                INSERT INTO emails_log (
                    tipo_email, destinatario_email, destinatario_nome,
                    assunto, corpo_email, status, aluno_id, mensalidade_id
                ) VALUES ('cobranca', ?, ?, ?, ?, 'pendente', ?, ?)
            `, [destinatarioEmail, destinatarioNome, assunto, corpoHtml, alunoId, mensalidadeId]);
            emailLogId = logResult.insertId;
        } catch (dbError) {
            logger.warn(`Não foi possível registrar log no banco para ${destinatarioEmail}:`, dbError.message);
        }

        // Enviar email
        const transporter = createTransport();
        const mailOptions = {
            from: {
                name: 'Gracie Barra Cidade Nova',
                address: process.env.SMTP_USER || 'contato@gbcidadenovaam.com.br'
            },
            to: destinatarioEmail,
            subject: assunto,
            html: corpoHtml,
            text: corpoTexto
        };

        const info = await transporter.sendMail(mailOptions);

        // Atualizar log como enviado
        if (emailLogId) {
            try {
                await query(`
                    UPDATE emails_log
                    SET status = 'enviado', enviado_em = NOW(), tentativas = tentativas + 1
                    WHERE id = ?
                `, [emailLogId]);
            } catch (dbError) {
                logger.warn(`Não foi possível atualizar log ${emailLogId}:`, dbError.message);
            }
        }

        // Registrar na tabela mensalidades_notificacoes
        try {
            await query(`
                INSERT INTO mensalidades_notificacoes (
                    mensalidade_id, tipo_notificacao, numero_tentativa,
                    destinatario_tipo, destinatario_email, destinatario_nome,
                    mensagem_customizada, status_envio, enviado_por, email_log_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'enviado', ?, ?)
            `, [
                mensalidadeId, tipoNotificacao, numeroTentativa,
                destinatarioTipo, destinatarioEmail, destinatarioNome,
                mensagemCustomizada, enviadoPor, emailLogId
            ]);

            // Atualizar contadores na tabela mensalidades
            const updateFields = ['total_notificacoes_enviadas = total_notificacoes_enviadas + 1', 'data_ultima_notificacao = NOW()'];

            if (tipoNotificacao === 'automatica_2dias') {
                updateFields.push('notificacao_2dias_enviada = TRUE');
            } else if (tipoNotificacao === 'automatica_vencimento') {
                updateFields.push('notificacao_vencimento_enviada = TRUE');
            } else if (tipoNotificacao === 'automatica_atraso') {
                updateFields.push('notificacao_atraso_enviada = TRUE');
            }

            await query(`
                UPDATE mensalidades
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, [mensalidadeId]);
        } catch (dbError) {
            logger.warn(`Não foi possível registrar notificação no banco para ${destinatarioEmail}:`, dbError.message);
        }

        logger.info(`✅ Email de lembrete de pagamento enviado: ${destinatarioEmail} (tipo: ${tipoNotificacao})`);

        return {
            success: true,
            messageId: info.messageId,
            emailLogId
        };

    } catch (error) {
        logger.error('❌ Erro ao enviar email de lembrete de pagamento:', error);

        // Registrar falha no log
        if (emailLogId) {
            try {
                await query(`
                    UPDATE emails_log
                    SET status = 'falha', erro_mensagem = ?, tentativas = tentativas + 1
                    WHERE id = ?
                `, [error.message, emailLogId]);
            } catch (dbError) {
                // Ignora erro ao atualizar log
            }
        }

        throw error; // Re-lançar o erro para que o endpoint possa capturá-lo
    }
}

/**
 * Verificar configuração do serviço de email
 * @returns {Promise<boolean>} True se configurado corretamente
 */
async function verifyEmailConfig() {
    try {
        const transporter = createTransport();
        await transporter.verify();
        logger.info('✅ Configuração de email verificada com sucesso');
        return true;
    } catch (error) {
        logger.error('❌ Erro na configuração de email:', error);
        return false;
    }
}

module.exports = {
    sendTemplateEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendFirstAccessEmail,
    sendBirthdayEmail,
    sendPaymentReminderEmail,
    verifyEmailConfig,
    getEmailTemplate,
    replaceVariables
};
