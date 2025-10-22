import { EventEmitter } from 'events';
import { IEventBus, IEventStore, IMessageBroker } from './core/interfaces';
import { Constructor, EventHandler, IEventSerializer, IRoutingStrategy } from './core/types';
import { DomainEvent } from './core/domain-event';
import { EventSerializer } from './serializer/event-serializer';
import { InMemoryBroker } from './brokers/in-memory-broker';

export class DefaultRoutingStrategy implements IRoutingStrategy {
  private localEvents: Set<string> = new Set();
  private remoteEvents: Set<string> = new Set();

  constructor(
    localEventTypes: string[] = [],
    remoteEventTypes: string[] = []
  ) {
    localEventTypes.forEach(type => this.localEvents.add(type));
    remoteEventTypes.forEach(type => this.remoteEvents.add(type));
  }

  selectBroker(event: any): 'local' | 'remote' {
    const eventType = this.getEventType(event);

    // If explicitly configured
    if (this.localEvents.has(eventType)) {
      return 'local';
    }
    if (this.remoteEvents.has(eventType)) {
      return 'remote';
    }

    // Default strategy: high-priority events go local, others remote
    if (event.priority && event.priority >= 2) {
      return 'local';
    }

    // Default to remote for scalability
    return 'remote';
  }

  private getEventType(event: any): string {
    if (event instanceof DomainEvent) {
      return event.eventType;
    }
    if (event.eventType) {
      return event.eventType;
    }
    return event.constructor.name;
  }

  addLocalEventType(eventType: string): void {
    this.localEvents.add(eventType);
    this.remoteEvents.delete(eventType);
  }

  addRemoteEventType(eventType: string): void {
    this.remoteEvents.add(eventType);
    this.localEvents.delete(eventType);
  }
}

export class HybridEventBus extends EventEmitter implements IEventBus {
  private localBroker: IMessageBroker;
  private remoteBroker: IMessageBroker;
  private routingStrategy: IRoutingStrategy;
  private serializer: IEventSerializer;
  private store?: IEventStore;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private started: boolean = false;

  constructor(options: {
    localBroker?: IMessageBroker;
    remoteBroker: IMessageBroker;
    routingStrategy?: IRoutingStrategy;
    serializer?: IEventSerializer;
    store?: IEventStore;
  }) {
    super();
    this.localBroker = options.localBroker || new InMemoryBroker();
    this.remoteBroker = options.remoteBroker;
    this.routingStrategy = options.routingStrategy || new DefaultRoutingStrategy();
    this.serializer = options.serializer || new EventSerializer();
    this.store = options.store;
    this.setMaxListeners(100);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    // Connect both brokers
    await Promise.all([
      this.localBroker.connect(),
      this.remoteBroker.connect(),
    ]);

    this.setupBrokerHandlers();
    this.started = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    await Promise.all([
      this.localBroker.disconnect(),
      this.remoteBroker.disconnect(),
    ]);

    this.handlers.clear();
    this.started = false;
    this.emit('stopped');
  }

  async publish<T>(event: T): Promise<void> {
    if (!this.started) {
      throw new Error('HybridEventBus not started');
    }

    try {
      // Store event if store is configured
      if (this.store && event instanceof DomainEvent) {
        await this.store.append(event, event.getMetadata());
      }

      // Select broker based on routing strategy
      const brokerType = this.routingStrategy.selectBroker(event);
      const broker = brokerType === 'local' ? this.localBroker : this.remoteBroker;

      // Get topic and serialize
      const topic = this.getEventTopic(event);
      const message = this.serializer.serialize(event);

      // Publish to selected broker
      await broker.publish(topic, message);

      this.emit('event-published', {
        event,
        broker: brokerType,
        topic,
      });
    } catch (error) {
      this.emit('publish-error', error, event);
      throw error;
    }
  }

