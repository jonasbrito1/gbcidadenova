# 🥋 Sistema Gracie Barra - Versão 2.0

Sistema completo de gestão da academia Gracie Barra desenvolvido em stack JavaScript moderna.

## 🚀 Stack Tecnológica

### Backend
- **Node.js 18+** com Express.js
- **MySQL 8.0** como banco de dados
- **JWT** para autenticação segura
- **bcryptjs** para criptografia
- **Winston** para logs estruturados
- **Helmet** para segurança
- **Rate Limiting** para proteção

### Frontend
- **React 18** com Hooks modernos
- **React Router 6** para navegação
- **Bootstrap 5** + React Bootstrap
- **React Query** para gerenciamento de estado
- **Axios** para requisições HTTP
- **React Toastify** para notificações

### DevOps & Infraestrutura
- **Docker** e Docker Compose
- **Nginx** como proxy reverso
- Ambiente totalmente containerizado
- Hot reload em desenvolvimento

## ⚡ Execução Rápida

```bash
# 1. Subir toda a aplicação com Docker
docker-compose -f docker-compose.modern.yml up -d

# 2. Acessar a aplicação
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Aplicação Completa: http://localhost:8082
# phpMyAdmin: http://localhost:8083
```

### 🔐 Credenciais Padrão
- **Admin:** admin@graciebarra.com / password
- **Professor:** professor@graciebarra.com / password

## 📁 Estrutura do Projeto

```
graciebarra_sistemaV2/
├── 🖥️  server/                    # Backend Node.js
│   ├── src/
│   │   ├── config/               # Configurações de BD
│   │   ├── controllers/          # Controladores
│   │   ├── middleware/           # Middlewares de auth
│   │   ├── routes/               # Rotas da API REST
│   │   ├── services/             # Lógica de negócio
│   │   └── utils/                # Utilitários
│   ├── index.js                  # Entry point
│   ├── .env                      # Variáveis de ambiente
│   └── package.json
├── 🌐 client/                     # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/           # Componentes reutilizáveis
│   │   ├── contexts/             # Contextos React (Auth)
│   │   ├── pages/                # Páginas da aplicação
│   │   ├── services/             # Chamadas de API
│   │   └── utils/                # Helpers
│   └── package.json
├── 🗄️  sql/                       # Scripts do banco
├── 🐳 docker-compose.modern.yml   # Orquestração Docker
├── ⚙️  nginx.conf                 # Configuração proxy
├── 📦 package.json               # Scripts raiz
└── 📚 README.md
```

## 🎯 Funcionalidades Implementadas

### ✅ **Core System**
- **Autenticação JWT** com tokens seguros
- **Controle de acesso** por tipo de usuário (Admin, Professor, Aluno)
- **Dashboard interativo** com métricas em tempo real
- **Interface responsiva** para desktop e mobile

### ✅ **Gestão de Usuários**
- CRUD completo de usuários
- Sistema de permissões por tipo
- Validações robustas
- Histórico de atividades

### ✅ **Gestão de Alunos**
- Listagem com filtros avançados
- Sistema de matrículas automatizado
- Controle de status (ativo/inativo/trancado)
- Perfis detalhados
- Histórico de graduações

### ✅ **Dashboard Executivo**
- **Métricas financeiras** em tempo real
- **Alertas inteligentes** (vencimentos, inadimplência)
- **Gráficos de evolução** de alunos
- **Análise por programa** (Adultos, Infantil, etc.)
- **Top rankings** de frequência

### ✅ **Gestão de Professores**
- Cadastro completo de professores
- Perfis profissionais detalhados
- Visualização de turmas vinculadas
- Estatísticas de alunos
- Histórico de frequência

### ✅ **Sistema de Turmas**
- Criação e gestão de turmas/horários
- Grade de horários visual
- Controle de capacidade e vagas
- Vinculação de professores e alunos
- Gestão por modalidade e faixa etária

### ✅ **Sistema Financeiro**
- Dashboard financeiro completo
- Gestão de mensalidades
- Controle de inadimplência
- Múltiplas formas de pagamento (cartão, PIX, dinheiro)
- Bandeiras de cartão personalizadas
- Geração em lote de mensalidades
- Relatórios e estatísticas financeiras

### ✅ **Sistema de Frequência**
- Registro por turma ou individual
- Estatísticas de presença por aluno
- Relatórios mensais detalhados
- Controle de observações por aula
- Dashboard de frequência geral

