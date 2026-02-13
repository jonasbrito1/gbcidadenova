#!/bin/bash

# ================================================================
# SCRIPT DE VERIFICAÇÃO DE BACKUPS - GRACIE BARRA CIDADE NOVA
# ================================================================
# Data: 23/12/2025
# Execução: Diária via cron (09:00 UTC / 06:00 Brasília)
# Função: Verificar status dos backups e alertar problemas
# ================================================================

LOG_FILE="/var/log/backup-monitor.log"
BACKUP_MYSQL_DIR="/var/backups/gbcidadenova/mysql"
BACKUP_FILES_DIR="/var/backups/gbcidadenova/files"
ALERT_EMAIL="jonasbrito1a@gmail.com"
SEND_EMAIL=false  # Alterar para true quando configurar e-mail

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função de alerta
alert() {
    local message="$1"
    log "ALERTA: $message"

    if [ "$SEND_EMAIL" = true ]; then
        echo "$message" | mail -s "Alerta de Backup - Gracie Barra" "$ALERT_EMAIL"
    fi
}

# Início da verificação
log "========================================="
log "Verificação de Backups"
log "========================================="

# ================================================================
# 1. VERIFICAR BACKUP MYSQL (Diário)
# ================================================================
log ""
log "1. Verificando backups MySQL..."

if [ ! -d "$BACKUP_MYSQL_DIR" ]; then
    alert "CRÍTICO: Diretório de backups MySQL não existe!"
    exit 1
fi

