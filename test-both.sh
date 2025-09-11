#!/bin/bash

# Single script to test both implementations sequentially and display results
# Usage: ./test-both.sh [num_clients] [ramp_up_time]
# Example: ./test-both.sh 1000 15s

NUM_CLIENTS=${1:-1000}
RAMP_UP=${2:-15s}

echo "🔬 SSE Implementation Sequential Test"
echo "====================================="
echo "   Clients: $NUM_CLIENTS"
echo "   Ramp-up: $RAMP_UP"
echo ""

# Step 1: Shutdown all existing containers
echo "📦 Step 1: Cleaning up existing Docker containers..."
echo "---------------------------------------------"
cd horizon-sse-go && docker-compose down 2>/dev/null
cd ../horizon-sse && docker-compose down 2>/dev/null
cd ..
docker ps | grep horizon && docker stop $(docker ps -q --filter name=horizon) 2>/dev/null
echo "✅ Cleanup complete"
echo ""
sleep 2

# Step 2: Run Go implementation test
echo "📦 Step 2: Testing Go Implementation"
echo "---------------------------------------------"
cd horizon-sse-go
echo "Starting Go SSE test with $NUM_CLIENTS clients..."
./run.sh "$NUM_CLIENTS" "$RAMP_UP"
GO_RESULT=$?

# Capture Go results
if [ -f test-results.json ]; then
    GO_SUCCESS=$(jq -r '.summary.success_rate' test-results.json 2>/dev/null || echo "N/A")
    GO_MSG_SEC=$(jq -r '.summary.messages_per_second' test-results.json 2>/dev/null || echo "N/A")
    GO_AVG_TIME=$(jq -r '.summary.avg_response_time' test-results.json 2>/dev/null || echo "N/A")
    GO_TOTAL_MSG=$(jq -r '.summary.total_messages' test-results.json 2>/dev/null || echo "N/A")
    # Copy to comparison-results for dashboard
    mkdir -p ../comparison-results
    cp test-results.json ../comparison-results/go-test-results.json
else
    GO_SUCCESS="Failed"
    GO_MSG_SEC="N/A"
    GO_AVG_TIME="N/A"
    GO_TOTAL_MSG="N/A"
fi

# Cleanup Go containers
docker-compose down
cd ..
echo "✅ Go test complete"
echo ""
sleep 3

# Step 3: Run Node.js implementation test
echo "📦 Step 3: Testing Node.js Implementation"
echo "---------------------------------------------"
cd horizon-sse
echo "Starting Node.js SSE test with $NUM_CLIENTS clients..."
./run.sh "$NUM_CLIENTS" "$RAMP_UP"
NODE_RESULT=$?

# Capture Node results
if [ -f test-results.json ]; then
    NODE_SUCCESS=$(jq -r '.summary.success_rate' test-results.json 2>/dev/null || echo "N/A")
    NODE_MSG_SEC=$(jq -r '.summary.messages_per_second' test-results.json 2>/dev/null || echo "N/A")
    NODE_AVG_TIME=$(jq -r '.summary.avg_response_time' test-results.json 2>/dev/null || echo "N/A")
    NODE_TOTAL_MSG=$(jq -r '.summary.total_messages' test-results.json 2>/dev/null || echo "N/A")
    # Copy to comparison-results for dashboard
    mkdir -p ../comparison-results
    cp test-results.json ../comparison-results/node-test-results.json
else
    NODE_SUCCESS="Failed"
    NODE_MSG_SEC="N/A"
    NODE_AVG_TIME="N/A"
    NODE_TOTAL_MSG="N/A"
fi

# Cleanup Node containers
docker-compose down
cd ..
echo "✅ Node.js test complete"
echo ""

# Update comparison report for dashboard
if command -v node &> /dev/null && [ -f "analyze.js" ]; then
    node analyze.js comparison-results > /dev/null 2>&1
fi

# Step 4: Display Results
echo "════════════════════════════════════════════════════════════════"
echo "                       📊 TEST RESULTS                          "
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  • Clients: $NUM_CLIENTS"
echo "  • Ramp-up: $RAMP_UP"
echo "  • Stream Duration: ~15 seconds"
echo ""
echo "┌─────────────────────┬─────────────────────┬─────────────────────┐"
echo "│      Metric         │      Go Server      │    Node.js Server   │"
echo "├─────────────────────┼─────────────────────┼─────────────────────┤"
printf "│ %-19s │ %-19s │ %-19s │\n" "Success Rate" "$GO_SUCCESS" "$NODE_SUCCESS"
printf "│ %-19s │ %-19s │ %-19s │\n" "Avg Response Time" "$GO_AVG_TIME" "$NODE_AVG_TIME"
printf "│ %-19s │ %19.2f │ %19.2f │\n" "Messages/sec" "$GO_MSG_SEC" "$NODE_MSG_SEC"
printf "│ %-19s │ %19s │ %19s │\n" "Total Messages" "$GO_TOTAL_MSG" "$NODE_TOTAL_MSG"
echo "└─────────────────────┴─────────────────────┴─────────────────────┘"
echo ""

# Performance comparison
if command -v bc &> /dev/null && [ "$GO_MSG_SEC" != "N/A" ] && [ "$NODE_MSG_SEC" != "N/A" ]; then
    # Calculate performance ratio
    GO_INT=$(echo "$GO_MSG_SEC" | cut -d. -f1)
    NODE_INT=$(echo "$NODE_MSG_SEC" | cut -d. -f1)
    
    if [ "$NODE_INT" -gt 0 ]; then
        RATIO=$(echo "scale=2; $GO_INT * 100 / $NODE_INT" | bc)
        echo "📈 Performance Comparison:"
        echo "   Go processes ${RATIO}% relative to Node.js baseline (100%)"
        
        if [ $(echo "$GO_INT > $NODE_INT" | bc) -eq 1 ]; then
            DIFF=$(echo "scale=1; ($GO_INT - $NODE_INT) * 100 / $NODE_INT" | bc)
            echo "   Go is ${DIFF}% faster than Node.js"
        else
            DIFF=$(echo "scale=1; ($NODE_INT - $GO_INT) * 100 / $GO_INT" | bc)
            echo "   Node.js is ${DIFF}% faster than Go"
        fi
    fi
    echo ""
fi

# Test status
echo "📋 Test Status:"
if [ "$GO_RESULT" -eq 0 ] && [ "$NODE_RESULT" -eq 0 ]; then
    echo "   ✅ Both implementations completed successfully"
elif [ "$GO_RESULT" -eq 0 ]; then
    echo "   ✅ Go completed successfully"
    echo "   ❌ Node.js test failed"
elif [ "$NODE_RESULT" -eq 0 ]; then
    echo "   ❌ Go test failed"
    echo "   ✅ Node.js completed successfully"
else
    echo "   ❌ Both tests failed"
fi
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# Offer to view detailed results
echo "📁 Detailed results available in:"
echo "   • Go: horizon-sse-go/test-results.json"
echo "   • Node.js: horizon-sse/test-results.json"
echo ""
echo "To view interactive dashboard, run: ./view-results.sh"
echo ""