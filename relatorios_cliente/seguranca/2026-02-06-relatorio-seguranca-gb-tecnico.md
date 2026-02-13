# Relatório de Segurança - Gracie Barra Cidade Nova

**Data:** 06/02/2026
**Sistema:** gbcidadenovaam.com.br
**Responsável técnico:** Jonas Pacheco
**Tipo:** Auditoria de Rotina

---

## Resumo Executivo

| Item | Status | Observação |
|------|--------|------------|
| Site Online | OK | HTTP 200 |
| API Funcionando | OK | Health check OK |
| Certificado SSL | OK | Válido até 04/05/2026 |
| Backups MySQL | OK | 8 backups (7 dias) |
| Backups Arquivos | OK | 5 backups (28 dias) |
| Firewall UFW | ATENÇÃO | Portas extras expostas |
| Fail2ban | OK | Ativo e funcionando |
| MariaDB | OK | Apenas localhost |
| Espaço em Disco | OK | 31% usado |
| Memória | OK | 29% usada |

**Nível de Risco Geral:** MÉDIO (Requer Atenções)

---

## 1. Status do Servidor

**Informações Gerais:**
- **Hostname:** srv1177046
- **IP:** 72.61.223.226
- **Sistema Operacional:** Ubuntu 24.04.3 LTS
- **Uptime:** 7 dias, 13 horas
- **Load Average:** 0.00, 0.00, 0.00 (Excelente)

**Recursos:**
```
Memória Total: 3.8 GB
Memória Usada: 1.1 GB (29%)
Memória Disponível: 2.7 GB
Swap: Não configurado
Disco: 31% usado (15GB de 48GB)
```

---

## 2. Análise de Portas e Serviços

### Portas em Escuta (Internas):

| Porta | Serviço | Bind | Status |
|-------|---------|------|--------|
| 80 | Nginx HTTP | 0.0.0.0 | OK - Público |
| 443 | Nginx HTTPS | 0.0.0.0 | OK - Público |
| 22 | SSH (padrão) | 0.0.0.0 | ATENÇÃO |
| 2222 | SSH (alternativo) | 0.0.0.0 | OK |
| 3306 | MariaDB | 127.0.0.1 | OK - Local |
| 4011 | API Node.js | 0.0.0.0 | ATENÇÃO |
| 3000 | Horizonte API | * | Outro projeto |
| 5000/5001 | Outros Node | * | Outros projetos |

### Firewall UFW:

**Status:** Ativo
**Política Padrão:** deny (incoming), allow (outgoing)

**Regras Configuradas (12 regras):**
```
80/tcp   - ALLOW (HTTP)
443/tcp  - ALLOW (HTTPS)
4011/tcp - ALLOW (API Gracie Barra)
2222/tcp - ALLOW (SSH alternativo)
22/tcp   - ALLOW (SSH padrão) ← PROBLEMA
```

---

## 3. Certificado SSL/TLS

**Status:** VÁLIDO

| Campo | Valor |
|-------|-------|
| Emissor | Let's Encrypt (E7) |
| Domínio | gbcidadenovaam.com.br |
| Válido Desde | 03/02/2026 |
| Válido Até | 04/05/2026 |
| Dias Restantes | ~87 dias |
| Renovação Automática | Sim (certbot) |

---

## 4. Sistema de Backups

### 4.1 Backups MySQL (Diários)

**Status:** FUNCIONANDO
**Retenção:** 7 dias
**Diretório:** /var/backups/gbcidadenova/mysql/
**Horário:** 00:00 UTC (21:00 Brasília)

**Backups Disponíveis:**
| Data | Arquivo | Tamanho | Status |
|------|---------|---------|--------|
| 06/02/2026 | gbcidadenova_20260206_000001.sql.gz | 775 KB | OK |
| 05/02/2026 | gbcidadenova_20260205_000001.sql.gz | 760 KB | OK |
| 04/02/2026 | gbcidadenova_20260204_000001.sql.gz | 740 KB | OK |
| 03/02/2026 | gbcidadenova_20260203_000002.sql.gz | 720 KB | OK |
| 02/02/2026 | gbcidadenova_20260202_000002.sql.gz | 706 KB | OK |
| 01/02/2026 | gbcidadenova_20260201_000003.sql.gz | 690 KB | OK |
| 31/01/2026 | gbcidadenova_20260131_000001.sql.gz | 675 KB | OK |
| 30/01/2026 | gbcidadenova_20260130_000001.sql.gz | 661 KB | OK |

