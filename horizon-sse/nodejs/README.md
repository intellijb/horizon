# Horizon SSE Battle Testing (Node.js)

A comprehensive Server-Sent Events (SSE) load testing system for Node.js, designed to stress-test SSE server implementations with thousands of concurrent connections.

## Architecture

This system implements a three-tier architecture:

1. **Deep Server** (Port 10081) - Simulates slow API responses like OpenAI, streaming tokens over 10 seconds
2. **Proxy Server** (Port 10080) - SSE proxy that buffers and forwards streams from deep server to clients
3. **Load Test Client** - Spawns concurrent SSE connections with configurable ramp-up time

## Quick Start

```bash
# Run test with 1000 clients ramping up over 15 seconds
./run.sh 1000 15s

# Run with custom parameters
./run.sh 500 10s

# Run with defaults (1000 clients, 15s ramp-up)
./run.sh
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (optional, for containerized testing)

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Usage

### Using Docker (Recommended)

```bash
# Start all services and run test
./run.sh 1000 15s

# View metrics during test
curl http://localhost:10080/metrics  # Proxy metrics
curl http://localhost:10081/metrics  # Deep server metrics

# Stop services after test
docker-compose down
```

### Using Native Node.js

```bash
# The run.sh script will automatically use Node.js if Docker is not available
./run.sh 100 5s

# Or manually:
npm run start:deep &      # Start deep server
npm run start:proxy &     # Start proxy server
npm run start:loadtest -- -url http://localhost:10080 -clients 100 -rampup 5s
```

## Development

```bash
# Run individual services in development
npm run dev:deep      # Deep server with hot reload
npm run dev:proxy     # Proxy server with hot reload
npm run dev:loadtest  # Load test client

# Build TypeScript
npm run build

# Clean build artifacts
npm run clean
```

## Test Results

After each test run, results are saved to `test-results.json`:

```json
{
  "timestamp": "2025-09-11T10:00:00Z",
  "test_duration": "26.068s",
  "summary": {
    "total_clients": 1000,
    "successful_clients": 1000,
    "failed_clients": 0,
    "success_rate": "100.00%",
    "avg_response_time": "10.229s",
    "total_messages": 165000,
    "messages_per_second": 6329.51,
    "requests_per_second": 38.36
  },
  "proxy_metrics": { ... },
  "deep_metrics": { ... }
}
```

## Performance Metrics

The system tracks:
- **Active Connections**: Current number of active SSE connections
- **Total Connections**: Total connections since server start
- **Proxied Messages**: Number of messages forwarded by proxy
- **Failed Connections**: Number of failed connection attempts
- **Average Response Time**: Average time for complete SSE stream
- **Messages per Second**: Throughput of SSE messages
- **Success Rate**: Percentage of successful connections

## Configuration

### Environment Variables

- `PORT`: Server port (default: 10080 for proxy, 10081 for deep)
- `DEEP_SERVER`: Deep server URL for proxy (default: http://localhost:10081)

### Docker Resource Limits

Each service is limited to:
- CPU: 2 cores
- Memory: 512MB

Adjust in `docker-compose.yml` as needed.

## Comparison with Go Version

This Node.js implementation mirrors the Go SSE testing system architecture, allowing for:
- Direct performance comparison between Node.js and Go
- Same testing methodology and metrics
- Identical three-tier architecture
- Compatible test result format

## Troubleshooting

### Timeout Issues
If experiencing timeouts with high client counts:
- Increase the timeout in the load test client
- Ensure sufficient system resources
- Check Docker resource limits

### Port Conflicts
Ensure ports 10080 and 10081 are available:
```bash
lsof -i :10080
lsof -i :10081
```

### Memory Issues
For tests with 1000+ clients, ensure Docker has sufficient memory allocated.

## License

MIT