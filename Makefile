
.PHONY: help dev dev-full dev-backend dev-frontend build test lint clean deploy

# Variáveis
COMPOSE_FILE = docker-compose.yml
COMPOSE_PROD_FILE = docker-compose.prod.yml

# Help
help: ## Mostra esta ajuda
	@echo 'Uso:'
	@echo '  make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Desenvolvimento
dev: ## Inicia ambiente de desenvolvimento completo
	docker-compose --profile development --profile backend --profile frontend up -d

dev-full: ## Inicia ambiente completo com monitoramento
	docker-compose --profile development --profile backend --profile frontend --profile monitoring up -d

dev-backend: ## Inicia apenas backend e dependências
	docker-compose --profile backend up -d

dev-frontend: ## Inicia apenas frontend
	docker-compose --profile frontend up -d

dev-database: ## Inicia apenas banco de dados
	docker-compose --profile database up -d

# Build
build: ## Faz build das imagens
	docker-compose build

build-prod: ## Faz build para produção
	docker-compose -f $(COMPOSE_PROD_FILE) build

# Testes
test: ## Executa todos os testes
	@echo "Executando testes do backend..."
	cd apps/backend && npm test
	@echo "Executando testes do frontend..."
	cd apps/frontend && npm test

test-backend: ## Executa testes do backend
	cd apps/backend && npm test

test-frontend: ## Executa testes do frontend
	cd apps/frontend && npm test

test-coverage: ## Executa testes com coverage
	cd apps/backend && npm run test:coverage
	cd apps/frontend && npm run test:coverage

# Lint
lint: ## Executa linting
	cd apps/backend && npm run lint
	cd apps/frontend && npm run lint

lint-fix: ## Corrige problemas de linting
	cd apps/backend && npm run lint:fix
	cd apps/frontend && npm run lint:fix

# Database
db-migrate: ## Executa migrations
	cd apps/backend && npx prisma migrate dev

db-seed: ## Executa seeds
	cd apps/backend && npm run prisma:seed

db-studio: ## Abre Prisma Studio
	cd apps/backend && npx prisma studio

db-backup: ## Faz backup do banco
	docker-compose --profile backup run --rm backup

# Logs
logs: ## Mostra logs dos serviços
	docker-compose logs -f

logs-backend: ## Mostra logs do backend
	docker-compose logs -f gb-backend

logs-frontend: ## Mostra logs do frontend
	docker-compose logs -f gb-frontend

logs-nginx: ## Mostra logs do nginx
	docker-compose logs -f gb-proxy

# Deploy
deploy-staging: ## Deploy para staging
	docker-compose -f $(COMPOSE_PROD_FILE) --profile staging up -d

deploy-prod: ## Deploy para produção
	docker-compose -f $(COMPOSE_PROD_FILE) up -d

# Manutenção
clean: ## Remove containers, volumes e imagens não utilizadas
	docker-compose down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

stop: ## Para todos os serviços
	docker-compose down

restart: ## Reinicia todos os serviços
	docker-compose restart

# SSL
ssl-init: ## Inicializa certificados SSL
	docker-compose --profile ssl run --rm certbot

ssl-renew: ## Renova certificados SSL
	docker-compose exec certbot certbot renew

# Monitoring
monitoring: ## Inicia monitoramento
	docker-compose --profile monitoring up -d

# Install
install: ## Instala dependências
	cd apps/backend && npm install
	cd apps/frontend && npm install

install-backend: ## Instala dependências do backend
	cd apps/backend && npm install

install-frontend: ## Instala dependências do frontend
	cd apps/frontend && npm install

# Setup inicial
setup: install ## Setup inicial do projeto
	@echo "Configurando projeto..."
	cp .env.example .env
	@echo "Edite o arquivo .env com suas configurações"
	@echo "Em seguida execute: make dev"