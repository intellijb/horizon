import express from 'express';
import { Request, Response } from 'express';
import winston from 'winston';
import crypto from 'crypto';

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
const PORT = process.env.PORT || 10091;

let activeStreams = 0;
let totalStreams = 0;
let completedStreams = 0;

// Calculate prime numbers (CPU-intensive)
function calculatePrimes(limit: number): number[] {
  if (limit < 2) return [];
  
  const sieve = new Array(limit + 1).fill(true);
  sieve[0] = sieve[1] = false;
  
  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) {
        sieve[j] = false;
      }
    }
  }
  
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) primes.push(i);
  }
  return primes;
}

// CPU-intensive work: calculate checksum and do prime calculation
function performCPUWork(data: string): string {
  // Calculate SHA256 hash multiple times for CPU load
  let hash = crypto.createHash('sha256').update(data).digest();
  for (let i = 0; i < 100; i++) {
    hash = crypto.createHash('sha256').update(hash).digest();
  }
  
  // Calculate some primes to add CPU load
  calculatePrimes(1000);
  
  // Do some floating point math
  let result = 0;
  for (let i = 1; i <= 100; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  
  return hash.toString('hex');
}

// Use exactly 109 tokens to match Go
const tokens = [
  "Hello", " there", "!", " I'm", " a", " simulated", " AI", " response",
  " that", " streams", " tokens", " slowly", " over", " time", ".",
  " This", " mimics", " the", " behavior", " of", " real", " AI", " APIs",
  " like", " OpenAI", "'s", " GPT", " models", ".", " Each", " token",
  " represents", " a", " small", " piece", " of", " the", " complete", " response",
  ".", " The", " streaming", " allows", " for", " a", " more", " interactive",
  " experience", " as", " users", " can", " see", " the", " response", " being",
  " generated", " in", " real", "-time", " rather", " than", " waiting", " for",
  " the", " entire", " response", " to", " complete", ".", " This", " test",
  " server", " simulates", " this", " behavior", " by", " sending", " tokens",
  " at", " regular", " intervals", " over", " a", " 10", "-second", " period",
  ".", " The", " proxy", " server", " will", " buffer", " and", " forward",
  " these", " tokens", " to", " connected", " clients", ".",
  " Additional", " tokens", " to", " extend", " streaming", " duration", ".",
  " Testing", " complete", "."
];

app.use(express.json());

app.post('/v1/chat/completions', (req: Request, res: Response) => {
  const streamId = `chatcmpl-${Date.now()}`;
  activeStreams++;
  totalStreams++;

  logger.info('Stream started', { streamId, activeStreams });

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });

  // Stream over 10 seconds
  const streamDuration = 10000; // 10 seconds in milliseconds
  const tokenDelay = streamDuration / tokens.length;
  let tokenIndex = 0;

  const sendToken = () => {
    if (tokenIndex < tokens.length) {
      const token = tokens[tokenIndex];
      
      // Perform CPU-intensive work for each token
      const checksum = performCPUWork(streamId + token + tokenIndex);
      
      const response = {
        id: streamId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4-turbo',
        checksum: checksum,
        choices: [{
          index: 0,
          delta: {
            content: token,
            ...(tokenIndex === 0 ? { role: 'assistant' } : {})
          },
          finish_reason: null
        }]
      };

      res.write(`data: ${JSON.stringify(response)}\n\n`);
      tokenIndex++;
      setTimeout(sendToken, tokenDelay);
    } else {
      // Perform final CPU work
      const finalChecksum = performCPUWork(streamId + 'DONE');
      
      // Send finish message
      const finalResponse = {
        id: streamId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4-turbo',
        checksum: finalChecksum,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };

      res.write(`data: ${JSON.stringify(finalResponse)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      activeStreams--;
      completedStreams++;
      logger.info('Stream completed', { streamId, activeStreams, completedStreams });
    }
  };

  // Start streaming
  sendToken();

  // Handle client disconnect
  req.on('close', () => {
    activeStreams--;
    logger.info('Client disconnected', { streamId, activeStreams });
  });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.json({
    active_streams: activeStreams,
    total_streams: totalStreams,
    completed_streams: completedStreams,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'deep-server' });
});

app.listen(PORT, () => {
  logger.info(`Deep Server (CPU-Intensive) started on port ${PORT}`);
});