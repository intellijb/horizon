# Horizon SSE Battle Test System

A comprehensive 3-tier SSE testing system simulating real-world streaming architecture with deep server (OpenAI-like), proxy server, and battle-testing client.

## 🚀 Quick Start - Single Command

```bash
# Run complete battle test with 1000 clients
./run.sh

# Or specify custom parameters
./run.sh 2000 20s  # 2000 clients, 20s ramp-up
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Deep Server │────▶│ Proxy Server │────▶│   Clients    │
│  (OpenAI)   │     │  (SSE Proxy) │     │ (1000+ conc) │
└─────────────┘     └──────────────┘     └──────────────┘
   Port 10081          Port 10080         Battle Testing
   10s streams         Buffering          Metrics & Load
```

### Components

1. **Deep Server** (Port 10081)
   - Simulates OpenAI-like API with 10-second streaming responses
   - Token-by-token streaming
   - JSON SSE format

2. **Proxy Server** (Port 10080)
   - SSE proxy without context awareness
   - Buffers and forwards deep server responses
   - Handles connection management
   - Real-time metrics

3. **Load Test Client**
   - Concurrent battle testing (1000+ clients)
   - Configurable ramp-up time
   - Comprehensive metrics collection

## 🔧 Installation Options

### Option 1: Native Go (Recommended)
```bash
cd horizon-sse-go
go mod download
./run.sh
```

### Option 2: Docker Compose
```bash
cd horizon-sse-go
docker-compose up -d deep-server proxy-server
docker-compose run loadtest
```

### Option 3: Manual Control
```bash
# Terminal 1 - Deep Server
go run cmd/deep-server/main.go

# Terminal 2 - Proxy Server
go run cmd/proxy-server/main.go

# Terminal 3 - Load Test
go run cmd/loadtest/main.go -clients 1000 -rampup 15s
```

## 📊 Real-time Metrics

The system provides comprehensive metrics including:
- **CPU Usage**: Real-time CPU utilization
- **Memory Usage**: Heap and system memory
- **Active Connections**: Current SSE connections
- **Message Throughput**: Messages per second
- **Success/Failure Rates**: Connection statistics

### Viewing Metrics

During test:
- Automatic console output with live metrics
- Proxy metrics: `http://localhost:10080/metrics`
- Deep server metrics: `http://localhost:10081/metrics`

## 🎯 Load Test Scenarios

### Light Load (100 clients)
```bash
./run.sh 100 5s
```

### Medium Load (500 clients)
```bash
./run.sh 500 10s
```

### Heavy Load (1000 clients - default)
```bash
./run.sh 1000 15s
```

### Extreme Load (2000+ clients)
```bash
./run.sh 2000 30s
```

## 📈 Performance Expectations

| Metric | Expected Value |
|--------|---------------|
| Concurrent Connections | 1000+ |
| Stream Duration | 10 seconds |
| Message Rate | 100 msg/client |
| Total Messages/sec | 10,000+ |
| Memory Usage | <200MB |
| CPU Usage | <50% (4 cores) |
| Success Rate | >99% |

## 🐳 Docker Deployment

### Basic Services
```bash
docker-compose up
```

### With Monitoring Stack
```bash
docker-compose --profile monitoring up
```

This includes:
- Prometheus (port 10090)
- Grafana (port 10030, admin/admin)
- cAdvisor (port 10082)

## 🛠 Advanced Configuration

### Deep Server Options
```bash
go run cmd/deep-server/main.go -port 10081
```

### Proxy Server Options
```bash
go run cmd/proxy-server/main.go \
  -port 10080 \
  -deep-server http://localhost:10081
```

### Load Test Options
```bash
go run cmd/loadtest/main.go \
  -url http://localhost:10080 \
  -clients 1000 \
  -rampup 15s \
  -monitor 2s
```

## 📝 Logs

All services generate detailed logs in `./logs/`:
- `deep-server.log` - Deep server operations
- `proxy-server.log` - Proxy operations
- Console output - Real-time metrics and results

## 🧪 Testing Methodology

The battle test simulates real-world conditions:
1. **Gradual ramp-up**: Clients connect over specified duration
2. **Sustained load**: All clients maintain connections
3. **10-second streams**: Each client receives full stream
4. **Metrics collection**: Continuous monitoring throughout
5. **Graceful shutdown**: Clean connection termination

## 🚨 Troubleshooting

### Port Already in Use
```bash
lsof -i:10080  # Check what's using the port
kill -9 [PID]  # Kill the process
```

### Out of Memory
Increase Docker memory limits or system resources

### Connection Refused
Ensure all services are running and healthy:
```bash
curl http://localhost:10080/health
curl http://localhost:10081/health
```

## 📊 Results Interpretation

Success indicators:
- ✅ 99%+ success rate
- ✅ All streams complete in ~10 seconds
- ✅ Memory remains stable
- ✅ No error logs

Performance bottlenecks:
- ❌ High failure rate → Network/resource limits
- ❌ Increasing memory → Memory leak
- ❌ Slow streams → CPU bottleneck
- ❌ Connection errors → File descriptor limits