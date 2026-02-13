#!/bin/bash

# ================================================================
# SCRIPT DE BACKUP MYSQL - GRACIE BARRA CIDADE NOVA
# ================================================================
# Data: 23/12/2025
# Execução: Diária via cron (00:00 UTC)
# Retenção: 7 dias
# ================================================================

# Detectar falhas em pipes
set -o pipefail

# Configurações
DB_USER="gbcuser"
DB_PASSWORD="T/Q83GviAJb+uimic1WdgtFDi1L0lz7IS"
DB_NAME="gbcidadenova"
DB_HOST="localhost"

BACKUP_DIR="/var/backups/gbcidadenova/mysql"
LOG_FILE="/var/log/backup-mysql.log"
RETENTION_DAYS=7
MIN_BACKUP_SIZE=1024  # Tamanho mínimo em bytes (1KB)

# Data e hora para nome do arquivo
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gbcidadenova_${TIMESTAMP}.sql.gz"
TEMP_SQL="/tmp/gbcidadenova_${TIMESTAMP}.sql"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Início do backup
log "========================================="
log "Iniciando backup do MySQL..."
log "Banco: $DB_NAME"
log "========================================="

# Verificar se diretório existe
if [ ! -d "$BACKUP_DIR" ]; then
    log "ERRO: Diretório $BACKUP_DIR não existe!"
    exit 1
fi

# Verificar se MySQL está rodando
if ! systemctl is-active --quiet mariadb; then
    log "ERRO: MariaDB não está rodando!"
    exit 1
fi

# Fazer backup do banco (primeiro para arquivo temporário)
log "Executando mysqldump..."
if mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --quick \
    --lock-tables=false \
    > "$TEMP_SQL" 2>&1 | tee -a "$LOG_FILE"; then

    # Verificar se arquivo SQL foi criado e tem tamanho razoável
    if [ -f "$TEMP_SQL" ]; then
        SQL_SIZE=$(stat -c%s "$TEMP_SQL")

        if [ "$SQL_SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
            log "❌ ERRO: Arquivo SQL muito pequeno ($SQL_SIZE bytes) - backup pode ter falhado"
            log "Conteúdo do arquivo:"
            head -20 "$TEMP_SQL" | tee -a "$LOG_FILE"
            rm -f "$TEMP_SQL"
            exit 1
        fi

        # Comprimir o arquivo
        log "Comprimindo backup..."
        if gzip -c "$TEMP_SQL" > "$BACKUP_FILE"; then
            rm -f "$TEMP_SQL"
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            BACKUP_SIZE_BYTES=$(stat -c%s "$BACKUP_FILE")
            log "✅ Backup concluído com sucesso!"
            log "Arquivo: $BACKUP_FILE"
            log "Tamanho: $BACKUP_SIZE ($BACKUP_SIZE_BYTES bytes)"
        else
            log "❌ ERRO: Falha ao comprimir backup!"
            rm -f "$TEMP_SQL"
            exit 1
        fi
    else
        log "❌ ERRO: Arquivo SQL não foi criado!"
        exit 1
    fi
else
    log "❌ ERRO: mysqldump falhou!"
    rm -f "$TEMP_SQL"
    exit 1
fi

# Rotação de backups (manter apenas últimos 7 dias)
log "Removendo backups antigos (> $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "gbcidadenova_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Listar backups existentes
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "gbcidadenova_*.sql.gz" -type f | wc -l)
log "Backups existentes: $BACKUP_COUNT"

# Calcular espaço usado
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Espaço total usado: $TOTAL_SIZE"

log "========================================="
log "Backup finalizado com sucesso!"
log "========================================="
log ""

exit 0
