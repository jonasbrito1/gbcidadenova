# Guia de Deploy - Gracie Barra no Hostinger

## 📋 Pré-requisitos

- Conta Hostinger com Node.js habilitado
- Acesso SSH ao servidor
- Acesso ao phpMyAdmin do Hostinger
- Git instalado no servidor

## 🗄️ Parte 1: Configuração do Banco de Dados

### 1.1 Acessar o phpMyAdmin

1. Faça login no painel da Hostinger
2. Acesse: Websites > Manage > Banco de Dados > phpMyAdmin
3. Selecione o banco: `u674882802_gb`

### 1.2 Importar Tabelas

1. Clique na aba "SQL" no phpMyAdmin
2. Copie todo o conteúdo do arquivo `database/hostinger_migration.sql`
3. Cole na área de texto e clique em "Executar"
4. Aguarde a confirmação de sucesso

### 1.3 Verificar Tabelas Criadas

Execute no SQL:
```sql
SHOW TABLES;
```

Você deve ver todas as 37 tabelas listadas.

### 1.4 Criar Usuário Admin Inicial

Execute no SQL:
```sql
INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo)
VALUES (
  'Administrador',
  'admin@graciebarra.com',
  '$2a$10$rZJKx8uQs6FKz0zCWKp4QeYcP/fwN3p2qHQrZvz7eZrF.nK8FE/2m',
  'admin',
  1
);
```
> Senha padrão: `admin123` (ALTERAR após primeiro login!)

## 🚀 Parte 2: Deploy do Backend (Node.js)

### 2.1 Conectar via SSH

```bash
ssh u674882802@seu-servidor.hostinger.com
```

### 2.2 Clonar o Repositório

```bash
cd domains/seudominio.com.br/public_html
git clone https://github.com/jonasbrito1/gbcidadenova.git
cd gbcidadenova
```

### 2.3 Configurar Backend

```bash
cd server

# Copiar arquivo de produção
cp .env.production .env

# Editar variáveis de ambiente
nano .env
```

**Editar as seguintes variáveis:**

```env
# Senha do banco de dados
DB_PASSWORD=SUA_SENHA_BANCO_AQUI

# Gerar JWT_SECRET (executar localmente):
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=COLAR_RESULTADO_AQUI

# Gerar ENCRYPTION_KEY:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=COLAR_RESULTADO_AQUI

# Gerar SESSION_SECRET:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=COLAR_RESULTADO_AQUI

# Configurar domínio
ALLOWED_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br

# Email (se configurado)
SMTP_USER=seu-email@seudominio.com.br
SMTP_PASS=SUA_SENHA_EMAIL
EMAIL_FROM=seu-email@seudominio.com.br
```

### 2.4 Instalar Dependências

```bash
npm install --production
```

### 2.5 Configurar PM2 (Gerenciador de Processos)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação
pm2 start index.js --name "gracie-barra-api"

# Configurar para iniciar automaticamente
pm2 startup
pm2 save
```

### 2.6 Verificar Status

```bash
pm2 status
pm2 logs gracie-barra-api
```

## 🎨 Parte 3: Deploy do Frontend (React)

### 3.1 Configurar Frontend

```bash
cd ../client

# Copiar arquivo de produção
cp .env.production .env

# Editar variáveis
nano .env
```

**Editar:**
```env
REACT_APP_API_URL=https://seudominio.com.br/api
```

### 3.2 Build de Produção

```bash
npm install
npm run build
```

### 3.3 Configurar Servidor Web

Criar arquivo `.htaccess` na pasta `build`:

```bash
cd build
nano .htaccess
```

Conteúdo do `.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar CORS
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# Comprimir arquivos
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache de arquivos estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### 3.4 Mover Build para Pasta Pública

```bash
# Voltar para raiz do projeto
cd ../../

# Criar pasta para frontend
mkdir -p ../public_html

# Copiar arquivos do build
cp -r client/build/* ../public_html/
```

## 🔧 Parte 4: Configuração do Proxy Reverso

Criar arquivo `.htaccess` na raiz do `public_html`:

```apache
RewriteEngine On

# Proxy para API
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Servir arquivos estáticos do React
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

## ✅ Parte 5: Verificação e Testes

### 5.1 Testar API

```bash
curl https://seudominio.com.br/api/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2025-...",
  "version": "2.0.0"
}
```

### 5.2 Testar Login

1. Acessar: `https://seudominio.com.br/login`
2. Login: `admin@graciebarra.com`
3. Senha: `admin123`

### 5.3 Testar Formulário Público

Acessar: `https://seudominio.com.br/formulario`

## 🔒 Parte 6: Segurança Pós-Deploy

### 6.1 Alterar Senha do Admin

1. Fazer login como admin
2. Ir em Perfil > Alterar Senha
3. Definir senha forte

### 6.2 Configurar SSL/HTTPS

No painel Hostinger:
1. Websites > Manage > SSL
2. Ativar certificado SSL gratuito

### 6.3 Configurar Firewall

```bash
# Permitir apenas portas necessárias
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

## 📊 Parte 7: Monitoramento

### 7.1 Ver Logs do Backend

```bash
pm2 logs gracie-barra-api
pm2 logs gracie-barra-api --lines 100
```

### 7.2 Monitorar Performance

```bash
pm2 monit
```

### 7.3 Reiniciar Aplicação

```bash
pm2 restart gracie-barra-api
```

## 🔄 Parte 8: Atualização do Sistema

```bash
cd domains/seudominio.com.br/gbcidadenova

# Puxar atualizações
git pull origin master

# Backend
cd server
npm install --production
pm2 restart gracie-barra-api

# Frontend
cd ../client
npm install
npm run build
cp -r build/* ../../public_html/
```

## 📝 Checklist Final

- [ ] Banco de dados configurado e testado
- [ ] Tabelas importadas com sucesso
- [ ] Usuário admin criado
- [ ] Backend rodando no PM2
- [ ] Frontend compilado e servido
- [ ] SSL/HTTPS ativado
- [ ] Proxy reverso configurado
- [ ] API acessível via HTTPS
- [ ] Login funcionando
- [ ] Formulário público acessível
- [ ] Senha do admin alterada
- [ ] Logs verificados

## 🆘 Troubleshooting

### Erro de Conexão com Banco

Verificar:
```bash
# Testar conexão
mysql -h 127.0.0.1 -u u674882802_jonasgb -p u674882802_gb
```

### API não responde

```bash
# Verificar se está rodando
pm2 status

# Ver logs
pm2 logs gracie-barra-api --lines 50

# Reiniciar
pm2 restart gracie-barra-api
```

### Frontend mostra página em branco

1. Verificar console do navegador (F12)
2. Verificar se `REACT_APP_API_URL` está correto
3. Limpar cache do navegador

## 📞 Suporte

Para problemas técnicos:
- Verificar logs: `pm2 logs`
- Verificar status: `pm2 status`
- Consultar documentação Hostinger

---

**Desenvolvido com Claude Code** 🤖
https://claude.com/claude-code
