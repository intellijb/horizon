import { EventEmitter } from 'events';
import { ConnectionState, ConnectionHealth, ServiceHealth } from './types';

export type { ConnectionHealth, ServiceHealth } from './types';
export { ConnectionState } from './types';

interface StateChangeEvent {
  service: string;
  previousState: ConnectionState;
  currentState: ConnectionState;
  message?: string;
  timestamp: Date;
}

export class ConnectionStateManager extends EventEmitter {
  private static instance: ConnectionStateManager;
  private states: Map<string, ConnectionHealth>;
  
  private constructor() {
    super();
    this.states = new Map();
    
    // Initialize default states
    this.states.set('postgres', {
      healthy: false,
      state: ConnectionState.DISCONNECTED,
    });
    
    this.states.set('redis', {
      healthy: false,
      state: ConnectionState.DISCONNECTED,
    });
  }
  
  static getInstance(): ConnectionStateManager {
    if (!ConnectionStateManager.instance) {
      ConnectionStateManager.instance = new ConnectionStateManager();
    }
    return ConnectionStateManager.instance;
  }
  
  updateState(service: string, state: ConnectionState, message?: string): void {
    const previousHealth = this.states.get(service);
    const previousState = previousHealth?.state || ConnectionState.DISCONNECTED;
    
    const newHealth: ConnectionHealth = {
      healthy: state === ConnectionState.CONNECTED,
      state,
      message,
    };
    
    this.states.set(service, newHealth);
    
    // Emit state change event
    const event: StateChangeEvent = {
      service,
      previousState,
      currentState: state,
      message,
      timestamp: new Date(),
    };
    
    this.emit('stateChange', event);
    this.emit(`${service}:stateChange`, event);
    
    // Log state transitions
    if (previousState !== state) {
      console.log(`[ConnectionState] ${service}: ${previousState} -> ${state}${message ? ` (${message})` : ''}`);
    }
  }
  
  updateHealth(service: string, health: ConnectionHealth): void {
    const previousHealth = this.states.get(service);
    this.states.set(service, health);
    
    if (previousHealth?.state !== health.state) {
      const event: StateChangeEvent = {
        service,
        previousState: previousHealth?.state || ConnectionState.DISCONNECTED,
        currentState: health.state,
        message: health.message,
        timestamp: new Date(),
      };
      
      this.emit('stateChange', event);
      this.emit(`${service}:stateChange`, event);
    }
  }
  
  getState(service: string): ConnectionHealth | undefined {
    return this.states.get(service);
  }
  
  getAllStates(): ServiceHealth {
    const postgres = this.states.get('postgres') || {
      healthy: false,
      state: ConnectionState.DISCONNECTED,
    };
    
    const redis = this.states.get('redis') || {
      healthy: false,
      state: ConnectionState.DISCONNECTED,
    };
    
    return {
      postgres,
      redis,
      overall: postgres.healthy && redis.healthy,
      timestamp: new Date(),
    };
  }
  
  isHealthy(service?: string): boolean {
    if (service) {
      const state = this.states.get(service);
      return state?.healthy || false;
    }
    
    // Check all services
    for (const state of this.states.values()) {
      if (!state.healthy) {
        return false;
      }
    }
    return true;
  }
  
  // Wait for a service to be ready
  async waitForConnection(service: string, timeout: number = 30000): Promise<void> {
    const state = this.states.get(service);
    if (state?.healthy) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(`${service}:stateChange`, handler);
        reject(new Error(`Timeout waiting for ${service} connection`));
      }, timeout);
      
      const handler = (event: StateChangeEvent) => {
        if (event.currentState === ConnectionState.CONNECTED) {
          clearTimeout(timer);
          this.removeListener(`${service}:stateChange`, handler);
          resolve();
        }
      };
      
      this.on(`${service}:stateChange`, handler);
    });
  }
  
  // Reset all states (useful for testing)
  reset(): void {
    for (const service of this.states.keys()) {
      this.updateState(service, ConnectionState.DISCONNECTED);
    }
  }
}