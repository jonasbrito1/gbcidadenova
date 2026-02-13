const { query } = require('../config/database');
const logger = require('../utils/logger');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Serviço completo de backup do banco de dados
 * Gerencia criação, restauração, histórico e download de backups
 * Suporta backups compactados, validação e agendamento
 * Última atualização: 2025-12-29 17:12
 */

const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * Obter caminho do mysqldump e mysql baseado no sistema operacional
 */
function getMySQLBinaries() {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
        // Windows: caminho padrão do MySQL 8.4
        const mysqlPath = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin';
        return {
            mysqldump: `"${path.join(mysqlPath, 'mysqldump.exe')}"`,
            mysql: `"${path.join(mysqlPath, 'mysql.exe')}"`
        };
    } else {
        // Linux/Mac: assumir que está no PATH
        return {
            mysqldump: 'mysqldump',
            mysql: 'mysql'
        };
    }
}

/**
 * Garantir que diretório de backups existe
 */
async function ensureBackupDir() {
    try {
        await fs.access(BACKUP_DIR);
    } catch {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    }
}

/**
 * Criar backup do banco de dados
 * @param {number} usuario_id - ID do usuário que solicitou
 * @param {string} tipo - Tipo do backup (manual, automatico, scheduled)
 * @returns {Object} Resultado do backup
 */
