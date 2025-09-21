#!/bin/bash

# DynamoDB Backup Script
# Usage: ./backup-dynamodb.sh [backup_dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="dynamodb_backup_${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if DynamoDB data directory exists
if [ ! -d "./docker/dynamodb/data" ]; then
    echo "❌ DynamoDB data directory not found!"
    exit 1
fi

echo "📦 Starting DynamoDB backup..."

# Create tar archive of DynamoDB data
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C ./docker/dynamodb data/

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"

    # Show backup size
    ls -lh "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | awk '{print "📊 Backup size: " $5}'

    # Keep only last 7 backups (optional)
    echo "🧹 Cleaning old backups (keeping last 7)..."
    ls -t "$BACKUP_DIR"/dynamodb_backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

    echo "✅ Backup complete!"
else
    echo "❌ Backup failed!"
    exit 1
fi