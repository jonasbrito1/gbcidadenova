# Relatório de Segurança - Gracie Barra Cidade Nova

**Data:** 23/12/2025
**Sistema:** gbcidadenovaam.com.br
**Responsável técnico:** Jonas Pacheco

---

## Comparativo de Segurança - Antes vs Depois

### ANTES das Melhorias (Feito análise - Scan Inicial)

**Portas Expostas Publicamente:**
- Porta 22 (SSH)      - EXPOSTA (Risco de ataques)
- Porta 3306 (MySQL)  - EXPOSTA (Banco de dados acessível externamente)
- Porta 4011 (API)    - EXPOSTA (API sem proteção adequada)
- Porta 80 (HTTP)     - OK
- Porta 443 (HTTPS)   - OK

**Principais Vulnerabilidades Identificadas:**
- Banco de dados MySQL acessível pela internet
- SSH na porta padrão (alvo de ataques automatizados)
- Autenticação SSH por senha habilitada
- Sem firewall configurado
- Sem sistema de backup automatizado
- Logs não monitorados

**Nível de Risco:** CRÍTICO

---

### DEPOIS das Melhorias (Scan Atual - 23/12/2025)

**Portas Expostas Publicamente:**
- Porta 80 (HTTP)     - ABERTA (redireciona para HTTPS)
- Porta 443 (HTTPS)   - ABERTA (SSL/TLS válido - Let's Encrypt)
- Porta 22 (SSH)      - BLOQUEADA
- Porta 2222 (SSH)    - BLOQUEADA externamente (firewall)
- Porta 3306 (MySQL)  - BLOQUEADA
- Porta 4011 (API)    - BLOQUEADA (apenas localhost)

**Melhorias Implementadas:**

**Firewall UFW Ativo:** Bloqueando todas as portas não essenciais

**SSH Hardening Completo:**
- Porta alterada para 2222 (não padrão)
- Autenticação por chave SSH (ED25519)
- Login root por senha desabilitado
- Acesso SSH bloqueado externamente via firewall

**Banco de Dados Protegido:**
- MySQL acessível apenas localmente (127.0.0.1)
- Porta 3306 bloqueada externamente

**SSL/TLS Configurado:**
- Certificado Let's Encrypt válido
- HTTPS funcionando corretamente
- Redirecionamento automático HTTP → HTTPS

**Sistema de Backup Automatizado:**
- Backups diários do banco de dados
- Retenção de 7 dias
- Armazenamento seguro em /backups

**Nível de Risco:** BAIXO (Seguro)

---

## Resultados do Scan de Segurança (Nmap)

### Análise Técnica:

**Serviços Expostos:**
- 80/tcp - HTTP → Nginx 1.24.0 (redireciona para HTTPS)
- 443/tcp - HTTPS → Nginx 1.24.0 + SSL/TLS válido

**OBS.:** É comum estas portas estarem abertas pois são as portas de navegação web do sistema.

**Certificado SSL:**
- Emissor: Let's Encrypt
- Válido até: 04/03/2026
- Algoritmo: ECDSA com SHA-384 (seguro)
- Domínios cobertos: gbcidadenovaam.com.br, www.gbcidadenovaam.com.br

**Firewall:**
- 998 de 1000 portas filtradas (bloqueadas)
- Apenas portas essenciais (80, 443) abertas
- Sistema operacional não identificável (boa proteção)

---

## Medidas de Segurança Ativas

### 1. Proteção de Acesso
- SSH acessível apenas por chave criptográfica
- Firewall bloqueando acessos não autorizados
- Porta SSH não padrão (reduz 99% dos ataques automatizados)

### 2. Proteção de Dados
- Banco de dados inacessível externamente
- Conexão HTTPS obrigatória (dados criptografados)
- Backups diários automatizados

### 3. Monitoramento
- Logs de acesso e erros ativos
- Sistema de saúde monitorando aplicação 24/7
- Alertas configurados para falhas

---

## Recomendações de Segurança Contínua

### 1. Atualizar Nginx regularmente
- Versão atual: 1.24.0 (Ubuntu) - OK
- Recomendação: Verificar atualizações mensalmente

### 2. Revisar Backups Mensalmente
- Garantir que backups estão sendo criados corretamente

### 3. Atualizar Certificado SSL Automaticamente
- Let's Encrypt renova automaticamente (monitorar)

### 4. Revisar Logs de Acesso
- Verificar tentativas de acesso suspeitas

---

## Conclusão

O sistema **Gracie Barra Cidade Nova** passou de um nível de risco **CRÍTICO** para **BAIXO (Seguro)** após a implementação das melhorias de segurança.

**Principais Conquistas:**
- Banco de dados 100% protegido contra acesso externo
- SSH configurado com as melhores práticas de segurança
- Firewall ativo bloqueando acessos não autorizados
- SSL/TLS válido garantindo comunicação criptografada
- Sistema de backup automatizado protegendo os dados

**Status Atual:** SISTEMA SEGURO E PROTEGIDO

**Próxima Revisão:** 20/01/2026

---

**Elaborado por:** Jonas Pacheco
**Data:** 23/12/2025
