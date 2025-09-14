import { PostgresPoolManager, PoolManagerOptions } from './pool-manager';
import { ConnectionState, ConnectionStateManager } from '@modules/platform/connection';

export interface PostgresSetupOptions extends PoolManagerOptions {
  logger?: {
    debug: (msg: string) => void;
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (error: Error, msg: string) => void;
  };
}

export interface PostgresSetupResult {
  poolManager: PostgresPoolManager;
  stateManager: ConnectionStateManager;
  initialize: () => Promise<void>;
  decorators: {
    pgPool: any;
    pgMetrics: () => any;
    pgCircuitBreaker: () => any;
    pgHealthCheck: () => Promise<any>;
    pgQuery: (text: string, values?: any[]) => Promise<any>;
    pgTransaction: (fn: any) => Promise<any>;
  };
}

export function setupPostgresManager(options: PostgresSetupOptions): PostgresSetupResult {
  const stateManager = ConnectionStateManager.getInstance();
  const poolManager = PostgresPoolManager.getInstance(options);
  const logger = options.logger || {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  
  // Wire up event listeners
  poolManager.on('stateChange', (state) => {
    stateManager.updateState('postgres', state);
  });
  
  poolManager.on('error', (error) => {
    logger.error(error, 'PostgreSQL pool error');
  });
  
  poolManager.on('connect', () => {
    logger.debug('PostgreSQL client connected');
  });
  
  poolManager.on('circuitBreakerOpen', () => {
    logger.warn('Circuit breaker opened - too many connection failures');
  });
  
  poolManager.on('circuitBreakerClosed', () => {
    logger.info('Circuit breaker closed - connection recovered');
  });
  
  poolManager.on('circuitBreakerHalfOpen', () => {
    logger.info('Circuit breaker half-open - testing connection');
  });
  
  poolManager.on('retryAttempt', ({ attempt, error }) => {
    logger.warn(`PostgreSQL connection attempt ${attempt} failed: ${error.message}`);
  });
  
  // Initialize function
  const initialize = async () => {
    try {
      stateManager.updateState('postgres', ConnectionState.CONNECTING);
      await poolManager.initialize();
      stateManager.updateState('postgres', ConnectionState.CONNECTED);
      logger.info('PostgreSQL connection pool initialized successfully');
    } catch (error) {
      stateManager.updateState('postgres', ConnectionState.ERROR, (error as Error).message);
      logger.error(error as Error, 'Failed to initialize PostgreSQL connection pool');
      throw error;
    }
  };
  
  // Prepare decorators
  const decorators = {
    pgPool: poolManager.getPool(),
    pgMetrics: () => poolManager.getMetrics(),
    pgCircuitBreaker: () => poolManager.getCircuitBreakerState(),
    pgHealthCheck: () => poolManager.healthCheck(),
    pgQuery: (text: string, values?: any[]) => poolManager.query(text, values),
    pgTransaction: (fn: any) => poolManager.transaction(fn),
  };
  
  return {
    poolManager,
    stateManager,
    initialize,
    decorators,
  };
}