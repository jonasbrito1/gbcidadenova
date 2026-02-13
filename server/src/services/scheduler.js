const cron = require('node-cron');
const { processarNotificacoesPendentes } = require('./paymentNotificationService');
const { processarNotificacoesAniversario } = require('./birthdayNotificationService');
const logger = require('../utils/logger');

/**
 * Inicializar agendamentos automáticos
 */
function inicializarScheduler() {
    // Notificações de Aniversário - Executar todos os dias às 8h
    cron.schedule('0 8 * * *', async () => {
        logger.info('Executando processamento agendado de notificações de aniversário...');
        try {
            const resultado = await processarNotificacoesAniversario();
            if (resultado.success && resultado.aniversariantes > 0) {
                logger.info(`✅ Notificações de aniversário enviadas: ${resultado.emailsEnviados} emails para ${resultado.aniversariantes} aniversariante(s)`);
            }
        } catch (error) {
            logger.error('❌ Erro ao processar notificações de aniversário:', error);
        }
    });

    // Notificações de Pagamento - Executar todos os dias às 9h
    cron.schedule('0 9 * * *', async () => {
        logger.info('Executando processamento agendado de notificações de pagamento...');
        await processarNotificacoesPendentes();
    });

    // Notificações de Pagamento - Executar todos os dias às 18h (segunda execução)
    cron.schedule('0 18 * * *', async () => {
        logger.info('Executando processamento agendado de notificações de pagamento (18h)...');
        await processarNotificacoesPendentes();
    });

    logger.info('✅ Schedulers inicializados com sucesso');
    logger.info('   📅 Aniversários: 8h todos os dias');
    logger.info('   💰 Pagamentos: 9h e 18h todos os dias');
}

module.exports = {
    inicializarScheduler
};
