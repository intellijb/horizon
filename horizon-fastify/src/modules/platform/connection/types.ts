export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface ConnectionHealth {
  healthy: boolean;
  state: ConnectionState;
  message?: string;
  error?: string;
  lastError?: string;
  lastErrorTime?: Date;
  metrics?: ConnectionMetrics;
}

export interface ConnectionMetrics {
  total?: number;
  idle?: number;
  waiting?: number;
  active?: number;
  successRate?: number;
  averageResponseTime?: number;
}

export interface ServiceHealth {
  postgres: ConnectionHealth;
  redis: ConnectionHealth;
  overall: boolean;
  timestamp: Date;
}