**Espaço Total:** 5.7 MB
**Integridade:** Verificada (compressão válida)

### 4.2 Backups de Arquivos (Semanais)

**Status:** FUNCIONANDO
**Retenção:** 28 dias (4 semanas)
**Diretório:** /var/backups/gbcidadenova/files/
**Horário:** Domingos 01:00 UTC

**Backups Disponíveis:**
| Data | Arquivo | Tamanho |
|------|---------|---------|
| 01/02/2026 | gbcidadenova_files_20260201_010001.tar.gz | 447 MB |
| 25/01/2026 | gbcidadenova_files_20260125_010001.tar.gz | ~400 MB |
| 18/01/2026 | gbcidadenova_files_20260118_010001.tar.gz | ~400 MB |
| 11/01/2026 | gbcidadenova_files_20260111_010001.tar.gz | ~400 MB |
| 04/01/2026 | gbcidadenova_files_20260104_010001.tar.gz | ~400 MB |

**Espaço Total:** 2.0 GB

---

## 5. Sistema de Monitoramento

### 5.1 Crons Configurados

| Tarefa | Frequência | Horário | Status |
|--------|------------|---------|--------|
| Backup MySQL | Diário | 00:00 UTC | OK |
| Backup Arquivos | Semanal | Dom 01:00 UTC | OK |
| Monitor Segurança | 6 em 6 horas | */6 * * * | OK |
| Monitor Backups | Diário | 09:00 UTC | OK |

### 5.2 Fail2ban

**Status:** ATIVO

| Métrica | Valor |
|---------|-------|
| Jails Ativos | 1 (sshd) |
| Falhas Atuais | 0 |
| Total de Falhas (hoje) | 24 |
| IPs Banidos (atual) | 0 |
| Total Histórico Banidos | 8 |

### 5.3 Serviços Críticos

| Serviço | Status | Uptime |
|---------|--------|--------|
| nginx | Ativo | 2 dias |
| mariadb | Ativo | 2 dias |
| fail2ban | Ativo | 16 horas |
| ufw | Ativo | - |
| cron | Ativo | - |
| PM2 | Ativo | - |

---

## 6. Aplicação (PM2)

**Processos Gerenciados:**

| App | Status | CPU | Memória | Restarts | Uptime |
|-----|--------|-----|---------|----------|--------|
| gbcidadenova-api | online | 0% | 90.8 MB | 776 | 2 min |
| horizonte-api | online | 0% | 130.9 MB | 3 | 25h |

**ATENÇÃO:** A aplicação `gbcidadenova-api` apresenta 776 restarts, indicando instabilidade. A aplicação está reiniciando aproximadamente a cada 5 minutos.

---

## 7. Tentativas de Ataque Detectadas (Últimas 24h)

**Total de Tentativas:** 24 falhas de autenticação SSH

**IPs Atacantes Identificados:**
| IP | Origem Provável | Tentativas | Usuários Testados |
|----|-----------------|------------|-------------------|
| 188.166.1.101 | DigitalOcean | 6 | root |
| 188.166.43.8 | DigitalOcean | 4 | root, dspace |
| 165.232.81.241 | DigitalOcean | 4 | root, admin |
| 167.71.14.84 | DigitalOcean | 4 | admin, daemon |
| 64.227.65.15 | DigitalOcean | 2 | test1, oracle |

**Observação:** Ataques típicos de bots automatizados testando usuários comuns (root, admin, test, oracle).

---

## 8. Problemas Identificados

### 8.1 CRÍTICO - Configuração SSH Insegura

**Problema:** O arquivo `/etc/ssh/sshd_config` possui configurações que reduzem a segurança:

```
Port 22                    ← Porta padrão ainda ativa
Port 2222                  ← Porta alternativa OK
PasswordAuthentication yes ← PROBLEMA: Deveria ser 'no'
PermitRootLogin yes        ← PROBLEMA: Deveria ser 'prohibit-password' ou 'no'
PubkeyAuthentication yes   ← OK
```

**Risco:** Permite ataques de força bruta por senha e acesso root direto.

### 8.2 MÉDIO - Porta 22 Exposta no Firewall

