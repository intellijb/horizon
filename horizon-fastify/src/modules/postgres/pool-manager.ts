import { Pool, PoolClient, PoolConfig } from 'pg';
import { EventEmitter } from 'events';
import { retryWithBackoff } from '@modules/utils/retry';
import { PoolMetrics, CircuitState, CircuitBreakerState } from './types';
import { ConnectionState } from '@modules/connection';

export type { PoolMetrics, CircuitBreakerState } from './types';
export { CircuitState } from './types';
export { ConnectionState } from '@modules/connection';

export interface PoolManagerOptions extends PoolConfig {
  maxRetryAttempts?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

export class PostgresPoolManager extends EventEmitter {
  private static instance: PostgresPoolManager | null = null;
  private pool: Pool | null = null;
  private metrics: PoolMetrics;
  private circuitBreaker: CircuitBreakerState;
  private readonly options: PoolManagerOptions;
  
  private readonly CIRCUIT_BREAKER_THRESHOLD: number;
  private readonly CIRCUIT_BREAKER_TIMEOUT: number;
  private readonly HALF_OPEN_SUCCESS_THRESHOLD = 3;
  
  constructor(options: PoolManagerOptions) {
    super();
    this.options = options;
    this.CIRCUIT_BREAKER_THRESHOLD = options.circuitBreakerThreshold || 5;
    this.CIRCUIT_BREAKER_TIMEOUT = options.circuitBreakerTimeout || 60000;
    
    this.metrics = {
      totalConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      lastError: null,
      lastErrorTime: null,
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
    };
    
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: null,
      successCount: 0,
      nextRetryTime: null,
    };
  }
  
  static getInstance(options?: PoolManagerOptions): PostgresPoolManager {
    if (!PostgresPoolManager.instance) {
      if (!options) {
        throw new Error('Options required for first initialization');
      }
      PostgresPoolManager.instance = new PostgresPoolManager(options);
    }
    return PostgresPoolManager.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.pool) {
      return; // Already initialized
    }
    
    this.pool = new Pool(this.options);
    this.setupEventListeners();
    
    // Test initial connection with retry
    await this.testConnection();
  }
  
  private setupEventListeners(): void {
    if (!this.pool) return;
    
    this.pool.on('connect', (client: PoolClient) => {
      this.metrics.successfulConnections++;
      this.metrics.connectionAttempts++;
      this.emit('connect', client);
      this.emit('stateChange', ConnectionState.CONNECTED);
      
      // Reset circuit breaker on successful connection
      if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
        this.circuitBreaker.successCount++;
        if (this.circuitBreaker.successCount >= this.HALF_OPEN_SUCCESS_THRESHOLD) {
          this.circuitBreaker.state = CircuitState.CLOSED;
          this.circuitBreaker.failures = 0;
          this.circuitBreaker.successCount = 0;
          this.emit('circuitBreakerClosed');
        }
      }
    });
    
    this.pool.on('acquire', (client: PoolClient) => {
      this.updateMetrics();
      this.emit('acquire', client);
    });
    
    this.pool.on('error', (err: Error, client: PoolClient) => {
      this.metrics.lastError = err;
      this.metrics.lastErrorTime = new Date();
      this.metrics.failedConnections++;
      this.metrics.connectionAttempts++;
      
      this.emit('error', err);
      this.emit('stateChange', ConnectionState.ERROR);
      
      // Update circuit breaker
      this.updateCircuitBreaker();
    });
    
    this.pool.on('remove', (client: PoolClient) => {
      this.updateMetrics();
      this.emit('remove', client);
    });
  }
  
  private updateMetrics(): void {
    if (!this.pool) return;
    
    this.metrics.totalConnections = this.pool.totalCount;
    this.metrics.idleConnections = this.pool.idleCount;
    this.metrics.waitingConnections = this.pool.waitingCount;
  }
  
  private updateCircuitBreaker(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = new Date();
    
    if (this.circuitBreaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD && 
        this.circuitBreaker.state === CircuitState.CLOSED) {
      this.circuitBreaker.state = CircuitState.OPEN;
      this.circuitBreaker.nextRetryTime = new Date(Date.now() + this.CIRCUIT_BREAKER_TIMEOUT);
      this.emit('circuitBreakerOpen');
    }
  }
  
  private async testConnection(): Promise<void> {
    await retryWithBackoff(
      async () => {
        if (this.circuitBreaker.state === CircuitState.OPEN) {
          if (this.circuitBreaker.nextRetryTime && Date.now() < this.circuitBreaker.nextRetryTime.getTime()) {
            throw new Error('Circuit breaker is open');
          } else {
            this.circuitBreaker.state = CircuitState.HALF_OPEN;
            this.circuitBreaker.successCount = 0;
            this.emit('circuitBreakerHalfOpen');
          }
        }
        
        const client = await this.pool!.connect();
        await client.query('SELECT 1');
        client.release();
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
  
  async query<T = any>(text: string, values?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }
    
    if (this.circuitBreaker.state === CircuitState.OPEN) {
      throw new Error('Circuit breaker is open - database unavailable');
    }
    
    const client = await this.pool.connect();
    try {
      return await client.query(text, values);
    } finally {
      client.release();
    }
  }
  
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async healthCheck(): Promise<any> {
    if (this.circuitBreaker.state === CircuitState.OPEN) {
      return {
        healthy: false,
        message: 'Circuit breaker is open',
        circuitBreaker: this.circuitBreaker.state,
      };
    }
    
    try {
      const result = await this.query('SELECT NOW()');
      return {
        healthy: true,
        timestamp: result.rows[0].now,
        metrics: this.getMetrics(),
        circuitBreaker: this.circuitBreaker.state,
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message,
        lastError: this.metrics.lastError?.message,
        lastErrorTime: this.metrics.lastErrorTime,
        circuitBreaker: this.circuitBreaker.state,
      };
    }
  }
  
  getPool(): Pool | null {
    return this.pool;
  }
  
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }
  
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }
  
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.emit('close');
      this.emit('stateChange', ConnectionState.DISCONNECTED);
    }
  }
  
  static async shutdown(): Promise<void> {
    if (PostgresPoolManager.instance) {
      await PostgresPoolManager.instance.close();
      PostgresPoolManager.instance = null;
    }
  }
}