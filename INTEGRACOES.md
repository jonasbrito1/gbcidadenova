# 🔐 Guia de Integração - Gracie Barra Sistema V2

## 📋 Índice
1. [Google OAuth 2.0](#google-oauth-20)
2. [Mercado Pago](#mercado-pago)
3. [Infinite Pay](#infinite-pay)
4. [Configuração do Banco de Dados](#banco-de-dados)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Testes](#testes)

---

## 🔐 Google OAuth 2.0

### Passo 1: Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com
2. Crie um novo projeto chamado "Gracie Barra Sistema"
3. Ative a **Google+ API** ou **People API**

### Passo 2: Configurar OAuth Consent Screen

1. No menu lateral, vá em **APIs e Serviços → Tela de permissão OAuth**
2. Escolha **Externo** (para permitir qualquer conta Google)
3. Preencha:
   - Nome do app: `Gracie Barra Sistema`
   - Email de suporte: seu email
   - Domínio autorizado: `localhost` (dev) ou `seudominio.com` (prod)
   - Email de contato do desenvolvedor: seu email
4. Adicione escopos:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Salve e continue

### Passo 3: Criar Credenciais OAuth

1. Vá em **Credenciais → Criar Credenciais → ID do cliente OAuth 2.0**
2. Tipo de aplicativo: **Aplicativo da Web**
3. Nome: `Gracie Barra Web Client`
4. **Origens JavaScript autorizadas:**
   ```
   http://localhost:3010
   http://localhost:3011
   https://seudominio.com
   ```
5. **URIs de redirecionamento autorizados:**
   ```
   http://localhost:3011/api/auth/google/callback
   https://seudominio.com/api/auth/google/callback
   ```
6. Clique em **Criar**
7. **Copie o Client ID e Client Secret**

### Passo 4: Configurar no Sistema

**Backend (.env):**
```env
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_CALLBACK_URL=http://localhost:3011/api/auth/google/callback
```

**Frontend (.env):**
```env
REACT_APP_GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
```

### Passo 5: Testar Integração

1. Inicie o backend: `cd server && npm run dev`
2. Inicie o frontend: `cd client && npm start`
3. Acesse: http://localhost:3010/login
4. Clique em "Entrar com Google"
5. Autorize o acesso
6. Você deve ser redirecionado para o dashboard

---

## 💳 Mercado Pago

### Passo 1: Criar Conta Mercado Pago

1. Acesse: https://www.mercadopago.com.br
2. Crie uma conta de vendedor
3. Complete o cadastro e verifique sua identidade

### Passo 2: Obter Credenciais

1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em **Suas integrações → Criar aplicação**
3. Preencha:
   - Nome: `Gracie Barra Sistema`
   - Produto: Pagamentos online
4. Copie as credenciais:
   - **Public Key** (pk_test_... para teste)
   - **Access Token** (TEST-... para teste)

### Passo 3: Configurar Webhook

1. No painel de desenvolvedor, vá em **Webhooks**
2. Configure a URL:
   ```
   https://seudominio.com/api/gateway/mercadopago/webhook
   ```
3. Eventos para notificar:
   - `payment`
   - `merchant_order`
4. Salve o **Webhook Secret**

### Passo 4: Configurar no Sistema

**Backend (.env):**
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-seu_token_aqui
MERCADOPAGO_PUBLIC_KEY=TEST-sua_public_key_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret
MERCADOPAGO_ENVIRONMENT=sandbox
```

### Passo 5: Testar Pagamento

**Cartões de Teste:**
```
Aprovado: 5031 4332 1540 6351
CVV: 123
Vencimento: 11/25
Nome: APRO

Rejeitado: 5031 4332 1540 6351
Nome: OTHE
```

**PIX de Teste:**
- Qualquer valor funciona em sandbox
- QR Code gerado automaticamente

---

## 💰 Infinite Pay

### Passo 1: Criar Conta Infinite Pay

1. Acesse: https://www.infinitepay.io
2. Solicite acesso para desenvolvedores
3. Complete o cadastro

### Passo 2: Obter Credenciais

1. Acesse o dashboard de desenvolvedor
2. Copie sua **API Key**
3. Configure ambiente: `sandbox` ou `production`

### Passo 3: Configurar no Sistema

**Backend (.env):**
```env
INFINITEPAY_API_KEY=sua_api_key_aqui
INFINITEPAY_ENVIRONMENT=sandbox
```

---

## 🗄️ Banco de Dados

### Tabelas Criadas

#### `usuarios`
- Adicionado: `google_id`, `foto_url`, `provedor_auth`
- `senha` agora é NULL (para usuários Google)

#### `assinaturas`
```sql
CREATE TABLE assinaturas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  plano_id INT NOT NULL,
  status ENUM('ativa', 'cancelada', 'suspensa', 'expirada'),
  data_inicio DATE NOT NULL,
  data_fim DATE NULL,
  data_proxima_cobranca DATE NULL,
  valor_mensal DECIMAL(10,2) NOT NULL,
  gateway_assinatura_id VARCHAR(255),
  ...
);
```

#### `transacoes_gateway`
```sql
CREATE TABLE transacoes_gateway (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  metodo_pagamento VARCHAR(50),
  dados_pagamento JSON,
  webhook_payload JSON,
  ...
);
```

#### `configuracoes_gateway`
```sql
CREATE TABLE configuracoes_gateway (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gateway VARCHAR(50) NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT TRUE,
  public_key TEXT,
  access_token TEXT,
  webhook_secret TEXT,
  ambiente ENUM('sandbox', 'production'),
  ...
);
```

### Executar Migrações

```bash
docker exec gb_mysql_modern mysql -u gb_user -pgb_password_2024 gracie_barra_db < database/migrations/add_google_oauth.sql
```

---

## ⚙️ Variáveis de Ambiente

### Backend (.env)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DB_HOST=localhost
DB_PORT=3309
DB_USER=gb_user
DB_PASSWORD=gb_password_2024
DB_NAME=gracie_barra_db

# JWT
JWT_SECRET=sua_chave_secreta_jwt_muito_segura_aqui
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3011/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3010

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=TEST-seu_token
MERCADOPAGO_PUBLIC_KEY=TEST-sua_public_key
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret
MERCADOPAGO_ENVIRONMENT=sandbox

# Infinite Pay
INFINITEPAY_API_KEY=sua_api_key
INFINITEPAY_ENVIRONMENT=sandbox

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:3011
REACT_APP_GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
REACT_APP_MERCADOPAGO_PUBLIC_KEY=TEST-sua_public_key
```

---

## 🧪 Testes

### 1. Testar Google OAuth

**Login:**
```bash
# Abrir navegador
http://localhost:3010/login

# Clicar em "Entrar com Google"
# Autorizar acesso
# Verificar redirecionamento para dashboard
```

**Cadastro via Checkout:**
```bash
# Selecionar plano
http://localhost:3010/#planos

# Preencher pagamento
# Clicar em "Cadastrar com Google"
# Verificar criação de conta e assinatura
```

### 2. Testar Mercado Pago

**Criar PIX:**
```bash
curl -X POST http://localhost:3011/api/gateway/mercadopago/create-pix \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 140,
    "planId": 1,
    "planName": "Plano Mensal"
  }'
```

**Simular Webhook:**
```bash
curl -X POST http://localhost:3011/api/gateway/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    },
    "action": "payment.created"
  }'
```

### 3. Verificar Assinaturas

```bash
# Listar assinaturas do usuário
curl -X GET http://localhost:3011/api/gateway/subscriptions \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## 📝 Fluxo Completo de Cadastro/Pagamento

### Cenário 1: Novo Usuário com Google

1. Usuário acessa landing page
2. Seleciona um plano
3. É redirecionado para `/checkout`
4. Preenche dados de pagamento (cartão ou PIX)
5. Clica em "Continuar"
6. Na etapa 2, clica em "Cadastrar com Google"
7. Autoriza acesso ao Google
8. Sistema:
   - Cria usuário com `google_id`
   - Processa pagamento via Mercado Pago
   - Cria assinatura ativa
   - Redireciona para dashboard

### Cenário 2: Usuário Existente (Email/Senha)

1. Usuário faz login normalmente em `/login`
2. Acessa área do aluno
3. Pode vincular conta Google depois (se desejar)

### Cenário 3: Usuário Vincula Google Depois

1. Usuário criado com email/senha
2. Faz login com Google pela primeira vez
3. Sistema detecta mesmo email
4. Vincula `google_id` ao usuário existente
5. Próximas vezes pode usar qualquer método

---

## 🔒 Segurança

### Checklist de Segurança

- ✅ JWT com expiração configurável
- ✅ Senhas hasheadas com bcrypt (12 rounds)
- ✅ Rate limiting nas rotas
- ✅ CORS configurado
- ✅ Helmet para headers de segurança
- ✅ Validação de inputs (express-validator)
- ✅ Proteção contra SQL Injection (prepared statements)
- ✅ HTTPS obrigatório em produção
- ✅ Webhooks com secret validation
- ✅ Logs de todas as transações

### Produção

**Checklist antes de ir para produção:**

1. ✅ Alterar `NODE_ENV` para `production`
2. ✅ Usar credenciais de produção (não TEST-)
3. ✅ Configurar SSL/TLS (HTTPS)
4. ✅ Configurar domínio real nos callbacks
5. ✅ Atualizar URLs no Google Cloud Console
6. ✅ Configurar webhook com HTTPS
7. ✅ Backup automático do banco de dados
8. ✅ Monitoramento de erros (Sentry, etc)
9. ✅ Logs em arquivo/serviço externo

---

## 📞 Suporte

**Problemas com Google OAuth:**
- Verificar se Client ID está correto em ambos .env
- Conferir URLs autorizadas no Google Cloud Console
- Verificar se APIs estão ativas

**Problemas com Mercado Pago:**
- Verificar credenciais (TEST- para sandbox)
- Conferir se webhook está configurado
- Ver logs em `transacoes_gateway` e `webhooks_financeiros`

**Problemas gerais:**
- Verificar logs do servidor: `docker logs gb_backend_modern`
- Verificar banco de dados
- Testar conexões com `curl`

---

## 🚀 Próximos Passos

1. Implementar renovação automática de assinaturas
2. Adicionar notificações por email
3. Dashboard financeiro completo
4. Relatórios de faturamento
5. Integração com mais gateways (PagSeguro, etc)
6. Sistema de cupons de desconto
7. Programa de fidelidade
8. App mobile

---

**Desenvolvido com ❤️ para Gracie Barra Cidade Nova**
