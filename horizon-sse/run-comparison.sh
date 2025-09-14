#!/bin/bash

# Wrapper script to run SSE comparison tests from horizon-sse directory
# Usage: ./run-comparison.sh [num_clients] [ramp_up_time]
# Example: ./run-comparison.sh 1000 15s

cd comparison && ./test-both.sh "$@"