# Backup mais recente
LATEST_MYSQL=$(ls -t "$BACKUP_MYSQL_DIR"/gbcidadenova_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_MYSQL" ]; then
    alert "CRÍTICO: Nenhum backup MySQL encontrado!"
else
    # Verificar idade do backup
    MYSQL_AGE=$(find "$LATEST_MYSQL" -mtime +1 -print)

    if [ -n "$MYSQL_AGE" ]; then
        alert "ATENÇÃO: Backup MySQL tem mais de 24 horas!"
        MODIFIED=$(stat -c %y "$LATEST_MYSQL" | cut -d' ' -f1,2 | cut -d'.' -f1)
        log "Último backup: $MODIFIED"
    else
        MYSQL_SIZE=$(du -h "$LATEST_MYSQL" | cut -f1)
        MYSQL_SIZE_BYTES=$(stat -c%s "$LATEST_MYSQL")
        MYSQL_DATE=$(stat -c %y "$LATEST_MYSQL" | cut -d' ' -f1,2 | cut -d'.' -f1)

        # Verificar se backup tem tamanho adequado (mínimo 1KB)
        if [ "$MYSQL_SIZE_BYTES" -lt 1024 ]; then
            alert "CRÍTICO: Backup MySQL muito pequeno ($MYSQL_SIZE) - pode estar corrompido!"
        else
            log "OK: Backup MySQL recente encontrado"
            log "Arquivo: $(basename $LATEST_MYSQL)"
            log "Data: $MYSQL_DATE"
            log "Tamanho: $MYSQL_SIZE ($MYSQL_SIZE_BYTES bytes)"
        fi
    fi
fi

# Contar backups MySQL
MYSQL_COUNT=$(ls "$BACKUP_MYSQL_DIR"/gbcidadenova_*.sql.gz 2>/dev/null | wc -l)
log "Total de backups MySQL: $MYSQL_COUNT"

# Espaço usado
MYSQL_SPACE=$(du -sh "$BACKUP_MYSQL_DIR" 2>/dev/null | cut -f1)
log "Espaço usado: $MYSQL_SPACE"

# ================================================================
# 2. VERIFICAR BACKUP DE ARQUIVOS (Semanal)
# ================================================================
log ""
log "2. Verificando backups de arquivos..."

if [ ! -d "$BACKUP_FILES_DIR" ]; then
    alert "CRÍTICO: Diretório de backups de arquivos não existe!"
    exit 1
fi

# Backup mais recente
LATEST_FILES=$(ls -t "$BACKUP_FILES_DIR"/gbcidadenova_files_*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_FILES" ]; then
    alert "CRÍTICO: Nenhum backup de arquivos encontrado!"
else
    # Verificar idade do backup (semanal - 8 dias como margem)
    FILES_AGE=$(find "$LATEST_FILES" -mtime +8 -print)

    if [ -n "$FILES_AGE" ]; then
        alert "ATENÇÃO: Backup de arquivos tem mais de 8 dias!"
        MODIFIED=$(stat -c %y "$LATEST_FILES" | cut -d' ' -f1,2 | cut -d'.' -f1)
        log "Último backup: $MODIFIED"
    else
        FILES_SIZE=$(du -h "$LATEST_FILES" | cut -f1)
        FILES_SIZE_BYTES=$(stat -c%s "$LATEST_FILES")
        FILES_DATE=$(stat -c %y "$LATEST_FILES" | cut -d' ' -f1,2 | cut -d'.' -f1)

        # Verificar se backup tem tamanho adequado (mínimo 1MB)
        if [ "$FILES_SIZE_BYTES" -lt 1048576 ]; then
            alert "CRÍTICO: Backup de arquivos muito pequeno ($FILES_SIZE) - pode estar corrompido!"
        else
            log "OK: Backup de arquivos recente encontrado"
            log "Arquivo: $(basename $LATEST_FILES)"
            log "Data: $FILES_DATE"
            log "Tamanho: $FILES_SIZE ($FILES_SIZE_BYTES bytes)"
        fi
    fi
fi

# Contar backups de arquivos
FILES_COUNT=$(ls "$BACKUP_FILES_DIR"/gbcidadenova_files_*.tar.gz 2>/dev/null | wc -l)
log "Total de backups de arquivos: $FILES_COUNT"

# Espaço usado
FILES_SPACE=$(du -sh "$BACKUP_FILES_DIR" 2>/dev/null | cut -f1)
log "Espaço usado: $FILES_SPACE"

# ================================================================
# 3. VERIFICAR LOGS DE BACKUP
# ================================================================
log ""
log "3. Verificando logs de execução..."

# Verificar log do MySQL
if [ -f "/var/log/backup-mysql.log" ]; then
    MYSQL_LOG_ERRORS=$(grep -i "erro\|error\|fail" /var/log/backup-mysql.log 2>/dev/null | tail -5)

    if [ -n "$MYSQL_LOG_ERRORS" ]; then
        log "ATENÇÃO: Erros encontrados no log do MySQL:"
        echo "$MYSQL_LOG_ERRORS" | while read line; do
            log "  $line"
        done
    else
        log "OK: Nenhum erro no log de backup MySQL"
    fi
fi

# Verificar log de arquivos
if [ -f "/var/log/backup-files.log" ]; then
    FILES_LOG_ERRORS=$(grep -i "erro\|error\|fail" /var/log/backup-files.log 2>/dev/null | tail -5)

    if [ -n "$FILES_LOG_ERRORS" ]; then
        log "ATENÇÃO: Erros encontrados no log de arquivos:"
        echo "$FILES_LOG_ERRORS" | while read line; do
            log "  $line"
        done
    else
        log "OK: Nenhum erro no log de backup de arquivos"
    fi
fi

# ================================================================
# 4. VERIFICAR INTEGRIDADE DOS BACKUPS
# ================================================================
log ""
log "4. Verificando integridade..."

# Testar integridade do backup MySQL mais recente
if [ -n "$LATEST_MYSQL" ]; then
    if gzip -t "$LATEST_MYSQL" 2>/dev/null; then
        log "OK: Backup MySQL íntegro (compressão válida)"
    else
        alert "CRÍTICO: Backup MySQL corrompido - compressão inválida!"
    fi
fi

# Testar integridade do backup de arquivos mais recente
if [ -n "$LATEST_FILES" ]; then
    if gzip -t "$LATEST_FILES" 2>/dev/null; then
        log "OK: Backup de arquivos íntegro (compressão válida)"
    else
        alert "CRÍTICO: Backup de arquivos corrompido - compressão inválida!"
    fi
fi

# ================================================================
# 5. VERIFICAR ESPAÇO DISPONÍVEL
# ================================================================
log ""
log "5. Verificando espaço em disco..."

BACKUP_PARTITION=$(df -h /var/backups 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
AVAILABLE_SPACE=$(df -h /var/backups 2>/dev/null | awk 'NR==2 {print $4}')

log "Uso do disco: ${BACKUP_PARTITION}%"
log "Espaço disponível: $AVAILABLE_SPACE"

if [ "$BACKUP_PARTITION" -gt 85 ]; then
    alert "ATENÇÃO: Partição de backups com ${BACKUP_PARTITION}% de uso!"
fi

# ================================================================
# 6. LISTAR TODOS OS BACKUPS
# ================================================================
log ""
log "6. Lista completa de backups:"
log ""
log "MySQL (7 dias retenção):"
ls -lht "$BACKUP_MYSQL_DIR"/*.gz 2>/dev/null | awk '{printf "  %s %s - %s\n", $6, $7, $9}' | tee -a "$LOG_FILE"

log ""
log "Arquivos (28 dias retenção):"
ls -lht "$BACKUP_FILES_DIR"/*.tar.gz 2>/dev/null | awk '{printf "  %s %s - %s\n", $6, $7, $9}' | tee -a "$LOG_FILE"

# ================================================================
# RESUMO FINAL
# ================================================================
log ""
log "========================================="
log "Verificação de backups concluída!"
log "========================================="
log ""

exit 0
