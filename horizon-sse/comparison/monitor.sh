#!/bin/bash

# Monitor Docker container CPU and memory usage
# Usage: ./monitor.sh <output_file> <container_pattern>
# Example: ./monitor.sh go-metrics.csv "horizon-.*-server"

OUTPUT_FILE=${1:-"metrics.csv"}
CONTAINER_PATTERN=${2:-"horizon-"}
INTERVAL=${3:-1}  # Seconds between measurements

echo "📊 Starting resource monitoring..."
echo "   Output: $OUTPUT_FILE"
echo "   Pattern: $CONTAINER_PATTERN"
echo "   Interval: ${INTERVAL}s"
echo ""

# Create header for CSV
echo "timestamp,container,cpu_percent,memory_mb,memory_limit_mb,memory_percent" > "$OUTPUT_FILE"

# Monitor until script is killed
while true; do
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Get stats for all matching containers
    docker stats --no-stream --format "{{.Container}},{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}" | grep "$CONTAINER_PATTERN" | while IFS=',' read -r container_id name cpu_perc mem_usage mem_perc; do
        # Parse memory usage (e.g., "25.53MiB / 512MiB" -> "25.53,512")
        mem_used=$(echo "$mem_usage" | awk '{print $1}' | sed 's/[^0-9.]//g')
        mem_limit=$(echo "$mem_usage" | awk '{print $3}' | sed 's/[^0-9.]//g')
        
        # Convert GiB to MiB if necessary
        if echo "$mem_usage" | grep -q "GiB"; then
            if echo "$mem_usage" | awk '{print $1}' | grep -q "GiB"; then
                mem_used=$(echo "$mem_used * 1024" | bc)
            fi
            if echo "$mem_usage" | awk '{print $3}' | grep -q "GiB"; then
                mem_limit=$(echo "$mem_limit * 1024" | bc)
            fi
        fi
        
        # Remove % from percentages
        cpu_perc=$(echo "$cpu_perc" | sed 's/%//g')
        mem_perc=$(echo "$mem_perc" | sed 's/%//g')
        
        # Write to CSV
        echo "$TIMESTAMP,$name,$cpu_perc,$mem_used,$mem_limit,$mem_perc" >> "$OUTPUT_FILE"
    done
    
    sleep "$INTERVAL"
done