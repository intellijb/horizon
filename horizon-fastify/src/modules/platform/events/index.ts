// Core exports
export * from './core/types';
export * from './core/interfaces';
export * from './core/domain-event';

// Event Bus exports
export { EventBus } from './event-bus';
export { HybridEventBus, DefaultRoutingStrategy } from './hybrid-event-bus';

// Broker exports
export { BaseBroker } from './brokers/base-broker';
export { RedisBroker } from './brokers/redis-broker';
export { InMemoryBroker } from './brokers/in-memory-broker';

// Event Store exports
export { RedisEventStore } from './store/redis-event-store';
export { InMemoryEventStore } from './store/in-memory-event-store';

// Factory exports
export { BrokerFactory } from './factories/broker-factory';
export { EventBusFactory } from './factories/event-bus-factory';
export { EventStoreFactory } from './factories/event-store-factory';

// Serializer exports
export { EventSerializer } from './serializer/event-serializer';

// Handler exports
export { EventHandlerRegistry } from './handlers/handler-registry';
export {
  EventHandler,
  RetryableHandler,
  HandleEvent,
  BaseEventHandler,
  SagaHandler,
  CompensateOn,
  InjectEventBus,
  getHandlerMetadata
} from './handlers/decorators';
export { SecurityAuditHandler } from './handlers/security-audit-handler';

// Event schemas exports
export * from './schemas/auth-events';

// Quick setup function for common use cases
export async function createDefaultEventBus(): Promise<import('./core/interfaces').IEventBus> {
  return EventBusFactory.createAndStart({
    broker: { type: 'redis' },
    store: { type: 'redis' },
    hybrid: true,
  });
}

export async function createTestEventBus(): Promise<import('./core/interfaces').IEventBus> {
  return EventBusFactory.createAndStart({
    broker: { type: 'in-memory' },
    store: { type: 'in-memory' },
    hybrid: false,
  });
}