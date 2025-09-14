import express from 'express';
import cors from 'cors';
import winston from 'winston';
import { Request, Response } from 'express';

interface SSEClient {
  id: string;
  response: Response;
  connectedAt: Date;
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const clients: Map<string, SSEClient> = new Map();

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sendEventToClient(client: SSEClient, event: string, data: any): void {
  try {
    const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    client.response.write(eventData);
    logger.debug(`Sent ${event} event to client ${client.id}`, { data });
  } catch (error) {
    logger.error(`Failed to send event to client ${client.id}:`, error);
    clients.delete(client.id);
  }
}

function broadcastToAllClients(event: string, data: any): void {
  logger.info(`Broadcasting ${event} to ${clients.size} clients`, { data });
  
  const disconnectedClients: string[] = [];
  
  for (const [clientId, client] of clients) {
    try {
      sendEventToClient(client, event, data);
    } catch (error) {
      logger.warn(`Client ${clientId} disconnected during broadcast`);
      disconnectedClients.push(clientId);
    }
  }
  
  disconnectedClients.forEach(clientId => clients.delete(clientId));
}

app.get('/events', (req: Request, res: Response) => {
  const clientId = generateClientId();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  logger.info(`New SSE connection from ${clientIP}`, { 
    clientId, 
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const client: SSEClient = {
    id: clientId,
    response: res,
    connectedAt: new Date()
  };

  clients.set(clientId, client);

  sendEventToClient(client, 'connected', {
    clientId,
    message: 'Connected to SSE server',
    timestamp: new Date().toISOString()
  });

  logger.info(`Client ${clientId} added to active connections. Total clients: ${clients.size}`);

  req.on('close', () => {
    logger.info(`Client ${clientId} disconnected. Connection duration: ${Date.now() - client.connectedAt.getTime()}ms`);
    clients.delete(clientId);
    logger.info(`Total active clients: ${clients.size}`);
  });

  req.on('error', (error) => {
    logger.error(`Error with client ${clientId}:`, error);
    clients.delete(clientId);
  });
});

app.get('/status', (req: Request, res: Response) => {
  const status = {
    server: 'running',
    connectedClients: clients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  
  logger.info('Status endpoint accessed', status);
  res.json(status);
});

app.post('/broadcast', (req: Request, res: Response) => {
  const { event = 'message', data } = req.body;
  
  if (!data) {
    logger.warn('Broadcast attempt without data', { body: req.body });
    return res.status(400).json({ error: 'Data is required' });
  }
  
  logger.info(`Manual broadcast requested`, { event, data });
  broadcastToAllClients(event, data);
  
  res.json({ 
    success: true, 
    clientsNotified: clients.size,
    event,
    data 
  });
});

let messageCounter = 0;
const heartbeatInterval = setInterval(() => {
  if (clients.size > 0) {
    broadcastToAllClients('heartbeat', {
      timestamp: new Date().toISOString(),
      clientCount: clients.size,
      serverUptime: Math.floor(process.uptime())
    });
  }
}, 10000);

const dataInterval = setInterval(() => {
  if (clients.size > 0) {
    messageCounter++;
    broadcastToAllClients('data', {
      id: messageCounter,
      message: `Server message #${messageCounter}`,
      timestamp: new Date().toISOString(),
      randomValue: Math.floor(Math.random() * 1000)
    });
  }
}, 5000);

const notificationInterval = setInterval(() => {
  if (clients.size > 0 && Math.random() > 0.7) {
    broadcastToAllClients('notification', {
      type: 'info',
      title: 'Random Notification',
      message: 'This is a random notification from the server',
      timestamp: new Date().toISOString()
    });
  }
}, 15000);

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  broadcastToAllClients('server-shutdown', {
    message: 'Server is shutting down',
    timestamp: new Date().toISOString()
  });
  
  clearInterval(heartbeatInterval);
  clearInterval(dataInterval);
  clearInterval(notificationInterval);
  
  for (const [clientId, client] of clients) {
    try {
      client.response.end();
      logger.info(`Closed connection for client ${clientId}`);
    } catch (error) {
      logger.error(`Error closing connection for client ${clientId}:`, error);
    }
  }
  
  clients.clear();
  logger.info('All connections closed. Exiting...');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`SSE Server started on port ${PORT}`);
  logger.info(`Status endpoint: http://localhost:${PORT}/status`);
  logger.info(`SSE endpoint: http://localhost:${PORT}/events`);
  logger.info(`Broadcast endpoint: http://localhost:${PORT}/broadcast`);
});