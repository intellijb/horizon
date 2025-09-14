import { RedisClientManager, RedisManagerOptions } from './client-manager';
import { ConnectionState, ConnectionStateManager } from '@modules/platform/connection';

export interface RedisSetupOptions extends RedisManagerOptions {
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (error: Error, msg: string) => void;
  };
}

export interface RedisSetupResult {
  clientManager: RedisClientManager;
  stateManager: ConnectionStateManager;
  initialize: () => Promise<void>;
  decorators: {
    redis: any;
    redisHealthCheck: () => Promise<any>;
    redisMetrics: () => any;
    redisExecute: (command: string, ...args: any[]) => Promise<any>;
  };
}

export function setupRedisManager(options: RedisSetupOptions): RedisSetupResult {
  const stateManager = ConnectionStateManager.getInstance();
  const clientManager = RedisClientManager.getInstance(options);
  const logger = options.logger || {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  
  // Wire up event listeners
  clientManager.on('stateChange', (state) => {
    stateManager.updateState('redis', state);
  });
  
  clientManager.on('error', (error) => {
    logger.error(error, 'Redis: Connection error');
  });
  
  clientManager.on('connect', () => {
    logger.info('Redis: Connection established');
  });
  
  clientManager.on('ready', () => {
    logger.info('Redis: Client ready');
  });
  
  clientManager.on('reconnecting', (delay) => {
    logger.info(`Redis: Reconnecting in ${delay}ms`);
  });
  
  clientManager.on('maxRetriesExceeded', () => {
    logger.error(new Error('Max retries exceeded'), 'Redis: Maximum reconnection attempts exceeded');
  });
  
  clientManager.on('retryAttempt', ({ attempt, error }) => {
    logger.warn(`Redis connection attempt ${attempt} failed: ${error.message}`);
  });
  
  clientManager.on('close', () => {
    logger.info('Redis: Connection closed');
  });
  
  clientManager.on('end', () => {
    logger.info('Redis: Connection ended');
  });
  
  // Initialize function
  const initialize = async () => {
    try {
      stateManager.updateState('redis', ConnectionState.CONNECTING);
      await clientManager.initialize();
      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error(error as Error, 'Failed to connect to Redis');
      // Don't throw - allow server to start even if Redis is down
      // The client will attempt to reconnect automatically
    }
  };
  
  // Prepare decorators
  const decorators = {
    redis: clientManager.getClient(),
    redisHealthCheck: () => clientManager.healthCheck(),
    redisMetrics: () => clientManager.getMetrics(),
    redisExecute: (command: string, ...args: any[]) => clientManager.execute(command, ...args),
  };
  
  return {
    clientManager,
    stateManager,
    initialize,
    decorators,
  };
}