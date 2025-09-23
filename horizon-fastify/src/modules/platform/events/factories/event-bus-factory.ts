import { IEventBus, IEventStore } from '../core/interfaces';
import { EventBusConfig, EventStoreConfig } from '../core/types';
import { EventBus } from '../event-bus';
import { HybridEventBus, DefaultRoutingStrategy } from '../hybrid-event-bus';
import { BrokerFactory } from './broker-factory';
import { EventStoreFactory } from './event-store-factory';
import { EventSerializer } from '../serializer/event-serializer';
import { InMemoryBroker } from '../brokers/in-memory-broker';

export class EventBusFactory {
  private static instances: Map<string, IEventBus> = new Map();

  static create(config: EventBusConfig): IEventBus {
    const key = this.getConfigKey(config);

    // Check if we already have this instance
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let eventBus: IEventBus;

    if (config.hybrid) {
      eventBus = this.createHybridEventBus(config);
    } else {
      eventBus = this.createStandardEventBus(config);
    }

    // Cache the instance
    this.instances.set(key, eventBus);

    return eventBus;
  }

  static async createAndStart(config: EventBusConfig): Promise<IEventBus> {
    const eventBus = this.create(config);
    await eventBus.start();
    return eventBus;
  }

  private static createStandardEventBus(config: EventBusConfig): IEventBus {
    const broker = BrokerFactory.create(config.broker);
    const serializer = config.serializer || new EventSerializer();
    const store = config.store ? EventStoreFactory.create(config.store) : undefined;

    return new EventBus(broker, serializer, store);
  }

  private static createHybridEventBus(config: EventBusConfig): IEventBus {
    const remoteBroker = BrokerFactory.create(config.broker);
    const localBroker = new InMemoryBroker();
    const serializer = config.serializer || new EventSerializer();
    const store = config.store ? EventStoreFactory.create(config.store) : undefined;
    const routingStrategy = config.routingStrategy || new DefaultRoutingStrategy();

    return new HybridEventBus({
      localBroker,
      remoteBroker,
      routingStrategy,
      serializer,
      store,
    });
  }

  static createDefault(): IEventBus {
    return this.create({
      broker: { type: 'redis' },
      store: { type: 'redis' },
      hybrid: true,
    });
  }

  static createForTesting(): IEventBus {
    return this.create({
      broker: { type: 'in-memory' },
      store: { type: 'in-memory' },
      hybrid: false,
    });
  }

  private static getConfigKey(config: EventBusConfig): string {
    const parts = [
      config.broker.type,
      config.hybrid ? 'hybrid' : 'standard',
      config.store?.type || 'no-store',
    ];

    return parts.join(':');
  }

  static clearCache(): void {
    this.instances.clear();
  }

  static async stopAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(eventBus =>
      eventBus.stop().catch(err => console.error('Error stopping event bus:', err))
    );

    await Promise.all(promises);
    this.clearCache();
  }

  static getInstance(name: string = 'default'): IEventBus | undefined {
    return this.instances.get(name);
  }

  static registerInstance(name: string, eventBus: IEventBus): void {
    this.instances.set(name, eventBus);
  }
}