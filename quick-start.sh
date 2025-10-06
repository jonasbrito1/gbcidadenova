#!/bin/bash

# 🚀 Quick Start - Sistema Gracie Barra 2.0

echo "🥋 Sistema Gracie Barra - Quick Start"
echo "======================================"
echo ""

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instale o Docker Compose primeiro."
    exit 1
fi

echo "✅ Docker e Docker Compose encontrados"
echo ""

# Verificar se as portas estão livres
echo "🔍 Verificando portas necessárias..."

PORTS=(3000 3001 3307 8082 8083)
PORTS_IN_USE=()

for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        PORTS_IN_USE+=($port)
    fi
done

if [ ${#PORTS_IN_USE[@]} -ne 0 ]; then
    echo "⚠️  Portas em uso: ${PORTS_IN_USE[*]}"
    echo "   Para liberar: kill \$(lsof -t -i:PORTA)"
    echo ""
fi

# Iniciar containers
echo "🐳 Iniciando containers Docker..."
docker-compose -f docker-compose.modern.yml up -d

echo ""
echo "⏳ Aguardando containers iniciarem..."
sleep 10

# Verificar status dos containers
echo "📊 Status dos containers:"
docker-compose -f docker-compose.modern.yml ps

echo ""
echo "🎉 Sistema iniciado com sucesso!"
echo ""
echo "🌐 URLs de Acesso:"
echo "   Frontend React: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Aplicação Completa: http://localhost:8082"
echo "   phpMyAdmin: http://localhost:8083"
echo ""
echo "🔐 Credenciais:"
echo "   Admin: admin@graciebarra.com / password"
echo "   Professor: professor@graciebarra.com / password"
echo ""
echo "📝 Para ver logs: docker-compose -f docker-compose.modern.yml logs -f"
echo "🛑 Para parar: docker-compose -f docker-compose.modern.yml down"