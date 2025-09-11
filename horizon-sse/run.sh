#!/bin/bash

# Single command to run the entire Node.js SSE battle test
# Usage: ./run.sh [num_clients] [ramp_up_time]
# Example: ./run.sh 1000 15s

NUM_CLIENTS=${1:-1000}
RAMP_UP=${2:-15s}

echo "🚀 Starting Horizon SSE Battle Test (Node.js)"
echo "   Clients: $NUM_CLIENTS"
echo "   Ramp-up: $RAMP_UP"
echo ""

# Check if we should use Docker or native Node.js
if command -v docker-compose &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose up -d deep-server proxy-server
    sleep 5
    docker-compose run --rm -v $(pwd):/work -w /work loadtest node /app/dist/loadtest/index.js -url http://proxy-server:10090 -clients $NUM_CLIENTS -rampup $RAMP_UP
    echo ""
    echo "📊 View metrics:"
    echo "   Proxy: http://localhost:10090/metrics"
    echo "   Deep:  http://localhost:10091/metrics"
    echo ""
    echo "📈 Test results saved to: test-results.json"
    echo ""
    echo "Stop services: docker-compose down"
elif command -v node &> /dev/null; then
    echo "Using native Node.js..."
    # Build TypeScript first
    npm run build
    
    # Start servers in background
    npm run start:deep &
    DEEP_PID=$!
    npm run start:proxy &
    PROXY_PID=$!
    
    echo "Waiting for servers to start..."
    sleep 3
    
    # Run load test
    npm run start:loadtest -- -url http://localhost:10080 -clients $NUM_CLIENTS -rampup $RAMP_UP
    
    # Cleanup
    echo "Stopping servers..."
    kill $DEEP_PID $PROXY_PID 2>/dev/null
    
    echo ""
    echo "📊 View metrics:"
    echo "   Proxy: http://localhost:10090/metrics"
    echo "   Deep:  http://localhost:10091/metrics"
    echo ""
    echo "📈 Test results saved to: test-results.json"
else
    echo "❌ Neither Docker Compose nor Node.js is installed"
    echo "Install one of them to run the test"
    exit 1
fi