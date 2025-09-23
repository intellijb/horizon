import { Constructor } from '../core/types';
import { IEventHandler, RetryPolicy } from '../core/interfaces';
import { EventHandlerRegistry } from './handler-registry';

// Store metadata for decorated classes
const handlerMetadata = new WeakMap<any, {
  eventTypes: Constructor[];
  retryPolicy?: RetryPolicy;
}>();

/**
 * Decorator to mark a class as an event handler for specific event types
 */
export function EventHandler(...eventTypes: Constructor[]): ClassDecorator {
  return (target: any) => {
    // Store metadata
    handlerMetadata.set(target, { eventTypes });

    // Create a wrapped class that auto-registers
    return class extends target {
      constructor(...args: any[]) {
        super(...args);

        // Auto-register with the global registry
        const registry = EventHandlerRegistry.getInstance();
        for (const eventType of eventTypes) {
          registry.register(eventType, this as IEventHandler);
        }
      }
    } as any;
  };
}

/**
 * Decorator to set retry policy for an event handler
 */
export function RetryableHandler(policy: RetryPolicy): ClassDecorator {
  return (target: any) => {
    const metadata = handlerMetadata.get(target) || { eventTypes: [] };
    metadata.retryPolicy = policy;
    handlerMetadata.set(target, metadata);

    // Add getRetryPolicy method to the prototype if it doesn't exist
    if (!target.prototype.getRetryPolicy) {
      target.prototype.getRetryPolicy = function() {
        return policy;
      };
    }

    return target;
  };
}

/**
 * Method decorator for the handle method to add logging/metrics
 */
export function HandleEvent(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(this: IEventHandler, event: any, metadata?: any) {
      const startTime = Date.now();
      const handlerName = this.constructor.name;

      try {
        // Call original method
        const result = await originalMethod.call(this, event, metadata);

        // Log success metric
        const duration = Date.now() - startTime;
        console.log(`[EventHandler] ${handlerName} processed ${event.constructor.name} in ${duration}ms`);

        return result;
      } catch (error) {
        // Log error metric
        const duration = Date.now() - startTime;
        console.error(`[EventHandler] ${handlerName} failed processing ${event.constructor.name} after ${duration}ms:`, error);

        // Call error handler if exists
        if (this.onError) {
          await this.onError(error as Error, event);
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Property decorator to inject event bus or other services
 */
export function InjectEventBus(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    // This would be implemented with a DI container in production
    // For now, it's a placeholder for future implementation
    Object.defineProperty(target, propertyKey, {
      get() {
        // Return the global event bus instance
        // This would come from a DI container
        return null; // Placeholder
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Helper function to get handler metadata
 */
export function getHandlerMetadata(handler: any): {
  eventTypes: Constructor[];
  retryPolicy?: RetryPolicy;
} | undefined {
  return handlerMetadata.get(handler.constructor) || handlerMetadata.get(handler);
}

/**
 * Base class for event handlers with common functionality
 */
export abstract class BaseEventHandler<T = any> implements IEventHandler<T> {
  abstract handle(event: T, metadata?: any): Promise<void>;

  async onError(error: Error, event: T): Promise<void> {
    // Default error handling - can be overridden
    console.error(`Handler ${this.constructor.name} error:`, error, event);
  }

  getRetryPolicy(): RetryPolicy {
    // Default retry policy - can be overridden
    return {
      maxRetries: 3,
      retryDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 30000,
    };
  }
}

/**
 * Decorator to automatically handle events in a saga pattern
 */
export function SagaHandler(sagaName: string): ClassDecorator {
  return (target: any) => {
    // Add saga metadata
    target.prototype.sagaName = sagaName;
    target.prototype.isSagaHandler = true;

    return target;
  };
}

/**
 * Method decorator for saga compensation
 */
export function CompensateOn(errorType: Constructor<Error>): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Store compensation metadata
    if (!target._compensations) {
      target._compensations = new Map();
    }
    target._compensations.set(errorType, propertyKey);

    return descriptor;
  };
}