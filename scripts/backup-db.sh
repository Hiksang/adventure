#!/bin/bash

# ===========================================
# Database Backup Script
# ===========================================

set -e

# Load environment
export $(cat .env | grep -v '^#' | xargs)

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/adwatch_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "📦 Creating database backup..."

# Create backup using docker
docker-compose exec -T db pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > $BACKUP_FILE

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 7 backups
echo "🧹 Cleaning old backups..."
ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --

echo "📊 Current backups:"
ls -lh $BACKUP_DIR/*.sql.gz 2>/dev/null || echo "No backups found"
