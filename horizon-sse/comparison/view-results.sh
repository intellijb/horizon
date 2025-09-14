#!/bin/bash

# Script to view comparison results in browser

echo "📊 Starting SSE Comparison Dashboard Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to view results."
    exit 1
fi

# Start the server
node serve-results.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 1

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "http://localhost:8080/comparison.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8080/comparison.html"
    elif command -v gnome-open &> /dev/null; then
        gnome-open "http://localhost:8080/comparison.html"
    else
        echo "Please open http://localhost:8080/comparison.html in your browser"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    start "http://localhost:8080/comparison.html"
else
    echo "Please open http://localhost:8080/comparison.html in your browser"
fi

# Keep server running
echo ""
echo "Dashboard is running at: http://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo ""

# Wait for user to stop
wait $SERVER_PID