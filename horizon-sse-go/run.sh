#!/bin/bash

# Single command to run the entire battle test
# Usage: ./run.sh [num_clients] [ramp_up_time]
# Example: ./run.sh 1000 15s

NUM_CLIENTS=${1:-1000}
RAMP_UP=${2:-15s}

echo "🚀 Starting Horizon SSE Battle Test"
echo "   Clients: $NUM_CLIENTS"
echo "   Ramp-up: $RAMP_UP"
echo ""

# Check if we should use Docker or native Go
if command -v docker-compose &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose up -d deep-server proxy-server
    sleep 5
    docker-compose run --rm -v $(pwd):/work -w /work loadtest /root/loadtest -url http://proxy-server:10080 -clients $NUM_CLIENTS -rampup $RAMP_UP
    echo ""
    echo "📊 View metrics:"
    echo "   Proxy: http://localhost:10080/metrics"
    echo "   Deep:  http://localhost:10081/metrics"
    echo ""
    echo "📈 Test results saved to: test-results.json"
    echo ""
    echo "Stop services: docker-compose down"
elif command -v go &> /dev/null; then
    echo "Using native Go..."
    chmod +x run-battle-test.sh
    ./run-battle-test.sh $NUM_CLIENTS $RAMP_UP
else
    echo "❌ Neither Docker Compose nor Go is installed"
    echo "Install one of them to run the test"
    exit 1
fi