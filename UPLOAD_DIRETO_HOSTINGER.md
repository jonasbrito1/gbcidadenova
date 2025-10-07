# 📤 Upload Direto para Hostinger - Gracie Barra

## 🎯 Estrutura de Pastas no Hostinger

```
domains/seudominio.com.br/
├── public_html/           ← Frontend (arquivos React compilados)
│   ├── index.html
│   ├── static/
│   └── ...
└── api/                   ← Backend (Node.js)
    ├── server/
    │   ├── src/
    │   ├── uploads/
    │   ├── package.json
    │   ├── index.js
    │   └── .env
    └── node_modules/
```

## 📦 PARTE 1: Preparar Arquivos Localmente

### 1.1 Build do Frontend

No seu computador local:

```bash
cd c:/Users/Home/Desktop/Projects/graciebarra_sistemaV2/client

# Criar arquivo .env de produção
# Copiar .env.production para .env e editar:
notepad .env
```

Conteúdo do `.env`:
```env
REACT_APP_API_URL=https://seudominio.com.br/api
```

```bash
# Instalar dependências e fazer build
npm install
npm run build
```

Isso vai gerar a pasta `build/` com os arquivos do frontend compilados.

### 1.2 Preparar Backend

```bash
cd ../server

# Criar .env de produção
notepad .env
```

Conteúdo do `.env`:
```env
NODE_ENV=production
PORT=3000

# Banco de dados Hostinger
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=u674882802_jonasgb
DB_PASSWORD=SUA_SENHA_BANCO_AQUI
DB_NAME=u674882802_gb

# Gerar secrets (executar no terminal Node.js):
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=COLAR_RESULTADO_AQUI

# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=COLAR_RESULTADO_AQUI
SESSION_SECRET=COLAR_RESULTADO_AQUI

# CORS
ALLOWED_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br
```

## 📂 PARTE 2: Arquivos para Upload

### 2.1 FRONTEND (Upload para `public_html/`)

**Fazer upload de TODA a pasta `client/build/` para `public_html/`**

Arquivos que devem estar em `public_html/`:
```
public_html/
├── index.html
├── favicon.ico
├── manifest.json
├── robots.txt
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── .htaccess (criar este arquivo)
```

**IMPORTANTE: Criar arquivo `.htaccess` em `public_html/`:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Redirecionar chamadas da API para o backend
  RewriteCond %{REQUEST_URI} ^/api/
  RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

  # React Router - SPA
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# CORS Headers
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# Compressão
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache
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

### 2.2 BACKEND (Upload para `api/` ou `nodejs/`)

**Estrutura de pastas para upload:**

```
Criar pasta: api/ (ou nodejs/)

Fazer upload dos seguintes arquivos/pastas do server/:
```

#### ✅ Arquivos OBRIGATÓRIOS:

```
api/
├── index.js                    ← OBRIGATÓRIO
├── package.json                ← OBRIGATÓRIO
├── .env                        ← OBRIGATÓRIO (criar com suas senhas)
├── src/                        ← PASTA COMPLETA
│   ├── config/
│   │   ├── database.js
│   │   └── passport.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── plans.js
│   │   ├── formularios.js
│   │   ├── students.js
│   │   ├── professores.js
│   │   ├── turmas.js
│   │   ├── users.js
│   │   ├── dashboard.js
│   │   ├── frequencia.js
│   │   ├── financeiro.js
│   │   ├── attendance.js
│   │   ├── payments.js
│   │   ├── reports.js
│   │   ├── gateway.js
│   │   └── teachers.js
│   └── utils/
│       └── logger.js
├── uploads/                    ← CRIAR PASTA VAZIA (permissões 755)
│   └── .gitkeep
└── logs/                       ← CRIAR PASTA VAZIA (permissões 755)
    └── .gitkeep
```

#### ❌ Arquivos que NÃO precisa fazer upload:

```
NÃO ENVIAR:
- node_modules/          ← Será instalado no servidor
- .env.example          ← Não é necessário
- .env.production       ← Já criou o .env
- database/             ← SQL já foi executado no banco
- Dockerfile            ← Não usa Docker na Hostinger
- docker-compose.*      ← Não usa Docker
```

## 🗄️ PARTE 3: Configurar Banco de Dados (ANTES do upload)

### 3.1 Acessar phpMyAdmin na Hostinger

1. Login no painel Hostinger
2. Websites > Manage > Banco de Dados
3. Clicar em "phpMyAdmin"
4. Selecionar banco: `u674882802_gb`

### 3.2 Importar Estrutura

1. Clicar em "SQL" na barra superior
2. Copiar TODO conteúdo do arquivo:
   ```
   c:/Users/Home/Desktop/Projects/graciebarra_sistemaV2/database/hostinger_migration.sql
   ```
3. Colar no campo de texto
4. Clicar em "Executar"
5. Aguardar mensagem de sucesso

### 3.3 Verificar Tabelas Criadas

Execute no SQL:
```sql
SHOW TABLES;
```

Deve mostrar 37 tabelas.

## 🚀 PARTE 4: Upload via FTP/File Manager

### Opção A: File Manager (Mais Fácil)

1. **Acessar File Manager**
   - Painel Hostinger > Websites > Manage > File Manager

