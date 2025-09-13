// Re-export connection types from connection module
export type { ConnectionHealth, ConnectionMetrics, ServiceHealth } from '@modules/connection';
export { ConnectionState } from '@modules/connection';

export interface ShutdownOptions {
  timeout?: number;
  forceExit?: boolean;
  signals?: NodeJS.Signals[];
}