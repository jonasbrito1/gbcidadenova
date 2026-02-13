Relatório Mensal de Segurança - Gracie Barra Cidade Nova
Data: 06/02/2026
Horário da Análise: 19:51 (Horário de Brasília)
Feito por: Jonas Pacheco
_Completo_

---

1. VISÃO GERAL

O sistema passou por verificação completa de segurança, backups e monitoramento. Este relatório apresenta o estado atual e as ações necessárias.

Status Geral:
* Site e Sistema: Funcionando normalmente
* Segurança: Requer alguns ajustes
* Backups: Funcionando corretamente
* Proteção contra Ataques: Ativa

---

2. STATUS DO SERVIDOR

O servidor está funcionando de forma estável.

Informações:
* Tempo online sem interrupções: 7 dias e 13 horas
* Localização: Hostinger VPS
* Sistema Operacional: Ubuntu 24.04 LTS (versão atual)

Uso de Recursos:
* Armazenamento: 15 GB de 48 GB (31%) - Saudável
* Memória RAM: 1.1 GB de 3.8 GB (29%) - Saudável
* Processamento: Baixo - Saudável

O servidor possui recursos suficientes para operação atual e crescimento futuro.

---

3. DISPONIBILIDADE DO SISTEMA

Site Principal (gbcidadenovaam.com.br):
* Status: Online e acessível
* Tempo de resposta: Normal

Sistema Administrativo (API):
* Status: Online e funcionando
* Verificação de saúde: Aprovada

Observação: Foi identificado que o sistema está reiniciando automaticamente com frequência. Isso não afeta o uso pelos usuários, mas será investigado.

---

4. CERTIFICADO DE SEGURANÇA (HTTPS)

O certificado garante que todas as informações trocadas são criptografadas e protegidas.

* Emissor: Let's Encrypt (Autoridade reconhecida mundialmente)
* Status: Válido
* Data de Emissão: 03/02/2026
* Data de Expiração: 04/05/2026
* Dias Restantes: Aproximadamente 87 dias
* Renovação: Automática (não requer ação manual)

O cadeado de segurança está visível no navegador, indicando conexão segura.

---

5. SISTEMA DE BACKUPS

Os backups são cópias de segurança que permitem recuperar o sistema em caso de problemas.

5.1 Backup do Banco de Dados

* Frequência: Diário (todos os dias)
* Horário: 21:00 (Horário de Brasília)
* Retenção: Últimos 7 dias
* Status: Funcionando corretamente

Backups Disponíveis:
* 06/02/2026 - 775 KB - Íntegro
* 05/02/2026 - 760 KB - Íntegro
* 04/02/2026 - 740 KB - Íntegro
* 03/02/2026 - 720 KB - Íntegro
* 02/02/2026 - 706 KB - Íntegro
* 01/02/2026 - 690 KB - Íntegro
* 31/01/2026 - 675 KB - Íntegro
* 30/01/2026 - 661 KB - Íntegro

5.2 Backup de Arquivos (Documentos, Fotos, Uploads)

* Frequência: Semanal (todo domingo)
* Horário: 22:00 de sábado (Horário de Brasília)
* Retenção: Últimas 4 semanas
* Status: Funcionando corretamente

Backups Disponíveis:
* 01/02/2026 - 447 MB - Íntegro
* 25/01/2026 - ~400 MB - Íntegro
* 18/01/2026 - ~400 MB - Íntegro
* 11/01/2026 - ~400 MB - Íntegro
* 04/01/2026 - ~400 MB - Íntegro

5.3 Verificação Automática

O sistema verifica automaticamente todos os dias às 06:00 se os backups foram criados corretamente.

Última verificação: 06/02/2026 às 06:00 - Todos os backups OK

---

6. PROTEÇÃO CONTRA ATAQUES

6.1 Firewall (Barreira de Proteção)

O firewall bloqueia acessos não autorizados ao servidor.

* Status: Ativo e funcionando
* Regras configuradas: 12 regras de proteção
* Política: Bloqueia tudo por padrão, libera apenas o necessário

Acessos Permitidos:
* Navegação no site (portas 80 e 443)
* Sistema administrativo (porta específica)
* Acesso de manutenção técnica (porta específica)

6.2 Sistema Anti-Invasão (Fail2ban)

Este sistema detecta tentativas de invasão e bloqueia automaticamente os atacantes.

* Status: Ativo e funcionando

Estatísticas das Últimas 24 Horas:
* Tentativas de acesso bloqueadas: 24
* Endereços (IPs) banidos hoje: 0 (já estavam na lista)
* Total de endereços banidos (histórico): 8

Origem das Tentativas de Ataque:
As tentativas vieram de servidores automatizados (bots) que varrem a internet procurando sistemas vulneráveis. Todas foram bloqueadas com sucesso.

* Servidores DigitalOcean (EUA): 20 tentativas - Bloqueado
* Outros: 4 tentativas - Bloqueado

6.3 Proteção do Banco de Dados

O banco de dados está protegido:
* Acesso externo: Bloqueado (não é possível acessar pela internet)
* Acesso permitido: Apenas o próprio sistema internamente

---

7. MONITORAMENTO AUTOMÁTICO

O sistema possui verificações automáticas:

* Segurança geral: A cada 6 horas - Última: 06/02 às 18:00 - OK
* Integridade dos backups: Diária - Última: 06/02 às 06:00 - OK
* Serviços do sistema: A cada 6 horas - Última: 06/02 às 18:00 - OK
* Espaço em disco: A cada 6 horas - Última: 06/02 às 18:00 - OK

---

8. PONTOS DE ATENÇÃO IDENTIFICADOS

8.1 Configurações de Acesso ao Servidor
Algumas configurações de segurança para acesso técnico precisam ser reforçadas. Isso não afeta o uso normal do sistema.
Ação: Será corrigido nos próximos dias.

8.2 Atualizações de Sistema
Existem 36 atualizações disponíveis, incluindo atualizações de segurança.
Ação: Serão aplicadas em janela de manutenção programada.

8.3 Estabilidade da Aplicação
O sistema está reiniciando automaticamente com mais frequência que o normal. Os usuários não são afetados.
Ação: Em investigação para identificar a causa.

---

9. PRÓXIMAS AÇÕES

* Reforçar configurações de acesso - Prazo: 7 dias
* Aplicar atualizações de sistema - Prazo: 7 dias
* Investigar reinícios da aplicação - Prazo: 7 dias
* Próxima verificação completa - Março/2026

---

10. CONCLUSÃO

O sistema Gracie Barra Cidade Nova está operacional e protegido. Os backups estão funcionando corretamente, garantindo que os dados podem ser recuperados se necessário. A proteção contra ataques está ativa e bloqueando tentativas de acesso não autorizado.

Foram identificados alguns pontos de melhoria que serão tratados nos próximos dias.

Nenhuma ação é necessária da sua parte.

---

Próximo Relatório: Março de 2026