2. **Upload do Frontend**
   - Navegar até: `domains/seudominio.com.br/public_html`
   - Deletar conteúdo existente (exceto `.htaccess` se houver)
   - Upload TODOS os arquivos da pasta `client/build/`
   - Criar `.htaccess` com o conteúdo acima

3. **Upload do Backend**
   - Navegar até: `domains/seudominio.com.br/`
   - Criar nova pasta: `api` ou `nodejs`
   - Entrar na pasta criada
   - Upload dos arquivos:
     - `index.js`
     - `package.json`
     - `.env` (criar e editar no File Manager)
   - Upload da pasta `src/` completa
   - Criar pastas vazias:
     - `uploads/`
     - `logs/`

### Opção B: FTP (FileZilla, WinSCP, etc)

1. **Configurar FTP**
   - Host: ftp.seudominio.com.br
   - Usuário: (fornecido pela Hostinger)
   - Senha: (fornecido pela Hostinger)
   - Porta: 21

2. **Conectar e fazer upload**
   - Mesmos passos da Opção A

## ⚙️ PARTE 5: Instalar Dependências e Iniciar Backend

### 5.1 Acessar Terminal SSH

**Via Painel Hostinger:**
1. Advanced > SSH Access
2. Ativar SSH
3. Usar o terminal web OU
4. Conectar via PuTTY/Terminal:
   ```bash
   ssh u674882802@ssh.seudominio.com.br
   ```

### 5.2 Instalar Dependências

```bash
# Navegar até pasta do backend
cd domains/seudominio.com.br/api

# Instalar dependências
npm install --production

# Verificar se instalou
ls -la node_modules/
```

### 5.3 Instalar PM2 e Iniciar

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação
pm2 start index.js --name "gracie-barra-api"

# Configurar para iniciar automaticamente
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs gracie-barra-api
```

## ✅ PARTE 6: Verificação

### 6.1 Testar API

```bash
curl https://seudominio.com.br/api/health
```

Ou abrir no navegador:
```
https://seudominio.com.br/api/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2025-...",
  "version": "2.0.0"
}
```

### 6.2 Testar Frontend

Abrir no navegador:
```
https://seudominio.com.br
```

Deve carregar a landing page.

### 6.3 Testar Login

```
https://seudominio.com.br/login
```

- Email: `admin@graciebarra.com`
- Senha: `admin123`

## 📋 Checklist de Upload

### Banco de Dados:
- [ ] SQL executado no phpMyAdmin
- [ ] 37 tabelas criadas
- [ ] Planos importados
- [ ] Graduações importadas

### Frontend (public_html/):
- [ ] Todos arquivos de `client/build/` enviados
- [ ] `.htaccess` criado
- [ ] `index.html` presente
- [ ] Pasta `static/` com CSS e JS

### Backend (api/):
- [ ] `index.js` enviado
- [ ] `package.json` enviado
- [ ] `.env` criado e configurado
- [ ] Pasta `src/` completa enviada
- [ ] Pasta `uploads/` criada (vazia)
- [ ] Pasta `logs/` criada (vazia)
- [ ] `npm install` executado
- [ ] PM2 instalado e rodando

### Testes:
- [ ] API responde em /api/health
- [ ] Frontend carrega
- [ ] Login funciona
- [ ] Formulário público acessível

## 🔧 Comandos Úteis SSH

```bash
# Ver status do backend
pm2 status

# Ver logs em tempo real
pm2 logs gracie-barra-api

# Reiniciar backend
pm2 restart gracie-barra-api

# Parar backend
pm2 stop gracie-barra-api

# Ver consumo de memória
pm2 monit

# Atualizar após mudanças
cd domains/seudominio.com.br/api
git pull  # Se usar git
npm install --production
pm2 restart gracie-barra-api
```

## 🆘 Troubleshooting

### Erro: "Cannot find module"
```bash
cd domains/seudominio.com.br/api
npm install --production
pm2 restart gracie-barra-api
```

### Frontend mostra página em branco
1. Verificar console do navegador (F12)
2. Verificar se `.htaccess` está em `public_html/`
3. Verificar `REACT_APP_API_URL` no build

### API não responde
```bash
pm2 logs gracie-barra-api --lines 50
```

### Banco não conecta
1. Verificar credenciais no `.env`
2. Verificar se banco foi criado
3. Testar conexão:
```bash
mysql -h 127.0.0.1 -u u674882802_jonasgb -p u674882802_gb
```

---

## 📁 RESUMO RÁPIDO: O QUE ENVIAR

### 1️⃣ Frontend → `public_html/`
```
Todo conteúdo da pasta: client/build/*
+ arquivo .htaccess (criar manualmente)
```

### 2️⃣ Backend → `api/`
```
server/index.js
server/package.json
server/.env (criar com suas senhas)
server/src/* (TODA pasta src)
Criar: uploads/ (vazia)
Criar: logs/ (vazia)
```

### 3️⃣ Banco de Dados → phpMyAdmin
```
Executar SQL: database/hostinger_migration.sql
```

### 4️⃣ Terminal SSH
```bash
cd api/
npm install --production
pm2 start index.js --name gracie-barra-api
pm2 startup
pm2 save
```

**Pronto! Sistema online! 🚀**