**Problema:** O firewall permite conexões na porta 22 (SSH padrão), além da porta 2222.

**Impacto:** Duplica a superfície de ataque para SSH.

### 8.3 MÉDIO - Porta 4011 (API) Exposta Diretamente

**Problema:** A API Node.js na porta 4011 está acessível diretamente da internet (bind 0.0.0.0).

**Recomendação:** Configurar para escutar apenas em localhost (127.0.0.1) e acessar via proxy Nginx.

### 8.4 BAIXO - Atualizações Pendentes

**Total de Pacotes:** 36 atualizações disponíveis

**Pacotes Críticos:**
- `linux-headers-generic` (kernel)
- `linux-image-virtual` (kernel)
- `libmariadb3` (cliente MariaDB)
- `docker-ce` (Docker)
- `libldap2` (LDAP - segurança)

### 8.5 ATENÇÃO - Aplicação Instável

**Problema:** A aplicação gbcidadenova-api apresenta 776 restarts com uptime de apenas 2 minutos.

**Possíveis Causas:**
- Erro de código causando crash
- Limite de memória atingido
- Conexão com banco de dados falhando
- Watch mode reiniciando arquivos

---

## 9. Comparativo com Relatório Anterior (23/12/2025)

| Item | Dezembro 2025 | Fevereiro 2026 | Status |
|------|---------------|----------------|--------|
| Porta 22 (SSH) | BLOQUEADA | ABERTA | REGREDIU |
| Porta 2222 (SSH) | BLOQUEADA ext. | ABERTA | REGREDIU |
| Porta 3306 (MySQL) | BLOQUEADA | BLOQUEADA | OK |
| SSL/TLS | Válido | Válido | OK |
| Backups | Funcionando | Funcionando | OK |
| Fail2ban | Ativo | Ativo | OK |
| Password Auth SSH | Desabilitado | Habilitado | REGREDIU |

**Observação:** Algumas configurações de segurança implementadas em dezembro parecem ter sido revertidas.

---

## 10. Recomendações

### Prioridade ALTA (Executar Imediatamente):

1. **Corrigir configuração SSH:**
   ```bash
   # Editar /etc/ssh/sshd_config:
   PasswordAuthentication no
   PermitRootLogin prohibit-password
   # Remover ou comentar: Port 22

   # Reiniciar SSH:
   systemctl restart sshd
   ```

2. **Bloquear porta 22 no firewall:**
   ```bash
   ufw delete allow 22/tcp
   ufw delete allow OpenSSH
   ```

### Prioridade MÉDIA (Próximos 7 dias):

3. **Configurar API para localhost:**
   - Alterar bind da API para 127.0.0.1:4011
   - Garantir que Nginx faz proxy corretamente

4. **Aplicar atualizações de segurança:**
   ```bash
   apt update && apt upgrade -y
   ```

5. **Investigar restarts da aplicação:**
   - Verificar logs de erro do PM2
   - Verificar se está em watch mode
   - Verificar conexões com banco de dados

### Prioridade BAIXA (Próximos 30 dias):

6. **Adicionar mais jails ao fail2ban:**
   - nginx-http-auth
   - nginx-botsearch
   - nginx-badbots

7. **Configurar alertas por email** para:
   - Falhas de backup
   - Alto uso de disco (>80%)
   - Serviços caindo

---

## 11. Conclusão

O sistema **Gracie Barra Cidade Nova** está **parcialmente seguro**, porém apresenta **regressões de segurança** em comparação com o relatório de dezembro de 2025.

**Pontos Positivos:**
- Backups funcionando corretamente (MySQL diário + Arquivos semanal)
- Certificado SSL válido e renovando automaticamente
- Banco de dados protegido (apenas localhost)
- Fail2ban ativo bloqueando ataques
- Monitoramento automatizado funcionando
- Recursos do servidor em níveis saudáveis

**Pontos de Atenção:**
- Configurações SSH foram revertidas para estado inseguro
- Porta 22 exposta desnecessariamente
- Aplicação com muitos restarts (possível problema de código)
- 36 atualizações de sistema pendentes

**Status Atual:** REQUER ATENÇÃO IMEDIATA

**Próxima Revisão Recomendada:** 20/02/2026

---

**Elaborado por:** Jonas Pacheco
**Data:** 06/02/2026
**Horário da Verificação:** 22:51 UTC (19:51 Brasília)
