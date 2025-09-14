interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

class ClientLogger implements Logger {
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [CLIENT-${level}] ${message}${dataStr}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('ERROR', message, data));
  }

  debug(message: string, data?: any): void {
    console.log(this.formatMessage('DEBUG', message, data));
  }
}

interface SSEClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  logger?: Logger;
}

interface SSEMessage {
  type: string;
  data: any;
  timestamp: string;
}

class SSEClient {
  private config: Required<SSEClientConfig>;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();

  constructor(config: SSEClientConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      logger: new ClientLogger(),
      ...config
    };

    this.config.logger.info('SSE Client initialized', { 
      url: this.config.url,
      reconnectInterval: this.config.reconnectInterval,
      maxReconnectAttempts: this.config.maxReconnectAttempts
    });
  }

  connect(): void {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      this.config.logger.warn('EventSource already exists, closing before reconnecting');
      this.eventSource.close();
    }

    this.config.logger.info(`Attempting to connect to SSE server`, { 
      url: this.config.url,
      attempt: this.reconnectAttempts + 1
    });

    try {
      this.eventSource = new EventSource(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      this.config.logger.error('Failed to create EventSource', { error, url: this.config.url });
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = (event) => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.config.logger.info('SSE connection established successfully', {
        readyState: this.eventSource?.readyState,
        url: this.config.url
      });
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.triggerHandler('connection', { status: 'connected', timestamp: new Date().toISOString() });
    };

    this.eventSource.onerror = (event) => {
      this.isConnected = false;
      this.config.logger.error('SSE connection error', {
        readyState: this.eventSource?.readyState,
        event: event
      });

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.config.logger.warn('SSE connection closed by server');
        this.handleReconnect();
      }

      this.triggerHandler('error', { 
        error: 'Connection error', 
        readyState: this.eventSource?.readyState,
        timestamp: new Date().toISOString()
      });
    };

    this.eventSource.onmessage = (event) => {
      this.config.logger.debug('Received generic message', { data: event.data });
      try {
        const data = JSON.parse(event.data);
        this.triggerHandler('message', data);
      } catch (error) {
        this.config.logger.warn('Failed to parse message data', { data: event.data, error });
      }
    };

    this.setupNamedEventListeners();
  }

  private setupNamedEventListeners(): void {
    const eventTypes = ['connected', 'heartbeat', 'data', 'notification', 'server-shutdown'];
    
    eventTypes.forEach(eventType => {
      this.eventSource?.addEventListener(eventType, (event: any) => {
        this.config.logger.info(`Received ${eventType} event`, { data: event.data });
        
        try {
          const data = JSON.parse(event.data);
          this.triggerHandler(eventType, data);
          
          if (eventType === 'server-shutdown') {
            this.config.logger.warn('Server is shutting down');
            this.disconnect();
          }
        } catch (error) {
          this.config.logger.error(`Failed to parse ${eventType} event data`, { 
            data: event.data, 
            error 
          });
        }
      });
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.config.logger.error('Maximum reconnection attempts reached', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts
      });
      this.triggerHandler('connection', { 
        status: 'failed', 
        reason: 'max_attempts_reached',
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    
    this.config.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts}`, {
      delay,
      maxAttempts: this.config.maxReconnectAttempts
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);

    this.triggerHandler('connection', { 
      status: 'reconnecting', 
      attempt: this.reconnectAttempts,
      delay,
      timestamp: new Date().toISOString()
    });
  }

  on(eventType: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType)!.push(handler);
    this.config.logger.debug(`Registered handler for ${eventType} event`);
  }

  off(eventType: string, handler?: (data: any) => void): void {
    if (!this.messageHandlers.has(eventType)) return;

    if (handler) {
      const handlers = this.messageHandlers.get(eventType)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.config.logger.debug(`Removed specific handler for ${eventType} event`);
      }
    } else {
      this.messageHandlers.delete(eventType);
      this.config.logger.debug(`Removed all handlers for ${eventType} event`);
    }
  }

  private triggerHandler(eventType: string, data: any): void {
    const handlers = this.messageHandlers.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        this.config.logger.error(`Error in ${eventType} event handler`, { error, data });
      }
    });
  }

  disconnect(): void {
    this.config.logger.info('Disconnecting SSE client');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    this.triggerHandler('connection', { 
      status: 'disconnected', 
      timestamp: new Date().toISOString()
    });
    
    this.config.logger.info('SSE client disconnected');
  }

  getConnectionState(): { 
    isConnected: boolean; 
    readyState: number | null; 
    reconnectAttempts: number;
    url: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: this.eventSource?.readyState || null,
      reconnectAttempts: this.reconnectAttempts,
      url: this.config.url
    };
  }
}

export { SSEClient, ClientLogger, type Logger, type SSEClientConfig, type SSEMessage };