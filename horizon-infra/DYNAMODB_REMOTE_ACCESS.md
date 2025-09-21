# DynamoDB Remote Access & Backup Guide

## Remote Access Methods

### 1. SSH Tunnel (Recommended)
Connect to remote DynamoDB securely through SSH tunnel:

```bash
# Create SSH tunnel to remote server
ssh -L 20800:localhost:20800 user@your-remote-server

# Now access DynamoDB locally at http://localhost:20800
# You can use AWS CLI or SDK with endpoint http://localhost:20800
```

### 2. Backup & Restore

#### On Remote Server

**Create Backup:**
```bash
cd horizon-infra
./scripts/backup-dynamodb.sh

# Or specify custom backup directory
./scripts/backup-dynamodb.sh /path/to/backup/dir
```

**Restore Backup:**
```bash
cd horizon-infra
./scripts/restore-dynamodb.sh ./backups/dynamodb_backup_20250921_120000.tar.gz
```

#### Download Backup to Local

```bash
# Download latest backup
scp user@remote-server:~/horizon-infra/backups/dynamodb_backup_*.tar.gz ./local-backups/

# Or use rsync for incremental sync
rsync -avz user@remote-server:~/horizon-infra/backups/ ./local-backups/
```

### 3. Programmatic Backup

Use the Node.js backup script:

```bash
# Export all tables to JSON
cd horizon-fastify
npx tsx src/modules/platform/dynamodb/backup.ts export ./backups

# Import from JSON backup
npx tsx src/modules/platform/dynamodb/backup.ts import ./backups/dynamodb-backup-1234567890.json
```

### 4. Direct Data Sync

Sync DynamoDB data directory directly:

```bash
# Sync from remote to local (for backup)
rsync -avz user@remote-server:~/horizon-infra/docker/dynamodb/data/ ./backup/dynamodb-data/

# Sync from local to remote (for restore) - BE CAREFUL!
rsync -avz ./backup/dynamodb-data/ user@remote-server:~/horizon-infra/docker/dynamodb/data/
```

## Production Setup

In production, DynamoDB is configured to:
1. Bind only to localhost (127.0.0.1:20800) for security
2. Use persistent storage in `./docker/dynamodb/data`
3. Restart automatically on failure

## Security Notes

- Never expose DynamoDB port directly to the internet
- Always use SSH tunnels for remote access
- Keep regular backups using the provided scripts
- Store backups in a secure location

## Monitoring

Check DynamoDB status:
```bash
# On remote server
docker-compose logs -f dynamodb
docker-compose ps dynamodb

# Check data directory size
du -sh ./docker/dynamodb/data
```

## Automated Backups (Cron)

Add to crontab on remote server:
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/horizon-infra && ./scripts/backup-dynamodb.sh

# Weekly backup to remote storage (example with S3)
0 3 * * 0 cd /path/to/horizon-infra && ./scripts/backup-dynamodb.sh && aws s3 cp ./backups/dynamodb_backup_*.tar.gz s3://your-bucket/dynamodb-backups/
```