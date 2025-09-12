# Horizon Infrastructure Commands

## Initial Setup

### 1. Configure Environment
```bash
# Navigate to infrastructure directory
cd horizon-infra

# Copy environment template
cp .env.example .env

# Edit .env file and set your passwords
# IMPORTANT: Use strong passwords for production
nano .env
# or
vim .env
```

### 2. Start Infrastructure
```bash
# Start all services
make up

# Verify services are running
make status
```

### 3. Configure Application
```bash
# Navigate to application directory
cd ../horizon-fastify

# Copy environment template
cp .env.example .env

# Edit .env with matching passwords from horizon-infra/.env
nano .env
```

## Connection Strings

After setup, use these connection strings in your application:

```env
# PostgreSQL
POSTGRES_URI=postgresql://horizon:YOUR_PASSWORD@localhost:20432/horizon

# Redis
REDIS_URL=redis://:YOUR_PASSWORD@localhost:20379
```

## Daily Operations

### Service Management
```bash
# Start services
make up

# Stop services
make down

# Restart services
make restart

# View service status
make status

# Check service health
make health
```

### Monitoring
```bash
# View logs (all services)
make logs

# View specific service logs
docker-compose logs postgres
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f postgres
```

### Database Access
```bash
# PostgreSQL shell
make db-shell

# Once connected:
\l              # List databases
\dt             # List tables
\dn             # List schemas
\q              # Exit

# Redis CLI
make redis-cli

# Once connected:
AUTH your_password_here
PING            # Test connection
INFO            # Server information
KEYS *          # List all keys (careful in production!)
quit            # Exit
```

## Maintenance

### Backup
```bash
# Create backups (stored in ./backups/)
make backup

# Manual PostgreSQL backup
docker exec horizon_postgres pg_dump -U horizon horizon > backup.sql

# Manual Redis backup
docker exec horizon_redis redis-cli BGSAVE
```

### Reset Database
```bash
# WARNING: This deletes all data!
make clean
make up
```

## Troubleshooting

### Service Won't Start
```bash
# Check if ports are in use
lsof -i :20432  # PostgreSQL
lsof -i :20379  # Redis

# Check Docker logs
docker-compose logs postgres
docker-compose logs redis

# Remove and recreate
make clean
make up
```

### Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -p 20432 -U horizon -d horizon

# Test Redis connection
redis-cli -h localhost -p 20379
> AUTH your_password
> PING
```

### Permission Issues
```bash
# Fix volume permissions
docker-compose down
sudo rm -rf horizon_postgres_data horizon_redis_data
make up
```

## Development Tips

### Quick Database Reset
```bash
# Drop and recreate database
make db-shell
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;
\q
make restart
```

### Monitor Performance
```bash
# PostgreSQL stats
make db-shell
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database WHERE datname = 'horizon';

# Redis stats
make redis-cli
AUTH your_password
INFO stats
INFO memory
```

### Using Different Ports
```bash
# Edit .env file
POSTGRES_PORT=20433  # Different port
REDIS_PORT=20380     # Different port

# Restart services
make restart
```

## Production Considerations

1. **Security**
   - Use strong passwords
   - Consider using Docker secrets
   - Enable SSL/TLS
   - Restrict network access

2. **Backup Strategy**
   - Schedule regular backups
   - Test restore procedures
   - Store backups offsite

3. **Monitoring**
   - Set up health checks
   - Monitor resource usage
   - Configure alerts

4. **Performance**
   - Tune PostgreSQL settings in postgres.conf
   - Adjust Redis memory limits
   - Monitor query performance

## Quick Reference

| Command | Description |
|---------|-------------|
| `make up` | Start all services |
| `make down` | Stop all services |
| `make restart` | Restart services |
| `make logs` | View logs |
| `make status` | Check status |
| `make health` | Health check |
| `make db-shell` | PostgreSQL CLI |
| `make redis-cli` | Redis CLI |
| `make backup` | Create backups |
| `make clean` | Delete all data |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | (required) | PostgreSQL password |
| `POSTGRES_PORT` | 20432 | PostgreSQL external port |
| `REDIS_PASSWORD` | (required) | Redis password |
| `REDIS_PORT` | 20379 | Redis external port |