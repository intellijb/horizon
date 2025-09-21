#!/bin/bash

# DynamoDB Restore Script
# Usage: ./restore-dynamodb.sh backup_file.tar.gz

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Usage: $0 <backup_file.tar.gz>"
    echo "Available backups:"
    ls -la ./backups/dynamodb_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will replace current DynamoDB data!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop DynamoDB container
echo "🛑 Stopping DynamoDB container..."
docker-compose stop dynamodb

# Backup current data (just in case)
if [ -d "./docker/dynamodb/data" ]; then
    echo "📦 Backing up current data..."
    mv ./docker/dynamodb/data "./docker/dynamodb/data.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Extract backup
echo "📂 Restoring from backup..."
mkdir -p ./docker/dynamodb
tar -xzf "$BACKUP_FILE" -C ./docker/dynamodb/

# Set permissions
chmod -R 777 ./docker/dynamodb/data

# Start DynamoDB container
echo "🚀 Starting DynamoDB container..."
docker-compose up -d dynamodb

echo "✅ Restore complete!"
echo "🔍 Verify with: docker-compose logs dynamodb"