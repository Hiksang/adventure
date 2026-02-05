#!/bin/bash

# ===========================================
# AdWatch Deployment Script
# ===========================================

set -e

echo "🚀 Starting deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Copy .env.production.example to .env and fill in the values."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
required_vars=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "JWT_SECRET" "WORLDCOIN_APP_ID")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Pull latest code (if git repo)
if [ -d .git ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Build and start containers
echo "🔨 Building containers..."
docker-compose build --no-cache app

echo "🚀 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Check health
echo "🏥 Checking service health..."
if curl -s http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Application might still be starting...${NC}"
fi

# Show status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Cloudflare DNS to point to this server"
echo "2. Enable Cloudflare proxy (orange cloud)"
echo "3. Set SSL mode to 'Full (Strict)'"
echo "4. Add SSL certificates to docker/nginx/ssl/"
