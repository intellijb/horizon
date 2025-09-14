#!/bin/bash

# Compare Go and Node.js SSE implementations
# Usage: ./compare.sh [num_clients] [ramp_up_time]
# Example: ./compare.sh 1000 15s

NUM_CLIENTS=${1:-1000}
RAMP_UP=${2:-15s}
RESULTS_DIR="comparison-results"

echo "🔬 SSE Implementation Comparison Test"
echo "=================================="
echo "   Clients: $NUM_CLIENTS"
echo "   Ramp-up: $RAMP_UP"
echo "   Results: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to clean up Docker containers
cleanup_docker() {
    echo "🧹 Cleaning up Docker containers..."
    cd ../go && docker-compose down 2>/dev/null
    cd ../nodejs && docker-compose down 2>/dev/null
    cd ..
    sleep 2
}

# Function to wait for services to be ready
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=0
    
    echo "Waiting for service at $url..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null; then
            echo "✅ Service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo "❌ Service failed to start"
    return 1
}

# Initial cleanup
cleanup_docker

# ============================================
# Test 1: Go Implementation
# ============================================
echo ""
echo "📦 Testing Go Implementation"
echo "----------------------------"

cd horizon-sse-go

# Start monitoring for Go
echo "Starting resource monitoring for Go..."
../monitor.sh "../$RESULTS_DIR/go-metrics.csv" "horizon-" &
MONITOR_PID=$!

# Run Go test
echo "Running Go SSE test..."
./run.sh "$NUM_CLIENTS" "$RAMP_UP"

# Stop monitoring
echo "Stopping resource monitoring..."
kill $MONITOR_PID 2>/dev/null

# Copy results
cp test-results.json "../$RESULTS_DIR/go-test-results.json"
echo "✅ Go test complete"

# Cleanup Go containers
docker-compose down

cd ..
sleep 5

# ============================================
# Test 2: Node.js Implementation
# ============================================
echo ""
echo "📦 Testing Node.js Implementation"
echo "---------------------------------"

cd horizon-sse

# Start monitoring for Node.js
echo "Starting resource monitoring for Node.js..."
../monitor.sh "../$RESULTS_DIR/node-metrics.csv" "horizon-" &
MONITOR_PID=$!

# Run Node.js test
echo "Running Node.js SSE test..."
./run.sh "$NUM_CLIENTS" "$RAMP_UP"

# Stop monitoring
echo "Stopping resource monitoring..."
kill $MONITOR_PID 2>/dev/null

# Copy results
cp test-results.json "../$RESULTS_DIR/node-test-results.json"
echo "✅ Node.js test complete"

# Cleanup Node containers
docker-compose down

cd ..

# ============================================
# Analysis
# ============================================
echo ""
echo "📊 Analyzing Results"
echo "-------------------"

# Run analysis script
if [ -f "analyze.js" ]; then
    node analyze.js "$RESULTS_DIR"
else
    echo "⚠️  Analysis script not found. Creating basic comparison..."
    
    # Basic comparison using jq if available
    if command -v jq &> /dev/null; then
        echo ""
        echo "Go Results:"
        jq '.summary' "$RESULTS_DIR/go-test-results.json"
        
        echo ""
        echo "Node.js Results:"
        jq '.summary' "$RESULTS_DIR/node-test-results.json"
    else
        echo "Install jq for better results display"
    fi
fi

echo ""
echo "✅ Comparison Complete!"
echo ""
echo "Results saved in $RESULTS_DIR/"
echo "  - go-test-results.json"
echo "  - node-test-results.json"
echo "  - go-metrics.csv"
echo "  - node-metrics.csv"

# Display basic metrics comparison
echo ""
echo "Quick Comparison:"
echo "-----------------"
if command -v jq &> /dev/null; then
    echo "Metric,Go,Node.js" > "$RESULTS_DIR/quick-comparison.csv"
    
    GO_SUCCESS=$(jq -r '.summary.success_rate' "$RESULTS_DIR/go-test-results.json")
    NODE_SUCCESS=$(jq -r '.summary.success_rate' "$RESULTS_DIR/node-test-results.json")
    echo "Success Rate,$GO_SUCCESS,$NODE_SUCCESS" >> "$RESULTS_DIR/quick-comparison.csv"
    
    GO_AVG_TIME=$(jq -r '.summary.avg_response_time' "$RESULTS_DIR/go-test-results.json")
    NODE_AVG_TIME=$(jq -r '.summary.avg_response_time' "$RESULTS_DIR/node-test-results.json")
    echo "Avg Response Time,$GO_AVG_TIME,$NODE_AVG_TIME" >> "$RESULTS_DIR/quick-comparison.csv"
    
    GO_MSG_SEC=$(jq -r '.summary.messages_per_second' "$RESULTS_DIR/go-test-results.json")
    NODE_MSG_SEC=$(jq -r '.summary.messages_per_second' "$RESULTS_DIR/node-test-results.json")
    echo "Messages/sec,$GO_MSG_SEC,$NODE_MSG_SEC" >> "$RESULTS_DIR/quick-comparison.csv"
    
    GO_REQ_SEC=$(jq -r '.summary.requests_per_second' "$RESULTS_DIR/go-test-results.json")
    NODE_REQ_SEC=$(jq -r '.summary.requests_per_second' "$RESULTS_DIR/node-test-results.json")
    echo "Requests/sec,$GO_REQ_SEC,$NODE_REQ_SEC" >> "$RESULTS_DIR/quick-comparison.csv"
    
    cat "$RESULTS_DIR/quick-comparison.csv" | column -t -s ','
fi