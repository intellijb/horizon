.PHONY: help up down restart logs ps clean db-shell redis-cli backup status health

# Default target
help:
	@echo "Horizon Infrastructure Management Commands"
	@echo ""
	@echo "Basic Commands:"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make status     - Show service status"
	@echo "  make logs       - View logs (follow mode)"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell   - Connect to PostgreSQL"
	@echo "  make redis-cli  - Connect to Redis"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup     - Backup databases"
	@echo "  make clean      - Remove all data (CAUTION!)"
	@echo "  make health     - Check service health"

# Start services
up:
	@echo "Starting Horizon infrastructure..."
	@docker-compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@make status

# Stop services
down:
	@echo "Stopping Horizon infrastructure..."
	@docker-compose down

# Restart services
restart:
	@echo "Restarting Horizon infrastructure..."
	@docker-compose restart
	@make status

# View logs
logs:
	@docker-compose logs -f

# Show container status
ps:
	@docker-compose ps

# Detailed status with health
status:
	@echo "=== Horizon Infrastructure Status ==="
	@docker-compose ps
	@echo ""
	@echo "=== Service Health ==="
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# PostgreSQL shell
db-shell:
	@echo "Connecting to PostgreSQL..."
	@echo "Use \\q to exit"
	@docker exec -it horizon_postgres psql -U horizon -d horizon

# Redis CLI
redis-cli:
	@echo "Connecting to Redis..."
	@echo "Use 'AUTH <password>' to authenticate"
	@echo "Use 'quit' to exit"
	@docker exec -it horizon_redis redis-cli

# Backup databases
backup:
	@echo "Creating backup directory..."
	@mkdir -p ./backups
	@echo "Backing up PostgreSQL..."
	@docker exec horizon_postgres pg_dump -U horizon horizon > ./backups/postgres_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backing up Redis..."
	@docker exec horizon_redis redis-cli --rdb ./backups/redis_backup_$$(date +%Y%m%d_%H%M%S).rdb
	@echo "Backups completed in ./backups/"

# Clean all data (DANGEROUS!)
clean:
	@echo "WARNING: This will delete all data!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@docker-compose down -v
	@echo "All data has been removed"

# Health check
health:
	@echo "=== PostgreSQL Health ==="
	@docker exec horizon_postgres pg_isready -U horizon -d horizon || echo "PostgreSQL is not ready"
	@echo ""
	@echo "=== Redis Health ==="
	@docker exec horizon_redis redis-cli ping || echo "Redis is not ready"