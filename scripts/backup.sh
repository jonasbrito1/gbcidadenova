
#!/bin/bash

# Configurações
DB_HOST="postgres"
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="gb_backup_${DATE}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Criar diretório se não existir
mkdir -p ${BACKUP_DIR}

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> ${LOG_FILE}
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Iniciando backup do banco de dados..."

# Fazer backup
pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} --no-password --clean --if-exists > ${BACKUP_DIR}/${BACKUP_FILE}

if [ $? -eq 0 ]; then
    log "Backup criado com sucesso: ${BACKUP_FILE}"
    
    # Compactar backup
    gzip ${BACKUP_DIR}/${BACKUP_FILE}
    log "Backup compactado: ${BACKUP_FILE}.gz"
    
    # Remover backups antigos (manter últimos 7 dias)
    find ${BACKUP_DIR} -name "gb_backup_*.sql.gz" -mtime +7 -delete
    log "Backups antigos removidos"
    
else
    log "ERRO: Falha ao criar backup"
    exit 1
fi

log "Backup concluído com sucesso"
