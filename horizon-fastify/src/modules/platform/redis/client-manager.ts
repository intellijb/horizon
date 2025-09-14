import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { retryWithBackoff, ExponentialBackoff } from '@modules/shared/utils/retry';
import { ConnectionState } from '@modules/platform/connection';
import { RedisManagerOptions, RedisMetrics } from './types';

export type { RedisManagerOptions, RedisMetrics } from './types';

export class RedisClientManager extends EventEmitter {
  private static instance: RedisClientManager | null = null;
  private client: Redis | null = null;
  private metrics: RedisMetrics;
  private backoff: ExponentialBackoff;
  private isReconnecting: boolean = false;
  private readonly options: RedisManagerOptions;
  
  constructor(options: RedisManagerOptions) {
    super();
    this.options = {
      ...options,
      retryStrategy: this.createRetryStrategy(),
      reconnectOnError: this.shouldReconnectOnError,
      enableOfflineQueue: options.enableOfflineQueue !== false,
      lazyConnect: false,
      showFriendlyErrorStack: true,
    };
    
    this.metrics = {
      reconnectAttempts: 0,
      commandQueueLength: 0,
      offlineQueueLength: 0,
      lastError: null,
      lastErrorTime: null,
      status: 'disconnected',
    };
    
    this.backoff = new ExponentialBackoff(
      options.maxRetryAttempts || 5,
      options.retryDelay || 1000,
      30000
    );
  }
  
  static getInstance(options?: RedisManagerOptions): RedisClientManager {
    if (!RedisClientManager.instance) {
      if (!options) {
        throw new Error('Options required for first initialization');
      }
      RedisClientManager.instance = new RedisClientManager(options);
    }
    return RedisClientManager.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.client) {
      return; // Already initialized
    }
    
    this.client = new Redis(this.options);
    this.setupEventListeners();
    
    // Test initial connection with retry
    await this.testConnection();
  }
  
  private createRetryStrategy() {
    return (times: number) => {
      this.metrics.reconnectAttempts = times;
      
      if (times > 10) {
        this.emit('maxRetriesExceeded');
        return null; // Stop retrying
      }
      
      const delay = Math.min(times * 1000, 30000);
      this.emit('retryAttempt', { attempt: times, delay });
      return delay;
    };
  }
  
  private shouldReconnectOnError(err: Error): boolean {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
    return targetErrors.some(e => err.message.includes(e));
  }
  
  private setupEventListeners(): void {
    if (!this.client) return;
    
    this.client.on('connect', () => {
      this.metrics.status = 'connecting';
      this.isReconnecting = false;
      this.emit('connect');
      this.emit('stateChange', ConnectionState.CONNECTING);
    });
    
    this.client.on('ready', () => {
      this.metrics.status = 'ready';
      this.metrics.reconnectAttempts = 0;
      this.backoff.reset();
      this.emit('ready');
      this.emit('stateChange', ConnectionState.CONNECTED);
    });
    
    this.client.on('error', (error: Error) => {
      this.metrics.lastError = error;
      this.metrics.lastErrorTime = new Date();
      this.metrics.status = 'error';
      this.emit('error', error);
      this.emit('stateChange', ConnectionState.ERROR);
    });
    
    this.client.on('close', () => {
      this.metrics.status = 'closed';
      if (!this.isReconnecting) {
        this.emit('close');
        this.emit('stateChange', ConnectionState.DISCONNECTED);
      }
    });
    
    this.client.on('reconnecting', (delay: number) => {
      if (!this.isReconnecting) {
        this.isReconnecting = true;
        this.metrics.status = 'reconnecting';
        this.emit('stateChange', ConnectionState.RECONNECTING);
      }
      this.emit('reconnecting', delay);
    });
    
    this.client.on('end', () => {
      this.metrics.status = 'ended';
      this.emit('end');
      this.emit('stateChange', ConnectionState.DISCONNECTED);
    });
  }
  
  private async testConnection(): Promise<void> {
    await retryWithBackoff(
      async () => {
        if (!this.client) {
          throw new Error('Redis client not initialized');
        }
        
        const pong = await this.client.ping();
        if (pong !== 'PONG') {
          throw new Error('Unexpected Redis ping response');
        }
      },
      {
        maxAttempts: this.options.maxRetryAttempts || 5,
        initialDelay: this.options.retryDelay || 1000,
        maxDelay: 10000,
        onRetry: (attempt, error) => {
          this.emit('retryAttempt', { attempt, error });
        },
      }
    );
  }
  
  private updateMetrics(): void {
    if (!this.client) return;
    
    this.metrics.commandQueueLength = (this.client as any).commandQueue?.length || 0;
    this.metrics.offlineQueueLength = (this.client as any).offlineQueue?.length || 0;
    this.metrics.status = this.client.status;
  }
  
  async healthCheck(): Promise<any> {
    if (!this.client) {
      return {
        healthy: false,
        error: 'Client not initialized',
      };
    }
    
    try {
      const start = Date.now();
      const pong = await this.client.ping();
      const responseTime = Date.now() - start;
      
      this.updateMetrics();
      
      return {
        healthy: pong === 'PONG',
        status: this.client.status,
        responseTime,
        reconnectAttempts: this.metrics.reconnectAttempts,
        metrics: {
          commandQueue: this.metrics.commandQueueLength,
          offlineQueue: this.metrics.offlineQueueLength,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        status: this.client.status,
        error: (error as Error).message,
        reconnectAttempts: this.metrics.reconnectAttempts,
      };
    }
  }
  
  getClient(): Redis | null {
    return this.client;
  }
  
  getMetrics(): RedisMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
  
  async execute<T>(command: string, ...args: any[]): Promise<T> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    
    return await (this.client as any)[command](...args);
  }
  
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.emit('close');
      } catch (error) {
        // Force disconnect if quit fails
        this.client.disconnect();
        this.emit('forceClose');
      }
      this.client = null;
      this.emit('stateChange', ConnectionState.DISCONNECTED);
    }
  }
  
  static async shutdown(): Promise<void> {
    if (RedisClientManager.instance) {
      await RedisClientManager.instance.close();
      RedisClientManager.instance = null;
    }
  }
}