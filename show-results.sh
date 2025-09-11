#!/bin/bash

# Display test results in a clean tabular format
# Usage: ./show-results.sh [go|node|both]

MODE=${1:-both}

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to format numbers with commas
format_number() {
    printf "%'d" $1 2>/dev/null || echo $1
}

# Function to format float numbers
format_float() {
    printf "%'.2f" $1 2>/dev/null || echo $1
}

# Function to display single implementation results
show_single_result() {
    local impl=$1
    local file=$2
    
    if [ ! -f "$file" ]; then
        echo "❌ No results found for $impl at $file"
        return
    fi
    
    # Extract metrics
    local success_rate=$(jq -r '.summary.success_rate' "$file" 2>/dev/null || echo "N/A")
    local total_clients=$(jq -r '.summary.total_clients' "$file" 2>/dev/null || echo "0")
    local successful=$(jq -r '.summary.successful_clients' "$file" 2>/dev/null || echo "0")
    local failed=$(jq -r '.summary.failed_clients' "$file" 2>/dev/null || echo "0")
    local avg_time=$(jq -r '.summary.avg_response_time' "$file" 2>/dev/null || echo "N/A")
    local msg_per_sec=$(jq -r '.summary.messages_per_second' "$file" 2>/dev/null || echo "0")
    local req_per_sec=$(jq -r '.summary.requests_per_second' "$file" 2>/dev/null || echo "0")
    local total_msg=$(jq -r '.summary.total_messages' "$file" 2>/dev/null || echo "0")
    local test_duration=$(jq -r '.test_duration' "$file" 2>/dev/null || echo "N/A")
    
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}                    $impl Results                    ${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}┌─────────────────────────┬──────────────────────────────┐${NC}"
    printf "${BOLD}│ %-23s │ %-28s │${NC}\n" "Metric" "Value"
    echo -e "${BOLD}├─────────────────────────┼──────────────────────────────┤${NC}"
    
    # Success metrics
    if [ "$success_rate" == "100.00%" ]; then
        printf "│ %-23s │ ${GREEN}%-28s${NC} │\n" "Success Rate" "$success_rate ✓"
    else
        printf "│ %-23s │ ${YELLOW}%-28s${NC} │\n" "Success Rate" "$success_rate"
    fi
    
    printf "│ %-23s │ %-28s │\n" "Total Clients" "$(format_number $total_clients)"
    printf "│ %-23s │ ${GREEN}%-28s${NC} │\n" "Successful" "$(format_number $successful)"
    
    if [ "$failed" != "0" ]; then
        printf "│ %-23s │ ${RED}%-28s${NC} │\n" "Failed" "$(format_number $failed)"
    else
        printf "│ %-23s │ %-28s │\n" "Failed" "$(format_number $failed)"
    fi
    
    echo -e "${BOLD}├─────────────────────────┼──────────────────────────────┤${NC}"
    
    # Performance metrics
    printf "│ %-23s │ ${CYAN}%-28s${NC} │\n" "Avg Response Time" "$avg_time"
    printf "│ %-23s │ ${CYAN}%-28.2f${NC} │\n" "Messages/sec" "$msg_per_sec"
    printf "│ %-23s │ %-28.2f │\n" "Requests/sec" "$req_per_sec"
    printf "│ %-23s │ %-28s │\n" "Total Messages" "$(format_number $total_msg)"
    printf "│ %-23s │ %-28s │\n" "Test Duration" "$test_duration"
    
    echo -e "${BOLD}└─────────────────────────┴──────────────────────────────┘${NC}"
    echo ""
}