async function createBackup(usuario_id, tipo = 'manual') {
    let backupId;

    try {
        await ensureBackupDir();

        // Registrar início do backup
        const result = await query(`
            INSERT INTO system_backups (
                tipo,
                status,
                usuario_id,
                inicio_em
            ) VALUES (?, 'em_progresso', ?, NOW())
        `, [tipo, usuario_id]);

        backupId = result.insertId;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `backup_${timestamp}_${backupId}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        // Executar mysqldump
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 4309;
        const dbUser = process.env.DB_USER;
        const dbPassword = process.env.DB_PASSWORD;
        const dbName = process.env.DB_NAME;

        const startTime = Date.now();

        // Obter caminho do mysqldump
        const { mysqldump } = getMySQLBinaries();

        // Comando mysqldump
        const command = `${mysqldump} -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${dbName} > "${filepath}"`;

        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        const endTime = Date.now();
        const duracao = Math.round((endTime - startTime) / 1000);

        // Obter tamanho do arquivo
        const stats = await fs.stat(filepath);
        const tamanho = stats.size;

        // Obter lista de tabelas
        const tables = await query('SHOW TABLES');
        const tabelasIncluidas = tables.map(t => Object.values(t)[0]).join(', ');

        // Atualizar registro do backup
        await query(`
            UPDATE system_backups
            SET
                status = 'concluido',
                tamanho_bytes = ?,
                arquivo_nome = ?,
                arquivo_path = ?,
                tabelas_incluidas = ?,
                concluido_em = NOW(),
                duracao_segundos = ?
            WHERE id = ?
        `, [tamanho, filename, filepath, tabelasIncluidas, duracao, backupId]);

        logger.info(`Backup criado com sucesso: ${filename} (${tamanho} bytes)`);

        return {
            id: backupId,
            filename,
            tamanho,
            duracao,
            status: 'concluido'
        };

    } catch (error) {
        logger.error('Erro ao criar backup:', error);

        // Atualizar status para falha
        if (backupId) {
            await query(`
                UPDATE system_backups
                SET
                    status = 'falha',
                    erro_mensagem = ?,
                    concluido_em = NOW()
                WHERE id = ?
            `, [error.message, backupId]);
        }

        throw error;
    }
}

/**
 * Buscar histórico de backups
 * @param {Object} filters - Filtros
 * @returns {Array} Lista de backups
 */
async function getBackups(filters = {}) {
    try {
        const {
            tipo,
            status,
            limit = 50,
            offset = 0
        } = filters;

        let sql = `
            SELECT
                b.*,
                u.nome as usuario_nome,
                u.email as usuario_email
            FROM system_backups b
            LEFT JOIN usuarios u ON b.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            sql += ' AND b.tipo = ?';
            params.push(tipo);
        }

        if (status) {
            sql += ' AND b.status = ?';
            params.push(status);
        }

        // Valores LIMIT e OFFSET devem ser interpolados diretamente (MySQL não aceita ? para LIMIT/OFFSET)
        const limitNum = parseInt(limit, 10) || 50;
        const offsetNum = parseInt(offset, 10) || 0;
        sql += ` ORDER BY b.inicio_em DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const backups = await query(sql, params);

        // Contar total
        let countSql = 'SELECT COUNT(*) as total FROM system_backups b WHERE 1=1';
        const countParams = [];

        if (tipo) {
            countSql += ' AND b.tipo = ?';
            countParams.push(tipo);
        }

        if (status) {
            countSql += ' AND b.status = ?';
            countParams.push(status);
        }

        const countResult = await query(countSql, countParams);

        return {
            backups,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
    } catch (error) {
        logger.error('Erro ao buscar backups:', error);
        throw error;
    }
}

/**
 * Buscar estatísticas de backups
 * @returns {Object} Estatísticas
 */
async function getBackupStats() {
    try {
        const [stats] = await query(`
            SELECT
                COUNT(*) as total_backups,
                SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as bem_sucedidos,
                SUM(CASE WHEN status = 'falha' THEN 1 ELSE 0 END) as falhas,
                SUM(tamanho_bytes) as espaco_total,
                AVG(duracao_segundos) as duracao_media,
                MAX(concluido_em) as ultimo_backup
            FROM system_backups
            WHERE status = 'concluido'
        `);

        // Último backup bem-sucedido
        const lastBackupResult = await query(`
            SELECT
                id,
                tipo,
                tamanho_bytes,
                arquivo_nome,
                concluido_em,
                duracao_segundos
            FROM system_backups
            WHERE status = 'concluido'
            ORDER BY concluido_em DESC
            LIMIT 1
        `);

        return {
            ...stats,
            lastBackup: lastBackupResult.length > 0 ? lastBackupResult[0] : null
        };
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de backups:', error);
        throw error;
    }
}

/**
 * Obter caminho do arquivo de backup
 * @param {number} backupId - ID do backup
 * @returns {string} Caminho do arquivo
 */
async function getBackupPath(backupId) {
    try {
        const backup = await query(`
            SELECT arquivo_path, status
            FROM system_backups
            WHERE id = ?
        `, [backupId]);

        if (backup.length === 0) {
            throw new Error('Backup não encontrado');
        }

        if (backup[0].status !== 'concluido') {
            throw new Error('Backup não está disponível');
        }

        // Verificar se arquivo existe
        await fs.access(backup[0].arquivo_path);

        return backup[0].arquivo_path;
    } catch (error) {
        logger.error('Erro ao obter caminho do backup:', error);
        throw error;
    }
}

/**
 * Deletar backup
 * @param {number} backupId - ID do backup
 */
async function deleteBackup(backupId) {
    try {
        const backup = await query(`
            SELECT arquivo_path
            FROM system_backups
            WHERE id = ?
        `, [backupId]);

        if (backup.length === 0) {
            throw new Error('Backup não encontrado');
        }

        // Deletar arquivo físico
        if (backup[0].arquivo_path) {
            try {
                await fs.unlink(backup[0].arquivo_path);
            } catch (err) {
                logger.warn(`Arquivo de backup não encontrado: ${backup[0].arquivo_path}`);
            }
        }

        // Deletar registro
        await query('DELETE FROM system_backups WHERE id = ?', [backupId]);

        logger.info(`Backup deletado: ID ${backupId}`);
    } catch (error) {
        logger.error('Erro ao deletar backup:', error);
        throw error;
    }
}

/**
 * Restaurar backup do banco de dados
 * @param {number} backupId - ID do backup
 * @param {number} usuario_id - ID do usuário que solicitou
 * @returns {Object} Resultado da restauração
 */
async function restoreBackup(backupId, usuario_id) {
    let restoreLog;

    try {
        // Buscar informações do backup
        const backup = await query(`
            SELECT id, arquivo_path, arquivo_nome, status
            FROM system_backups
            WHERE id = ?
        `, [backupId]);

        if (backup.length === 0) {
            throw new Error('Backup não encontrado');
        }

        if (backup[0].status !== 'concluido') {
            throw new Error('Backup não está disponível para restauração');
        }

        // Verificar se arquivo existe
        await fs.access(backup[0].arquivo_path);

        // Registrar início da restauração
        const logResult = await query(`
            INSERT INTO system_logs (
                tipo, categoria, usuario_id, acao, descricao, metadata
            ) VALUES (
                'info', 'database', ?, 'restore_backup',
                'Iniciando restauração do backup',
                ?
            )
        `, [usuario_id, JSON.stringify({ backupId, arquivo: backup[0].arquivo_nome })]);

        restoreLog = logResult.insertId;

        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 4309;
        const dbUser = process.env.DB_USER;
        const dbPassword = process.env.DB_PASSWORD;
        const dbName = process.env.DB_NAME;

        const startTime = Date.now();

        // Obter caminho do mysql
        const { mysql } = getMySQLBinaries();

        // Comando mysql para restaurar
        const command = `${mysql} -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${dbName} < "${backup[0].arquivo_path}"`;

        await execPromise(command);

        const endTime = Date.now();
        const duracao = Math.round((endTime - startTime) / 1000);

        // Registrar sucesso
        await query(`
            UPDATE system_logs
            SET descricao = ?, metadata = ?
            WHERE id = ?
        `, [
            `Backup restaurado com sucesso em ${duracao}s`,
            JSON.stringify({ backupId, arquivo: backup[0].arquivo_nome, duracao }),
            restoreLog
        ]);

        logger.info(`Backup ${backupId} restaurado com sucesso`);

        return {
            success: true,
            backupId,
            arquivo: backup[0].arquivo_nome,
            duracao
        };

    } catch (error) {
        logger.error('Erro ao restaurar backup:', error);

        // Registrar falha
        if (restoreLog) {
            await query(`
                UPDATE system_logs
                SET tipo = 'error', descricao = ?
                WHERE id = ?
            `, [`Falha ao restaurar backup: ${error.message}`, restoreLog]);
        }

        throw error;
    }
}

/**
 * Validar integridade de um backup
 * @param {number} backupId - ID do backup
 * @returns {Object} Resultado da validação
 */
async function validateBackup(backupId) {
    try {
        const backup = await query(`
            SELECT id, arquivo_path, arquivo_nome, tamanho_bytes, status
            FROM system_backups
            WHERE id = ?
        `, [backupId]);

        if (backup.length === 0) {
            throw new Error('Backup não encontrado');
        }

        if (backup[0].status !== 'concluido') {
            return {
                valid: false,
                error: 'Backup não concluído'
            };
        }

        // Verificar se arquivo existe
        try {
            await fs.access(backup[0].arquivo_path);
        } catch {
            return {
                valid: false,
                error: 'Arquivo de backup não encontrado'
            };
        }

        // Verificar tamanho do arquivo
        const stats = await fs.stat(backup[0].arquivo_path);

        if (stats.size !== backup[0].tamanho_bytes) {
            return {
                valid: false,
                error: 'Tamanho do arquivo não corresponde ao registrado',
                expectedSize: backup[0].tamanho_bytes,
                actualSize: stats.size
            };
        }

        // Verificar se arquivo SQL é válido (contém CREATE TABLE ou INSERT)
        const fileContent = fsSync.readFileSync(backup[0].arquivo_path, 'utf8').substring(0, 5000);

        if (!fileContent.includes('CREATE TABLE') && !fileContent.includes('INSERT INTO')) {
            return {
                valid: false,
                error: 'Arquivo não parece ser um backup SQL válido'
            };
        }

        return {
            valid: true,
            backupId,
            arquivo: backup[0].arquivo_nome,
            tamanho: stats.size
        };

    } catch (error) {
        logger.error('Erro ao validar backup:', error);
        throw error;
    }
}

/**
 * Verificar espaço disponível em disco
 * @returns {Object} Informações de espaço
 */
async function checkDiskSpace() {
    try {
        const isWindows = process.platform === 'win32';
        let command;

        if (isWindows) {
            // Windows: usar PowerShell
            command = 'powershell -Command "Get-PSDrive C | Select-Object @{Name=\'Free\';Expression={$_.Free}},@{Name=\'Used\';Expression={$_.Used}} | ConvertTo-Json"';
        } else {
            // Linux/Mac: usar df
            command = `df -k ${BACKUP_DIR} | tail -1`;
        }

        const { stdout } = await execPromise(command);

        let freeSpace, totalSpace;

        if (isWindows) {
            const diskInfo = JSON.parse(stdout.trim());
            freeSpace = parseInt(diskInfo.Free, 10) || 0;
            const usedSpace = parseInt(diskInfo.Used, 10) || 0;
            totalSpace = freeSpace + usedSpace;
        } else {
            const parts = stdout.trim().split(/\s+/);
            totalSpace = parseInt(parts[1], 10) * 1024;  // Converter KB para bytes
            freeSpace = parseInt(parts[3], 10) * 1024;
        }

        return {
            freeSpaceBytes: freeSpace,
            totalSpaceBytes: totalSpace,
            usedSpaceBytes: totalSpace - freeSpace,
            percentUsed: ((totalSpace - freeSpace) / totalSpace * 100).toFixed(2)
        };

    } catch (error) {
        logger.error('Erro ao verificar espaço em disco:', error);
        // Retornar valores padrão em caso de erro
        return {
            freeSpaceBytes: 0,
            totalSpaceBytes: 0,
            usedSpaceBytes: 0,
            percentUsed: 0,
            error: error.message
        };
    }
}

/**
 * Limpar backups antigos (manter apenas os N mais recentes)
 * @param {number} keepCount - Quantidade de backups a manter
 * @returns {Array} Backups removidos
 */
async function cleanOldBackups(keepCount = 10) {
    try {
        // Buscar backups concluídos, ordenados por data (mais recentes primeiro)
        const backups = await query(`
            SELECT id, arquivo_path, arquivo_nome
            FROM system_backups
            WHERE status = 'concluido'
            ORDER BY concluido_em DESC
        `);

        const backupsToDelete = backups.slice(keepCount);
        const deletedBackups = [];

        for (const backup of backupsToDelete) {
            try {
                // Deletar arquivo físico
                if (backup.arquivo_path) {
                    await fs.unlink(backup.arquivo_path);
                }

                // Deletar registro
                await query('DELETE FROM system_backups WHERE id = ?', [backup.id]);

                deletedBackups.push({
                    id: backup.id,
                    arquivo: backup.arquivo_nome
                });

                logger.info(`Backup antigo removido: ${backup.arquivo_nome}`);
            } catch (err) {
                logger.warn(`Erro ao remover backup ${backup.id}:`, err);
            }
        }

        return deletedBackups;

    } catch (error) {
        logger.error('Erro ao limpar backups antigos:', error);
        throw error;
    }
}

module.exports = {
    createBackup,
    getBackups,
    getBackupStats,
    getBackupPath,
    deleteBackup,
    restoreBackup,
    validateBackup,
    checkDiskSpace,
    cleanOldBackups,
    BACKUP_DIR
};
