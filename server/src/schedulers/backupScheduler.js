const cron = require('node-cron');
const logger = require('../utils/logger');
const backupService = require('../services/backupService');

/**
 * Agendador de Backups Automaticos
 *
 * Configuracao de horarios usando expressoes cron:
 *
 * Formato: * * * * * *
 *          | | | | | - dia da semana (0-7, sendo 0 e 7 domingo)
 *          | | | | --- mes (1-12)
 *          | | | ----- dia do mes (1-31)
 *          | | ------- hora (0-23)
 *          | --------- minuto (0-59)
 *          ----------- segundo (0-59) - opcional
 *
 * Exemplos:
 * 0 3 * * *     - Todo dia as 03:00
 * 0 3,15 * * *  - Todo dia as 03:00 e 15:00
 * 0 0 * * 0     - Todo domingo a meia-noite
 */

// ID do sistema para backups automaticos (pode ser null pois e automatico)
const SYSTEM_USER_ID = null;

// Configuracao dos backups automaticos
const BACKUP_SCHEDULES = [
    {
        name: 'Backup Noturno',
        cron: '0 3 * * *',  // Todo dia as 03:00 AM
        enabled: true
    },
    {
        name: 'Backup Tarde',
        cron: '0 15 * * *',  // Todo dia as 15:00 (3 PM)
        enabled: true
    }
];

/**
 * Executa um backup automatico
 * @param {string} scheduleName - Nome do agendamento
 */
async function executeScheduledBackup(scheduleName) {
    try {
        logger.info(`Iniciando backup automatico agendado: ${scheduleName}`);

        const result = await backupService.createBackup(SYSTEM_USER_ID, 'automatico');

        logger.info(`Backup automatico concluido com sucesso: ${scheduleName}`, {
            backupId: result.id,
            filename: result.filename,
            tamanho: result.tamanho,
            duracao: result.duracao
        });

        return result;
    } catch (error) {
        logger.error(`Erro ao executar backup automatico: ${scheduleName}`, {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Inicia os agendamentos de backup
 */
function initializeBackupScheduler() {
    const tasks = [];

    BACKUP_SCHEDULES.forEach(schedule => {
        if (!schedule.enabled) {
            logger.info(`Backup agendado desabilitado: ${schedule.name}`);
            return;
        }

        try {
            const task = cron.schedule(schedule.cron, async () => {
                await executeScheduledBackup(schedule.name);
            }, {
                scheduled: true,
                timezone: "America/Sao_Paulo"  // Fuso horario de Brasilia
            });

            tasks.push({
                name: schedule.name,
                cron: schedule.cron,
                task
            });

            logger.info(`Backup automatico agendado: ${schedule.name} - ${schedule.cron}`);
        } catch (error) {
            logger.error(`Erro ao agendar backup: ${schedule.name}`, error);
        }
    });

    if (tasks.length > 0) {
        logger.info(`${tasks.length} backup(s) automatico(s) configurado(s):`);
        tasks.forEach(t => {
            logger.info(`   ${t.name}: ${t.cron}`);
        });
    } else {
        logger.warn('Nenhum backup automatico foi configurado');
    }

    return tasks;
}

/**
 * Para todos os agendamentos
 * @param {Array} tasks - Array de tarefas agendadas
 */
function stopBackupScheduler(tasks) {
    tasks.forEach(t => {
        t.task.stop();
        logger.info(`Backup automatico parado: ${t.name}`);
    });
}

module.exports = {
    initializeBackupScheduler,
    stopBackupScheduler,
    executeScheduledBackup,
    BACKUP_SCHEDULES
};
