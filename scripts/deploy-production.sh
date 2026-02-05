#!/bin/bash

# ===========================================
# Production Deployment Script
# Self-hosted Backend with Cloudflare Tunnel
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "============================================"
echo "  AdWatch Production Deployment"
echo "============================================"
echo ""

# ===========================================
# Step 1: Environment Check
# ===========================================
echo "[1/6] Checking environment..."

if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Copy .env.production.example to .env and fill in the values."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Check required variables
required_vars=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "WORLDCOIN_APP_ID"
    "CLOUDFLARE_TUNNEL_TOKEN"
    "APP_URL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "ERROR: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo "  Environment variables OK"

# ===========================================
# Step 2: Docker Check
# ===========================================
echo ""
echo "[2/6] Checking Docker..."

if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker daemon is not running!"
    exit 1
fi

echo "  Docker OK"

# ===========================================
# Step 3: Build Application
# ===========================================
echo ""
echo "[3/6] Building application..."

docker compose -f docker-compose.tunnel.yml build --no-cache app

echo "  Build complete"

# ===========================================
# Step 4: Database Migration
# ===========================================
echo ""
echo "[4/6] Starting database..."

# Start only DB first
docker compose -f docker-compose.tunnel.yml up -d db redis

echo "  Waiting for database to be ready..."
sleep 10

# Check database health
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose -f docker-compose.tunnel.yml exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        echo "  Database is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: Database failed to start!"
    docker compose -f docker-compose.tunnel.yml logs db
    exit 1
fi

# ===========================================
# Step 5: Start All Services
# ===========================================
echo ""
echo "[5/6] Starting all services..."

docker compose -f docker-compose.tunnel.yml up -d

echo "  All services started"

# ===========================================
# Step 6: Health Check
# ===========================================
echo ""
echo "[6/6] Running health checks..."

sleep 15

# Check app health
APP_HEALTHY=false
for i in {1..30}; do
    if docker compose -f docker-compose.tunnel.yml exec -T app wget -q --spider http://localhost:3000/api/health 2>/dev/null; then
        APP_HEALTHY=true
        break
    fi
    echo "  Waiting for app to be healthy... ($i/30)"
    sleep 2
done

if [ "$APP_HEALTHY" = false ]; then
    echo "WARNING: App health check failed. Check logs:"
    echo "  docker compose -f docker-compose.tunnel.yml logs app"
fi

# Check tunnel
TUNNEL_RUNNING=$(docker compose -f docker-compose.tunnel.yml ps tunnel --format json 2>/dev/null | grep -c "running" || echo "0")
if [ "$TUNNEL_RUNNING" != "0" ]; then
    echo "  Tunnel is running"
else
    echo "WARNING: Tunnel may not be running correctly. Check logs:"
    echo "  docker compose -f docker-compose.tunnel.yml logs tunnel"
fi

# ===========================================
# Complete!
# ===========================================
echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "Your app should be accessible at:"
echo "  $APP_URL"
echo ""
echo "Useful commands:"
echo "  View logs:      docker compose -f docker-compose.tunnel.yml logs -f"
echo "  Stop services:  docker compose -f docker-compose.tunnel.yml down"
echo "  Restart:        docker compose -f docker-compose.tunnel.yml restart"
echo "  App logs:       docker compose -f docker-compose.tunnel.yml logs -f app"
echo "  Tunnel logs:    docker compose -f docker-compose.tunnel.yml logs -f tunnel"
echo ""
echo "Database backup:"
echo "  ./scripts/backup-db.sh"
echo ""