# Function to display comparison results
show_comparison() {
    local go_file="horizon-sse-go/test-results.json"
    local node_file="horizon-sse/test-results.json"
    
    # Check if comparison-results exist and are newer
    if [ -f "comparison-results/go-test-results.json" ] && [ -f "comparison-results/node-test-results.json" ]; then
        go_file="comparison-results/go-test-results.json"
        node_file="comparison-results/node-test-results.json"
    fi
    
    if [ ! -f "$go_file" ] || [ ! -f "$node_file" ]; then
        echo "❌ Missing result files. Please run tests first."
        echo "   Go file: $go_file"
        echo "   Node file: $node_file"
        exit 1
    fi
    
    # Extract metrics for both
    go_success=$(jq -r '.summary.success_rate' "$go_file" 2>/dev/null || echo "N/A")
    node_success=$(jq -r '.summary.success_rate' "$node_file" 2>/dev/null || echo "N/A")
    
    go_clients=$(jq -r '.summary.total_clients' "$go_file" 2>/dev/null || echo "0")
    node_clients=$(jq -r '.summary.total_clients' "$node_file" 2>/dev/null || echo "0")
    
    go_avg_time=$(jq -r '.summary.avg_response_time' "$go_file" 2>/dev/null || echo "N/A")
    node_avg_time=$(jq -r '.summary.avg_response_time' "$node_file" 2>/dev/null || echo "N/A")
    
    go_msg_sec=$(jq -r '.summary.messages_per_second' "$go_file" 2>/dev/null || echo "0")
    node_msg_sec=$(jq -r '.summary.messages_per_second' "$node_file" 2>/dev/null || echo "0")
    
    go_req_sec=$(jq -r '.summary.requests_per_second' "$go_file" 2>/dev/null || echo "0")
    node_req_sec=$(jq -r '.summary.requests_per_second' "$node_file" 2>/dev/null || echo "0")
    
    go_total_msg=$(jq -r '.summary.total_messages' "$go_file" 2>/dev/null || echo "0")
    node_total_msg=$(jq -r '.summary.total_messages' "$node_file" 2>/dev/null || echo "0")
    
    go_duration=$(jq -r '.test_duration' "$go_file" 2>/dev/null || echo "N/A")
    node_duration=$(jq -r '.test_duration' "$node_file" 2>/dev/null || echo "N/A")
    
    # Try to get resource metrics from comparison report
    local report_file="comparison-results/comparison-report.json"
    if [ -f "$report_file" ]; then
        go_cpu_avg=$(jq -r '.resources.go.aggregate.cpu.avg' "$report_file" 2>/dev/null || echo "N/A")
        go_cpu_max=$(jq -r '.resources.go.aggregate.cpu.max' "$report_file" 2>/dev/null || echo "N/A")
        go_mem_avg=$(jq -r '.resources.go.aggregate.memory.avg' "$report_file" 2>/dev/null || echo "N/A")
        go_mem_max=$(jq -r '.resources.go.aggregate.memory.max' "$report_file" 2>/dev/null || echo "N/A")
        
        node_cpu_avg=$(jq -r '.resources.node.aggregate.cpu.avg' "$report_file" 2>/dev/null || echo "N/A")
        node_cpu_max=$(jq -r '.resources.node.aggregate.cpu.max' "$report_file" 2>/dev/null || echo "N/A")
        node_mem_avg=$(jq -r '.resources.node.aggregate.memory.avg' "$report_file" 2>/dev/null || echo "N/A")
        node_mem_max=$(jq -r '.resources.node.aggregate.memory.max' "$report_file" 2>/dev/null || echo "N/A")
    else
        go_cpu_avg="N/A"
        go_cpu_max="N/A"
        go_mem_avg="N/A"
        go_mem_max="N/A"
        node_cpu_avg="N/A"
        node_cpu_max="N/A"
        node_mem_avg="N/A"
        node_mem_max="N/A"
    fi
    
    # Header
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}                     SSE Performance Comparison                           ${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Main comparison table
    echo -e "${BOLD}┌───────────────────────┬─────────────────────┬─────────────────────┐${NC}"
    printf "${BOLD}│ %-21s │ ${BLUE}%-19s${NC} │ ${GREEN}%-19s${NC} │\n" "Metric" "Go Server" "Node.js Server"
    echo -e "${BOLD}├───────────────────────┼─────────────────────┼─────────────────────┤${NC}"
    
    # Client metrics
    printf "│ %-21s │ %19s │ %19s │\n" "Total Clients" "$(format_number $go_clients)" "$(format_number $node_clients)"
    
    # Success rate with color coding
    if [ "$go_success" == "100.00%" ]; then
        go_success_display="${GREEN}$go_success ✓${NC}"
    else
        go_success_display="${YELLOW}$go_success${NC}"
    fi
    
    if [ "$node_success" == "100.00%" ]; then
        node_success_display="${GREEN}$node_success ✓${NC}"
    else
        node_success_display="${YELLOW}$node_success${NC}"
    fi
    
    printf "│ %-21s │ %30b │ %30b │\n" "Success Rate" "$go_success_display" "$node_success_display"
    
    echo -e "${BOLD}├───────────────────────┼─────────────────────┼─────────────────────┤${NC}"
    
    # Performance metrics
    printf "│ %-21s │ %19s │ %19s │\n" "Avg Response Time" "$go_avg_time" "$node_avg_time"
    printf "│ %-21s │ %19.2f │ %19.2f │\n" "Messages/sec" "$go_msg_sec" "$node_msg_sec"
    printf "│ %-21s │ %19.2f │ %19.2f │\n" "Requests/sec" "$go_req_sec" "$node_req_sec"
    printf "│ %-21s │ %19s │ %19s │\n" "Total Messages" "$(format_number $go_total_msg)" "$(format_number $node_total_msg)"
    printf "│ %-21s │ %19s │ %19s │\n" "Test Duration" "$go_duration" "$node_duration"
    
    echo -e "${BOLD}└───────────────────────┴─────────────────────┴─────────────────────┘${NC}"
    echo ""
    
    # Resource Usage Table
    echo -e "${BOLD}${YELLOW}Resource Usage${NC}"
    echo -e "${BOLD}┌───────────────────────┬─────────────────────┬─────────────────────┐${NC}"
    printf "${BOLD}│ %-21s │ ${BLUE}%-19s${NC} │ ${GREEN}%-19s${NC} │\n" "Metric" "Go Server" "Node.js Server"
    echo -e "${BOLD}├───────────────────────┼─────────────────────┼─────────────────────┤${NC}"
    
    # CPU metrics
    if [ "$go_cpu_avg" != "N/A" ]; then
        printf "│ %-21s │ %18.2f%% │ %18.2f%% │\n" "CPU Average" "$go_cpu_avg" "$node_cpu_avg"
        printf "│ %-21s │ %18.2f%% │ %18.2f%% │\n" "CPU Peak" "$go_cpu_max" "$node_cpu_max"
    else
        printf "│ %-21s │ %19s │ %19s │\n" "CPU Average" "N/A" "N/A"
        printf "│ %-21s │ %19s │ %19s │\n" "CPU Peak" "N/A" "N/A"
    fi
    
    echo -e "${BOLD}├───────────────────────┼─────────────────────┼─────────────────────┤${NC}"
    
    # Memory metrics
    if [ "$go_mem_avg" != "N/A" ]; then
        printf "│ %-21s │ %17.1f MB │ %17.1f MB │\n" "Memory Average" "$go_mem_avg" "$node_mem_avg"
        printf "│ %-21s │ %17.1f MB │ %17.1f MB │\n" "Memory Peak" "$go_mem_max" "$node_mem_max"
    else
        printf "│ %-21s │ %19s │ %19s │\n" "Memory Average" "N/A" "N/A"
        printf "│ %-21s │ %19s │ %19s │\n" "Memory Peak" "N/A" "N/A"
    fi
    
    echo -e "${BOLD}└───────────────────────┴─────────────────────┴─────────────────────┘${NC}"
    echo ""
    
    # Performance analysis
    if command -v bc &> /dev/null; then
        go_msg_int=$(echo "$go_msg_sec" | cut -d. -f1)
        node_msg_int=$(echo "$node_msg_sec" | cut -d. -f1)
        
        if [ "$node_msg_int" -gt 0 ] && [ "$go_msg_int" -gt 0 ]; then
            echo -e "${BOLD}${YELLOW}📊 Performance Analysis${NC}"
            echo -e "${BOLD}───────────────────────────────────────────────────────────────${NC}"
            
            # Calculate ratio
            ratio=$(echo "scale=2; $go_msg_int * 100 / $node_msg_int" | bc)
            
            # Determine winner and difference
            if [ $(echo "$go_msg_int > $node_msg_int" | bc) -eq 1 ]; then
                diff=$(echo "scale=1; ($go_msg_int - $node_msg_int) * 100 / $node_msg_int" | bc)
                winner="Go"
                winner_color=$BLUE
                echo -e "🏆 Winner: ${winner_color}${BOLD}$winner${NC}"
                echo -e "📈 Performance: ${winner_color}Go is ${diff}% faster${NC}"
                echo -e "📊 Throughput: Go processes ${ratio}% relative to Node.js (100%)"
            elif [ $(echo "$node_msg_int > $go_msg_int" | bc) -eq 1 ]; then
                diff=$(echo "scale=1; ($node_msg_int - $go_msg_int) * 100 / $go_msg_int" | bc)
                winner="Node.js"
                winner_color=$GREEN
                echo -e "🏆 Winner: ${winner_color}${BOLD}$winner${NC}"
                echo -e "📈 Performance: ${winner_color}Node.js is ${diff}% faster${NC}"
                echo -e "📊 Throughput: Go processes ${ratio}% relative to Node.js (100%)"
            else
                echo -e "🤝 ${YELLOW}Both implementations performed equally${NC}"
            fi
            
            # Messages per second comparison
            echo ""
            echo -e "${BOLD}Message Processing Rate:${NC}"
            printf "  Go:      %'15.0f msg/sec\n" "$go_msg_sec"
            printf "  Node.js: %'15.0f msg/sec\n" "$node_msg_sec"
            
            # Resource efficiency analysis
            if [ "$go_cpu_avg" != "N/A" ] && [ "$node_cpu_avg" != "N/A" ]; then
                echo ""
                echo -e "${BOLD}Resource Efficiency:${NC}"
                
                # Messages per CPU percent
                go_msg_per_cpu=$(echo "scale=2; $go_msg_sec / $go_cpu_avg" | bc 2>/dev/null || echo "N/A")
                node_msg_per_cpu=$(echo "scale=2; $node_msg_sec / $node_cpu_avg" | bc 2>/dev/null || echo "N/A")
                
                if [ "$go_msg_per_cpu" != "N/A" ] && [ "$node_msg_per_cpu" != "N/A" ]; then
                    printf "  Messages per CPU%%:\n"
                    printf "    Go:      %'12.1f msg/CPU%%\n" "$go_msg_per_cpu"
                    printf "    Node.js: %'12.1f msg/CPU%%\n" "$node_msg_per_cpu"
                fi
                
                # Messages per MB of memory
                go_msg_per_mb=$(echo "scale=2; $go_msg_sec / $go_mem_avg" | bc 2>/dev/null || echo "N/A")
                node_msg_per_mb=$(echo "scale=2; $node_msg_sec / $node_mem_avg" | bc 2>/dev/null || echo "N/A")
                
                if [ "$go_msg_per_mb" != "N/A" ] && [ "$node_msg_per_mb" != "N/A" ]; then
                    printf "  Messages per MB:\n"
                    printf "    Go:      %'12.1f msg/MB\n" "$go_msg_per_mb"
                    printf "    Node.js: %'12.1f msg/MB\n" "$node_msg_per_mb"
                fi
                
                # Efficiency winner
                echo ""
                echo -e "${BOLD}Efficiency Analysis:${NC}"
                
                # CPU efficiency comparison
                if [ "$go_msg_per_cpu" != "N/A" ] && [ "$node_msg_per_cpu" != "N/A" ]; then
                    cpu_eff_ratio=$(echo "scale=2; $node_msg_per_cpu / $go_msg_per_cpu * 100" | bc 2>/dev/null || echo "0")
                    if (( $(echo "$node_msg_per_cpu > $go_msg_per_cpu" | bc -l) )); then
                        echo -e "  🔋 CPU Efficiency: ${GREEN}Node.js is more CPU-efficient${NC}"
                        echo "     Node.js processes $(echo "scale=1; $node_msg_per_cpu / $go_msg_per_cpu" | bc)x more messages per CPU%"
                    else
                        echo -e "  🔋 CPU Efficiency: ${BLUE}Go is more CPU-efficient${NC}"
                        echo "     Go processes $(echo "scale=1; $go_msg_per_cpu / $node_msg_per_cpu" | bc)x more messages per CPU%"
                    fi
                fi
                
                # Memory efficiency comparison
                if [ "$go_msg_per_mb" != "N/A" ] && [ "$node_msg_per_mb" != "N/A" ]; then
                    if (( $(echo "$node_msg_per_mb > $go_msg_per_mb" | bc -l) )); then
                        echo -e "  💾 Memory Efficiency: ${GREEN}Node.js is more memory-efficient${NC}"
                        echo "     Node.js processes $(echo "scale=1; $node_msg_per_mb / $go_msg_per_mb" | bc)x more messages per MB"
                    else
                        echo -e "  💾 Memory Efficiency: ${BLUE}Go is more memory-efficient${NC}"
                        echo "     Go processes $(echo "scale=1; $go_msg_per_mb / $node_msg_per_mb" | bc)x more messages per MB"
                    fi
                fi
            fi
        fi
    fi
    echo ""
}

# Main execution
clear
echo ""

case $MODE in
    go)
        show_single_result "Go Server" "horizon-sse-go/test-results.json"
        ;;
    node)
        show_single_result "Node.js Server" "horizon-sse/test-results.json"
        ;;
    both|*)
        show_comparison
        ;;
esac

# Footer
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Generated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""