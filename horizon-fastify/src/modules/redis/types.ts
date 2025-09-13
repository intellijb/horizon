import { RedisOptions } from 'ioredis';

export interface RedisManagerOptions extends RedisOptions {
  maxRetryAttempts?: number;
  retryDelay?: number;
  enableOfflineQueue?: boolean;
}

export interface RedisMetrics {
  reconnectAttempts: number;
  commandQueueLength: number;
  offlineQueueLength: number;
  lastError: Error | null;
  lastErrorTime: Date | null;
  status: string;
}