// Re-export from connection module
export { ConnectionState } from '@modules/platform/connection';

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
  lastError: Error | null;
  lastErrorTime: Date | null;
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: Date | null;
  successCount: number;
  nextRetryTime: Date | null;
}