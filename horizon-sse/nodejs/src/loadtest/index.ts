import http from 'http';
import fs from 'fs';
import winston from 'winston';
import { performance } from 'perf_hooks';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

interface ClientResult {
  clientId: string;
  success: boolean;
  duration: number;
  messageCount: number;
  error?: string;
}

interface TestConfig {
  url: string;
  numClients: number;
  rampUpTime: number;
}

class SSELoadTester {
  private activeClients = 0;
  private successfulClients = 0;
  private failedClients = 0;
  private totalMessages = 0;

  constructor(private config: TestConfig) {}

  private async connectToSSE(clientId: string): Promise<ClientResult> {
    const startTime = performance.now();
    const result: ClientResult = {
      clientId,
      success: false,
      duration: 0,
      messageCount: 0
    };

    return new Promise((resolve) => {
      this.activeClients++;
      
      const url = new URL(`${this.config.url}/sse?client_id=${clientId}`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 30000 // 30 second timeout
      };

      const req = http.request(options, (res) => {
        if (res.statusCode !== 200) {
          result.error = `HTTP ${res.statusCode}`;
          this.failedClients++;
          this.activeClients--;
          resolve(result);
          return;
        }

        let buffer = '';
        let messageCount = 0;

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              messageCount++;
              this.totalMessages++;

              // Check for completion
              if (line.includes('[DONE]')) {
                result.success = true;
                result.duration = performance.now() - startTime;
                result.messageCount = messageCount;
                this.successfulClients++;
                this.activeClients--;
                logger.info('Client completed successfully', { 
                  clientId, 
                  duration: `${(result.duration / 1000).toFixed(2)}s`,
                  messageCount 
                });
                resolve(result);
                return;
              }
            }
          }
        });

        res.on('end', () => {
          if (!result.success) {
            result.error = 'Stream ended without completion marker';
            result.duration = performance.now() - startTime;
            result.messageCount = messageCount;
            this.failedClients++;
            this.activeClients--;
            logger.warn('Stream ended without [DONE]', { clientId, messageCount });
          }
          resolve(result);
        });

        res.on('error', (err) => {
          result.error = err.message;
          result.duration = performance.now() - startTime;
          this.failedClients++;
          this.activeClients--;
          logger.error('Client failed', { clientId, error: err.message });
          resolve(result);
        });
      });

      req.on('timeout', () => {
        result.error = 'Request timeout';
        result.duration = performance.now() - startTime;
        this.failedClients++;
        this.activeClients--;
        req.destroy();
        logger.error('Client timeout', { clientId });
        resolve(result);
      });

      req.on('error', (err) => {
        result.error = err.message;
        result.duration = performance.now() - startTime;
        this.failedClients++;
        this.activeClients--;
        logger.error('Request error', { clientId, error: err.message });
        resolve(result);
      });

      req.end();
    });
  }

  async runTest(): Promise<void> {
    logger.info('Starting load test', {
      numClients: this.config.numClients,
      rampUpTime: `${this.config.rampUpTime}ms`,
      url: this.config.url
    });

    console.log('');
    console.log('='.repeat(80));
    console.log(`LOAD TEST: ${this.config.numClients} concurrent SSE clients over ${this.config.rampUpTime / 1000}s`);
    console.log(`Server: ${this.config.url}`);
    console.log(`Each client will receive ~100 messages over 10 seconds`);
    console.log('='.repeat(80));
    console.log('');

    const startTime = performance.now();
    const results: ClientResult[] = [];
    const promises: Promise<ClientResult>[] = [];
    const delayBetweenClients = this.config.numClients > 1 
      ? this.config.rampUpTime / (this.config.numClients - 1) 
      : 0;

    // Start monitoring
    const monitorInterval = setInterval(() => {
      this.logMetrics();
    }, 2000);

    // Spawn clients with ramp-up
    for (let i = 0; i < this.config.numClients; i++) {
      const clientId = `client-${i + 1}`;
      const delay = i * delayBetweenClients;

      const promise = new Promise<ClientResult>((resolve) => {
        setTimeout(async () => {
          const result = await this.connectToSSE(clientId);
          results.push(result);
          resolve(result);
        }, delay);
      });

      promises.push(promise);

      // Progress update
      if ((i + 1) % 100 === 0) {
        logger.info('Progress update', {
          spawned: i + 1,
          active: this.activeClients,
          successful: this.successfulClients,
          failed: this.failedClients
        });
      }
    }

    // Wait for all clients to complete
    await Promise.all(promises);
    clearInterval(monitorInterval);

    const totalDuration = performance.now() - startTime;
    this.printResults(results, totalDuration);
    this.saveResults(results, totalDuration);
  }

  private async logMetrics(): Promise<void> {
    try {
      const res = await fetch(`${this.config.url}/metrics`);
      const metrics = await res.json();
      logger.info('Server metrics', { metrics: JSON.stringify(metrics) });
    } catch (err) {
      logger.error('Failed to fetch metrics', { error: err });
    }
  }

  private printResults(results: ClientResult[], totalDuration: number): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / (successful || 1);
    
    const totalMessages = results.reduce((sum, r) => sum + r.messageCount, 0);
    const successRate = (successful / results.length) * 100;

    logger.info('Load test completed', {
      totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
      totalClients: results.length,
      successfulClients: successful,
      failedClients: failed,
      successRate: `${successRate.toFixed(2)}%`,
      avgResponseTime: `${(avgResponseTime / 1000).toFixed(2)}s`,
      totalMessages,
      messagesPerSecond: (totalMessages / (totalDuration / 1000)).toFixed(2),
      requestsPerSecond: (results.length / (totalDuration / 1000)).toFixed(2)
    });
  }

  private async saveResults(results: ClientResult[], totalDuration: number): Promise<void> {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / (successful || 1);
    
    const totalMessages = results.reduce((sum, r) => sum + r.messageCount, 0);
    const successRate = (successful / results.length) * 100;

    // Get final metrics from servers
    let proxyMetrics = {};
    let deepMetrics = {};
    
    try {
      const res = await fetch(`${this.config.url}/metrics`);
      const metrics = await res.json();
      proxyMetrics = metrics;
      deepMetrics = metrics.deep_server || {};
    } catch (err) {
      logger.error('Failed to fetch final metrics', { error: err });
    }

    const errors = results
      .filter(r => !r.success)
      .map(r => ({ client_id: r.clientId, error: r.error }));

    const resultData = {
      timestamp: new Date().toISOString(),
      test_duration: `${(totalDuration / 1000).toFixed(3)}s`,
      summary: {
        total_clients: results.length,
        successful_clients: successful,
        failed_clients: failed,
        success_rate: `${successRate.toFixed(2)}%`,
        avg_response_time: `${(avgResponseTime / 1000).toFixed(3)}s`,
        total_messages: totalMessages,
        messages_per_second: totalMessages / (totalDuration / 1000),
        requests_per_second: results.length / (totalDuration / 1000)
      },
      proxy_metrics: proxyMetrics,
      deep_metrics: deepMetrics,
      errors: errors.length > 0 ? errors : null,
      test_config: {
        num_clients: this.config.numClients,
        server_url: this.config.url
      }
    };

    const jsonData = JSON.stringify(resultData, null, 2);
    fs.writeFileSync('test-results.json', jsonData);
    logger.info('Test results saved to file', { file: 'test-results.json' });
  }
}

// Command line interface
const args = process.argv.slice(2);
let url = 'http://localhost:10090';
let numClients = 100;
let rampUpTime = 10000; // 10 seconds default

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-url':
      url = args[++i];
      break;
    case '-clients':
      numClients = parseInt(args[++i]);
      break;
    case '-rampup':
      const rampupStr = args[++i];
      if (rampupStr.endsWith('s')) {
        rampUpTime = parseFloat(rampupStr) * 1000;
      } else if (rampupStr.endsWith('ms')) {
        rampUpTime = parseFloat(rampupStr);
      } else {
        rampUpTime = parseFloat(rampupStr) * 1000;
      }
      break;
  }
}

const tester = new SSELoadTester({ url, numClients, rampUpTime });
tester.runTest().catch(err => {
  logger.error('Test failed', { error: err });
  process.exit(1);
});