  async publishBatch<T>(events: T[]): Promise<void> {
    if (!this.started) {
      throw new Error('HybridEventBus not started');
    }

    try {
      // Store events if store is configured
      if (this.store) {
        const eventsToStore = events
          .filter(event => event instanceof DomainEvent)
          .map(event => ({
            event,
            metadata: (event as DomainEvent).getMetadata(),
          }));

        if (eventsToStore.length > 0) {
          await this.store.appendBatch(eventsToStore);
        }
      }

      // Group events by broker
      const localEvents: Array<{ topic: string; message: Buffer }> = [];
      const remoteEvents: Array<{ topic: string; message: Buffer }> = [];

      for (const event of events) {
        const brokerType = this.routingStrategy.selectBroker(event);
        const topic = this.getEventTopic(event);
        const message = this.serializer.serialize(event);

        if (brokerType === 'local') {
          localEvents.push({ topic, message });
        } else {
          remoteEvents.push({ topic, message });
        }
      }

      // Publish to both brokers in parallel
      const promises: Promise<void>[] = [];

      if (localEvents.length > 0) {
        promises.push(this.localBroker.publishBatch(localEvents));
      }

      if (remoteEvents.length > 0) {
        promises.push(this.remoteBroker.publishBatch(remoteEvents));
      }

      await Promise.all(promises);

      this.emit('batch-published', {
        total: events.length,
        local: localEvents.length,
        remote: remoteEvents.length,
      });
    } catch (error) {
      this.emit('batch-publish-error', error, events);
      throw error;
    }
  }

  subscribe<T>(eventType: Constructor<T>, handler: EventHandler<T>): void {
    const eventName = this.getEventTypeName(eventType);

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());

      // Subscribe to both brokers if started
      if (this.started) {
        this.subscribeToTopic(eventName);
      }
    }

    this.handlers.get(eventName)!.add(handler as EventHandler);
    this.emit('handler-subscribed', eventName);
  }

  unsubscribe<T>(eventType: Constructor<T>, handler?: EventHandler<T>): void {
    const eventName = this.getEventTypeName(eventType);
    const handlers = this.handlers.get(eventName);

    if (!handlers) {
      return;
    }

    if (handler) {
      handlers.delete(handler as EventHandler);
    } else {
      handlers.clear();
    }

    if (handlers.size === 0) {
      this.handlers.delete(eventName);
      if (this.started) {
        this.localBroker.unsubscribe(eventName);
        this.remoteBroker.unsubscribe(eventName);
      }
    }

    this.emit('handler-unsubscribed', eventName);
  }

  private setupBrokerHandlers(): void {
    for (const eventName of this.handlers.keys()) {
      this.subscribeToTopic(eventName);
    }
  }

  private subscribeToTopic(eventName: string): void {
    const messageHandler = async (message: Buffer) => {
      await this.handleIncomingMessage(eventName, message);
    };

    // Subscribe to both brokers
    this.localBroker.subscribe(eventName, messageHandler);
    this.remoteBroker.subscribe(eventName, messageHandler);
  }

  private async handleIncomingMessage(eventName: string, message: Buffer): Promise<void> {
    try {
      // TODO: Need to pass event type to deserialize - using Object as placeholder
      const event = this.serializer.deserialize(message, Object as any);
      const handlers = this.handlers.get(eventName);

      if (handlers) {
        const promises = Array.from(handlers).map(handler =>
          this.executeHandler(handler, event)
        );
        await Promise.allSettled(promises);
      }

      this.emit('event-handled', event);
    } catch (error) {
      this.emit('handle-error', error, message);
    }
  }

  private async executeHandler(handler: EventHandler, event: any): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      this.emit('handler-error', error, event);
      // Don't throw to allow other handlers to execute
    }
  }

  private getEventTopic(event: any): string {
    if (event instanceof DomainEvent) {
      return event.topic;
    }
    if (event.topic) {
      return event.topic;
    }
    return this.getEventTypeName(event.constructor);
  }

  private getEventTypeName(eventType: Constructor | any): string {
    if (typeof eventType === 'string') {
      return eventType;
    }
    if (eventType.eventType) {
      return eventType.eventType;
    }
    return eventType.name || 'UnknownEvent';
  }

  isStarted(): boolean {
    return this.started;
  }

  getLocalBroker(): IMessageBroker {
    return this.localBroker;
  }

  getRemoteBroker(): IMessageBroker {
    return this.remoteBroker;
  }

  getRoutingStrategy(): IRoutingStrategy {
    return this.routingStrategy;
  }

  async getMetrics(): Promise<any> {
    const [localMetrics, remoteMetrics] = await Promise.all([
      this.localBroker.getMetrics(),
      this.remoteBroker.getMetrics(),
    ]);

    return {
      local: localMetrics,
      remote: remoteMetrics,
      handlers: Object.fromEntries(
        Array.from(this.handlers.entries()).map(([key, value]) => [key, value.size])
      ),
    };
  }
}