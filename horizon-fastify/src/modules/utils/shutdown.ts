import { ConnectionStateManager } from '@modules/connection';
import { ShutdownOptions } from './types';

export type { ShutdownOptions } from './types';

export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (error: any, msg: string) => void;
  fatal: (error: any, msg: string) => void;
}

export interface Server {
  close: () => Promise<void>;
  server?: any;
}

export class GracefulShutdown {
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  private readonly timeout: number;
  private readonly forceExit: boolean;
  private readonly signals: NodeJS.Signals[];
  private readonly stateManager: ConnectionStateManager;
  
  constructor(
    private readonly server: Server,
    private readonly logger: Logger,
    options: ShutdownOptions = {}
  ) {
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.forceExit = options.forceExit !== false;
    this.signals = options.signals || ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    this.stateManager = ConnectionStateManager.getInstance();
    
    this.registerSignalHandlers();
  }
  
  private registerSignalHandlers(): void {
    for (const signal of this.signals) {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal} signal, starting graceful shutdown...`);
        await this.shutdown();
      });
    }
    
    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      this.logger.fatal(error, 'Uncaught exception detected, shutting down...');
      await this.shutdown(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      this.logger.fatal({ reason, promise }, 'Unhandled rejection detected, shutting down...');
      await this.shutdown(1);
    });
  }
  
  async shutdown(exitCode: number = 0): Promise<void> {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      return this.shutdownPromise!;
    }
    
    this.isShuttingDown = true;
    this.shutdownPromise = this.performShutdown(exitCode);
    
    return this.shutdownPromise;
  }
  
  private async performShutdown(exitCode: number): Promise<void> {
    const shutdownStart = Date.now();
    
    try {
      // Phase 1: Stop accepting new connections
      this.logger.info('Phase 1: Stopping new connections...');
      
      // Phase 2: Close server with timeout
      this.logger.info('Phase 2: Closing server...');
      await this.closeWithTimeout(
        () => this.server.close(),
        this.timeout,
        'Server close timeout'
      );
      
      // Phase 3: Wait for active requests to complete
      this.logger.info('Phase 3: Waiting for active requests...');
      await this.waitForActiveRequests();
      
      // Phase 4: Close database connections
      this.logger.info('Phase 4: Closing database connections...');
      // This is handled by plugins' onClose hooks
      
      const shutdownTime = Date.now() - shutdownStart;
      this.logger.info(`Graceful shutdown completed in ${shutdownTime}ms`);
      
      if (this.forceExit) {
        process.exit(exitCode);
      }
    } catch (error) {
      this.logger.error(error, 'Error during graceful shutdown');
      
      if (this.forceExit) {
        this.logger.warn('Forcing exit after shutdown error');
        process.exit(1);
      }
    }
  }
  
  private async closeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    timeoutMessage: string
  ): Promise<T | void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${timeoutMessage} (${timeout}ms)`));
      }, timeout);
    });
    
    try {
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      this.logger.warn(timeoutMessage);
    }
  }
  
  private async waitForActiveRequests(): Promise<void> {
    // Get active request count if available
    const server = (this.server as any).server;
    if (!server) return;
    
    const checkInterval = 100;
    const maxWaitTime = this.timeout;
    let waitedTime = 0;
    
    while (waitedTime < maxWaitTime) {
      const connections = await this.getActiveConnections(server);
      
      if (connections === 0) {
        this.logger.info('All active requests completed');
        return;
      }
      
      this.logger.info(`Waiting for ${connections} active connections...`);
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;
    }
    
    this.logger.warn('Timeout waiting for active requests to complete');
  }
  
  private getActiveConnections(server: any): Promise<number> {
    return new Promise((resolve) => {
      if (server.getConnections) {
        server.getConnections((error: Error | null, count: number) => {
          if (error) {
            this.logger.error(error, 'Error getting connection count');
            resolve(0);
          } else {
            resolve(count);
          }
        });
      } else {
        resolve(0);
      }
    });
  }
  
  // Health check for shutdown status
  isHealthy(): boolean {
    return !this.isShuttingDown;
  }
  
  getStatus(): {
    isShuttingDown: boolean;
    connections: any;
  } {
    return {
      isShuttingDown: this.isShuttingDown,
      connections: this.stateManager.getAllStates(),
    };
  }
}

// Factory function for easy setup
export function setupGracefulShutdown(
  server: Server,
  logger: Logger,
  options?: ShutdownOptions
): GracefulShutdown {
  return new GracefulShutdown(server, logger, options);
}