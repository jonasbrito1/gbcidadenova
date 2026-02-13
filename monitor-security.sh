#!/bin/bash

# ================================================================
# SCRIPT DE MONITORAMENTO DE SEGURANÇA - GRACIE BARRA CIDADE NOVA
# ================================================================
# Data: 23/12/2025
# Execução: A cada hora via cron
# Função: Verificar tentativas de acesso, serviços e alertas
# ================================================================

LOG_FILE="/var/log/security-monitor.log"
ALERT_EMAIL="jonasbrito1a@gmail.com"
ALERT_THRESHOLD_FAILED_SSH=5
DISK_THRESHOLD=80
SEND_EMAIL=false  # Alterar para true quando configurar e-mail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função de alerta
alert() {
    local message="$1"
    log "ALERTA: $message"

    if [ "$SEND_EMAIL" = true ]; then
        echo "$message" | mail -s "Alerta de Segurança - Gracie Barra" "$ALERT_EMAIL"
    fi
}

# Início do monitoramento
log "========================================="
log "Iniciando verificação de segurança..."
log "========================================="

# ================================================================
# 1. VERIFICAR TENTATIVAS DE LOGIN SSH FALHADAS
# ================================================================
log "1. Verificando tentativas de login SSH..."

FAILED_SSH=$(grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %d')" | wc -l)

if [ "$FAILED_SSH" -gt "$ALERT_THRESHOLD_FAILED_SSH" ]; then
    alert "CRÍTICO: $FAILED_SSH tentativas de login SSH falhadas hoje!"

    # Listar IPs que falharam
    FAILED_IPS=$(grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | grep -oP 'from \K[0-9.]+' | sort | uniq -c | sort -rn | head -5)
    log "Top 5 IPs com falhas:"
    echo "$FAILED_IPS" | while read count ip; do
        log "  - $ip: $count tentativas"
    done
else
    log "OK: $FAILED_SSH tentativas de login falhadas (limite: $ALERT_THRESHOLD_FAILED_SSH)"
fi

# ================================================================
# 2. VERIFICAR STATUS DO FAIL2BAN
# ================================================================
log ""
log "2. Verificando fail2ban..."

if systemctl is-active --quiet fail2ban; then
    BANNED_IPS=$(fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | grep -oP '\d+')
    log "OK: fail2ban está ativo"
    log "IPs banidos atualmente: ${BANNED_IPS:-0}"

    if [ "${BANNED_IPS:-0}" -gt 0 ]; then
        BANNED_LIST=$(fail2ban-client status sshd 2>/dev/null | grep "Banned IP list" | cut -d: -f2)
        log "Lista de IPs banidos:$BANNED_LIST"
    fi
else
    alert "CRÍTICO: fail2ban não está rodando!"
fi

# ================================================================
# 3. VERIFICAR USO DE DISCO
# ================================================================
log ""
log "3. Verificando uso de disco..."

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    alert "ATENÇÃO: Disco com ${DISK_USAGE}% de uso (limite: ${DISK_THRESHOLD}%)"
else
    log "OK: Uso de disco em ${DISK_USAGE}%"
fi

# Detalhes de uso
log "Uso de disco por partição:"
df -h | grep -E '^/dev/' | awk '{printf "  %s: %s usado de %s (%s)\n", $1, $3, $2, $5}' | tee -a "$LOG_FILE"

# ================================================================
# 4. VERIFICAR SERVIÇOS CRÍTICOS
# ================================================================
log ""
log "4. Verificando serviços críticos..."

# Lista de serviços críticos
SERVICES=("mariadb" "nginx" "fail2ban" "cron" "ufw")

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        log "OK: $service está rodando"
    else
        alert "CRÍTICO: $service não está rodando!"
    fi
done

# ================================================================
# 5. VERIFICAR FIREWALL (UFW)
# ================================================================
log ""
log "5. Verificando firewall..."

if ufw status | grep -q "Status: active"; then
    log "OK: Firewall UFW está ativo"

    # Contar regras
    RULE_COUNT=$(ufw status numbered | grep -c '\[')
    log "Regras ativas: $RULE_COUNT"
else
    alert "CRÍTICO: Firewall UFW não está ativo!"
fi

# ================================================================
# 6. VERIFICAR CONEXÕES ATIVAS
# ================================================================
log ""
log "6. Verificando conexões ativas..."

SSH_CONNECTIONS=$(netstat -tn 2>/dev/null | grep ':2222' | grep ESTABLISHED | wc -l)
log "Conexões SSH ativas: $SSH_CONNECTIONS"

# Listar conexões SSH ativas
if [ "$SSH_CONNECTIONS" -gt 0 ]; then
    netstat -tn 2>/dev/null | grep ':2222' | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq | while read ip; do
        log "  - Conexão de: $ip"
    done
fi

# ================================================================
# 7. VERIFICAR ATUALIZAÇÕES DE SEGURANÇA
# ================================================================
log ""
log "7. Verificando atualizações disponíveis..."

# Atualizar lista de pacotes (sem instalar)
apt-get update -qq 2>/dev/null

SECURITY_UPDATES=$(apt-get upgrade -s 2>/dev/null | grep -i security | wc -l)
TOTAL_UPDATES=$(apt-get upgrade -s 2>/dev/null | grep -c '^Inst')

if [ "$SECURITY_UPDATES" -gt 0 ]; then
    alert "ATENÇÃO: $SECURITY_UPDATES atualizações de segurança disponíveis (Total: $TOTAL_UPDATES)"
else
    log "OK: Sistema atualizado (Total de atualizações: $TOTAL_UPDATES)"
fi

# ================================================================
# 8. VERIFICAR PROCESSOS SUSPEITOS
# ================================================================
log ""
log "8. Verificando processos com alto uso de CPU..."

HIGH_CPU=$(ps aux | awk '{if($3>80) print $0}' | grep -v '%CPU')

if [ -n "$HIGH_CPU" ]; then
    log "ATENÇÃO: Processos com >80% CPU detectados:"
    echo "$HIGH_CPU" | while read line; do
        log "  $line"
    done
else
    log "OK: Nenhum processo com uso excessivo de CPU"
fi

# ================================================================
# 9. VERIFICAR MEMÓRIA
# ================================================================
log ""
log "9. Verificando uso de memória..."

MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')
log "Uso de memória: ${MEM_USAGE}%"

if [ "$MEM_USAGE" -gt 90 ]; then
    alert "ATENÇÃO: Uso de memória em ${MEM_USAGE}%"
fi

# ================================================================
# 10. VERIFICAR ÚLTIMAS MODIFICAÇÕES EM ARQUIVOS CRÍTICOS
# ================================================================
log ""
log "10. Verificando arquivos críticos..."

CRITICAL_FILES=(
    "/etc/ssh/sshd_config"
    "/etc/fail2ban/jail.local"
    "/etc/passwd"
    "/etc/shadow"
    "/etc/sudoers"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        MODIFIED=$(stat -c %y "$file" | cut -d' ' -f1,2 | cut -d'.' -f1)
        log "$file - Última modificação: $MODIFIED"
    fi
done

# ================================================================
# RESUMO FINAL
# ================================================================
log ""
log "========================================="
log "Verificação de segurança concluída!"
log "========================================="
log ""

exit 0
