#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DEEP_SERVER_PORT=10081
PROXY_SERVER_PORT=10080
NUM_CLIENTS=${1:-1000}
RAMP_UP_TIME=${2:-15s}

# PIDs array to track processes
declare -a PIDS

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null
        fi
    done
    exit 0
}

trap cleanup SIGINT SIGTERM

# Function to check if port is available
check_port() {
    ! lsof -i:$1 >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url/health >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $service is ready${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service failed to start${NC}"
    return 1
}

# Clear screen and show banner
clear
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}           HORIZON SSE LOAD TEST - BATTLE MODE${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Clients: ${NC}$NUM_CLIENTS"
echo -e "${BLUE}Ramp-up: ${NC}$RAMP_UP_TIME"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}\n"

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
if ! command -v go &> /dev/null; then
    echo -e "${RED}Go is not installed${NC}"
    exit 1
fi

# Check ports
if ! check_port $DEEP_SERVER_PORT; then
    echo -e "${RED}Port $DEEP_SERVER_PORT is already in use${NC}"
    exit 1
fi

if ! check_port $PROXY_SERVER_PORT; then
    echo -e "${RED}Port $PROXY_SERVER_PORT is already in use${NC}"
    exit 1
fi

# Build all services
echo -e "\n${YELLOW}Building services...${NC}"
go build -o bin/deep-server cmd/deep-server/main.go
go build -o bin/proxy-server cmd/proxy-server/main.go
go build -o bin/loadtest cmd/loadtest/main.go
echo -e "${GREEN}✓ Build complete${NC}"

# Start Deep Server
echo -e "\n${YELLOW}Starting Deep Server (OpenAI simulator)...${NC}"
./bin/deep-server -port $DEEP_SERVER_PORT > logs/deep-server.log 2>&1 &
DEEP_PID=$!
PIDS+=($DEEP_PID)
wait_for_service "http://localhost:$DEEP_SERVER_PORT" "Deep Server"

# Start Proxy Server
echo -e "${YELLOW}Starting Proxy Server...${NC}"
./bin/proxy-server -port $PROXY_SERVER_PORT -deep-server "http://localhost:$DEEP_SERVER_PORT" > logs/proxy-server.log 2>&1 &
PROXY_PID=$!
PIDS+=($PROXY_PID)
wait_for_service "http://localhost:$PROXY_SERVER_PORT" "Proxy Server"

# Start metrics monitor in background
echo -e "\n${YELLOW}Starting metrics monitor...${NC}"
(
    while true; do
        # Get system metrics
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            CPU_USAGE=$(ps aux | awk '{sum+=$3} END {print sum}')
            MEM_USAGE=$(ps aux | awk '{sum+=$4} END {print sum}')
        else
            # Linux
            CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
            MEM_USAGE=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
        fi
        
        # Get proxy metrics
        PROXY_METRICS=$(curl -s http://localhost:$PROXY_SERVER_PORT/metrics 2>/dev/null)
        
        # Clear previous line and print metrics
        echo -e "\r${BLUE}[METRICS]${NC} CPU: ${YELLOW}${CPU_USAGE}%${NC} | MEM: ${YELLOW}${MEM_USAGE}%${NC} | $(echo $PROXY_METRICS | jq -r '.proxy | "Active: \(.active_connections) | Total: \(.total_connections) | Messages: \(.proxied_messages)"' 2>/dev/null || echo "Waiting for metrics...")\c"
        
        sleep 2
    done
) &
MONITOR_PID=$!
PIDS+=($MONITOR_PID)

# Create logs directory
mkdir -p logs

# Wait a moment for services to stabilize
sleep 2

# Run load test
echo -e "\n\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Starting Battle Test: $NUM_CLIENTS concurrent clients${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}\n"

./bin/loadtest -url "http://localhost:$PROXY_SERVER_PORT" -clients $NUM_CLIENTS -rampup $RAMP_UP_TIME

# Show final metrics
echo -e "\n\n${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Final Metrics:${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}Proxy Server Metrics:${NC}"
curl -s http://localhost:$PROXY_SERVER_PORT/metrics | jq '.' 2>/dev/null || echo "Failed to get proxy metrics"

echo -e "\n${BLUE}Deep Server Metrics:${NC}"
curl -s http://localhost:$DEEP_SERVER_PORT/metrics | jq '.' 2>/dev/null || echo "Failed to get deep server metrics"

# Show logs summary
echo -e "\n${BLUE}Error Summary:${NC}"
echo "Deep Server errors: $(grep -c ERROR logs/deep-server.log 2>/dev/null || echo 0)"
echo "Proxy Server errors: $(grep -c ERROR logs/proxy-server.log 2>/dev/null || echo 0)"

echo -e "\n${GREEN}Test complete! Logs available in ./logs/${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep running until interrupted
wait