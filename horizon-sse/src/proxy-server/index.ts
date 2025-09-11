import express from 'express';
import { Request, Response } from 'express';
import winston from 'winston';
import http from 'http';

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

const app = express();
const PORT = process.env.PORT || 10090;
const DEEP_SERVER_URL = process.env.DEEP_SERVER || 'http://localhost:10091';

let activeConnections = 0;
let totalConnections = 0;
let proxiedMessages = 0;
let failedConnections = 0;

app.use(express.json());

app.get('/sse', (req: Request, res: Response) => {
  const clientId = req.query.client_id || `proxy-client-${Date.now()}`;
  
  activeConnections++;
  totalConnections++;

  logger.info('Client connected to proxy', { clientId, activeConnections });

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });

  // Create request to deep server
  const requestBody = JSON.stringify({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: 'Generate test response' }],
    stream: true
  });

  const options = {
    hostname: new URL(DEEP_SERVER_URL).hostname,
    port: new URL(DEEP_SERVER_URL).port,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    }
  };

  const deepReq = http.request(options, (deepRes) => {
    if (deepRes.statusCode !== 200) {
      logger.error('Deep server returned error', { status: deepRes.statusCode });
      res.status(502).end();
      activeConnections--;
      failedConnections++;
      return;
    }

    let buffer = '';
    
    deepRes.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            res.write(line + '\n');
            
            if (line.startsWith('data:') && !line.includes('[DONE]')) {
              proxiedMessages++;
            }
            
            // Check if stream is complete
            if (line === 'data: [DONE]') {
              res.write('\n');
              res.end();
              activeConnections--;
              logger.info('Proxy stream completed', { clientId, messageCount: proxiedMessages });
              return;
            }
          } catch (err) {
            logger.error('Failed to write to client', { clientId, error: err });
            activeConnections--;
            failedConnections++;
            return;
          }
        }
      }
    });

    deepRes.on('end', () => {
      if (buffer.trim()) {
        res.write(buffer + '\n\n');
      }
      res.end();
      activeConnections--;
    });

    deepRes.on('error', (err) => {
      logger.error('Deep server connection error', { error: err });
      res.status(502).end();
      activeConnections--;
      failedConnections++;
    });
  });

  deepReq.on('error', (err) => {
    logger.error('Failed to connect to deep server', { error: err });
    res.status(502).end();
    activeConnections--;
    failedConnections++;
  });

  deepReq.write(requestBody);
  deepReq.end();

  // Handle client disconnect
  req.on('close', () => {
    activeConnections--;
    logger.info('Client disconnected from proxy', { clientId, activeConnections });
  });
});

app.get('/metrics', async (req: Request, res: Response) => {
  // Get deep server metrics
  let deepMetrics = {};
  try {
    const deepRes = await fetch(`${DEEP_SERVER_URL}/metrics`);
    deepMetrics = await deepRes.json();
  } catch (err) {
    logger.error('Failed to fetch deep server metrics', { error: err });
  }

  res.json({
    proxy: {
      active_connections: activeConnections,
      total_connections: totalConnections,
      proxied_messages: proxiedMessages,
      failed_connections: failedConnections
    },
    deep_server: deepMetrics,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'proxy-server' });
});

app.listen(PORT, () => {
  logger.info(`SSE Proxy Server started on port ${PORT}`, { deepServer: DEEP_SERVER_URL });
});