### ✅ **Formulários de Cadastro Público**
- Formulário público para novos alunos
- Coleta de dados pessoais, médicos e emergência
- Sistema de responsável para menores de 16 anos
- Workflow de aprovação (Admin/Professor)
- Geração automática de credenciais
- Envio de e-mail com boas-vindas

### ✅ **Gestão de Usuários Avançada**
- CRUD completo com validações
- Alteração de senhas segura
- Filtros avançados de busca
- Paginação otimizada
- Controle de acesso por tipo

### ✅ **API REST Completa**
- Endpoints padronizados RESTful
- Documentação automática
- Validação de entrada robusta
- Rate limiting e segurança
- Logs estruturados

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+ (opcional para dev local)

### Configuração
```bash
# Instalar dependências
npm run install:all

# Configurar ambiente
cp server/.env.example server/.env

# Modo desenvolvimento (sem Docker)
npm run dev
```

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento full-stack
npm run server:dev   # Apenas backend
npm run client:dev   # Apenas frontend
npm run build        # Build de produção
npm run docker:up    # Subir containers
npm run docker:down  # Parar containers
```

## 🔒 Segurança

- **Headers de segurança** com Helmet
- **Rate limiting** (100 req/15min por IP)
- **Validação rigorosa** de entrada
- **JWT tokens** com expiração
- **Senhas hasheadas** com bcrypt (12 rounds)
- **CORS** configurado adequadamente
- **Logs de auditoria** para ações sensíveis

## 📊 Monitoramento

- **Logs estruturados** com Winston
- **Health checks** automatizados
- **Métricas de performance** em tempo real
- **Alertas proativos** de sistema

## 🚀 Deploy e Produção

### Docker Production
```bash
# Build otimizado
docker-compose -f docker-compose.modern.yml build

# Deploy
docker-compose -f docker-compose.modern.yml up -d
```

### Variáveis de Ambiente Importantes
```env
# Produção - ALTERAR OBRIGATORIAMENTE
JWT_SECRET=sua_chave_super_secreta_aqui
DB_PASSWORD=senha_forte_do_banco

# Performance
NODE_ENV=production
LOG_LEVEL=error
```

## 🎯 Próximas Funcionalidades

### 📋 Roadmap
- [ ] **Integração Gateway de Pagamento** (Stripe, Mercado Pago)
- [ ] **Sistema de QR Code** para check-in de frequência
- [ ] **Relatórios Avançados** com export PDF/Excel
- [ ] **Notificações Push** e e-mail automatizadas
- [ ] **App Mobile** React Native
- [ ] **Sistema de Graduações** com exames e cerimônias
- [ ] **Integração WhatsApp Business** para comunicação
- [ ] **Dashboard Professor** personalizado
- [ ] **Sistema de Loja/E-commerce** para produtos GB
- [ ] **Plataforma de Vídeos** para técnicas e aulas

## 🐳 Comandos Docker

```bash
# Logs em tempo real
docker-compose -f docker-compose.modern.yml logs -f

# Rebuild sem cache
docker-compose -f docker-compose.modern.yml build --no-cache

# Executar comando no container
docker-compose -f docker-compose.modern.yml exec backend bash

# Parar tudo
docker-compose -f docker-compose.modern.yml down

# Limpar volumes
docker-compose -f docker-compose.modern.yml down -v
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Porta em uso**
   ```bash
   # Verificar portas
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   ```

2. **Erro de conexão com BD**
   ```bash
   # Verificar container MySQL
   docker-compose logs mysql
   ```

3. **Problemas de permissão**
   ```bash
   # Reset de containers
   docker-compose down && docker-compose up -d
   ```

## 📞 Suporte

Para dúvidas técnicas:
1. ✅ Verificar logs: `docker-compose logs`
2. ✅ Conferir portas disponíveis
3. ✅ Validar configurações do `.env`
4. ✅ Consultar este README

---

## 🏆 Status do Projeto

**🎉 SISTEMA TOTALMENTE OPERACIONAL**

- ✅ **Migração 100% completa** do PHP para JavaScript
- ✅ **Produção ready** com Docker
- ✅ **Segurança enterprise** implementada
- ✅ **Performance otimizada** para escala
- ✅ **Código limpo** e manutenível

**Versão:** 2.0.0 | **Stack:** JavaScript Full-Stack | **Status:** ✅ Ativo