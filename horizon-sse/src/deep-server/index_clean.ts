import express from 'express';
import { Request, Response } from 'express';
import winston from 'winston';

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

// EXACTLY 109 tokens to match Go
const tokens: string[] = [];
for (let i = 0; i < 109; i++) {
  tokens.push(`Token_${i} `);
}

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

  // Stream over 10 seconds with exactly 109 tokens
  const streamDuration = 10000; // 10 seconds in milliseconds
  const tokenDelay = streamDuration / tokens.length;
  let tokenIndex = 0;

  const sendToken = () => {
    if (tokenIndex < tokens.length) {
      const response = {
        id: streamId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4',
        choices: [{
          index: 0,
          delta: {
            content: tokens[tokenIndex],
            ...(tokenIndex === 0 ? { role: 'assistant' } : {})
          },
          finish_reason: null
        }]
      };

      res.write(`data: ${JSON.stringify(response)}\n\n`);
      tokenIndex++;
      setTimeout(sendToken, tokenDelay);
    } else {
      // Send finish message
      const finalResponse = {
        id: streamId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4',
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
  logger.info(`Deep Server (Clean - 109 tokens) started on port ${PORT}`);
});