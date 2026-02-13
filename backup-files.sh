#!/bin/bash

# ================================================================
# SCRIPT DE BACKUP DE ARQUIVOS - GRACIE BARRA CIDADE NOVA
# ================================================================
# Data: 23/12/2025
# Execução: Semanal via cron (Domingo 01:00 UTC)
# Retenção: 4 semanas
# ================================================================

# Configurações
APP_DIR="/home/gbcadmin/gbcidadenova"
BACKUP_DIR="/var/backups/gbcidadenova/files"
LOG_FILE="/var/log/backup-files.log"
RETENTION_DAYS=28

# Data e hora para nome do arquivo
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gbcidadenova_files_${TIMESTAMP}.tar.gz"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Início do backup
log "========================================="
log "Iniciando backup de arquivos..."
log "Diretório: $APP_DIR"
log "========================================="

# Verificar se diretórios existem
if [ ! -d "$BACKUP_DIR" ]; then
    log "ERRO: Diretório $BACKUP_DIR não existe!"
    exit 1
fi

if [ ! -d "$APP_DIR" ]; then
    log "ERRO: Diretório $APP_DIR não existe!"
    exit 1
fi

# Fazer backup dos arquivos (excluindo node_modules, logs, etc)
log "Criando arquivo comprimido..."
if tar -czf "$BACKUP_FILE" \
    -C "$(dirname $APP_DIR)" \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='uploads' \
    --exclude='temp' \
    --exclude='tmp' \
    "$(basename $APP_DIR)" 2>&1 | tee -a "$LOG_FILE"; then

    # Verificar se arquivo foi criado
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "✅ Backup concluído com sucesso!"
        log "Arquivo: $BACKUP_FILE"
        log "Tamanho: $BACKUP_SIZE"
    else
        log "❌ ERRO: Arquivo de backup não foi criado!"
        exit 1
    fi
else
    log "❌ ERRO: tar falhou!"
    exit 1
fi

# Rotação de backups (manter apenas últimos 28 dias / 4 semanas)
log "Removendo backups antigos (> $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "gbcidadenova_files_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Listar backups existentes
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "gbcidadenova_files_*.tar.gz" -type f | wc -l)
log "Backups existentes: $BACKUP_COUNT"

# Calcular espaço usado
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Espaço total usado: $TOTAL_SIZE"

log "========================================="
log "Backup finalizado com sucesso!"
log "========================================="
log ""

exit 0
