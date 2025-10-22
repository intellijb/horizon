import { EventEmitter } from 'events';
import { IEventBus, IEventStore, IMessageBroker } from './core/interfaces';
import { Constructor, EventHandler, IEventSerializer } from './core/types';
import { DomainEvent } from './core/domain-event';
import { EventSerializer } from './serializer/event-serializer';

export class EventBus extends EventEmitter implements IEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private started: boolean = false;

  constructor(
    private broker: IMessageBroker,
    private serializer: IEventSerializer = new EventSerializer(),
    private store?: IEventStore
  ) {
    super();
    this.setMaxListeners(100);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.broker.connect();
    this.setupBrokerHandlers();
    this.started = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    await this.broker.disconnect();
    this.handlers.clear();
    this.started = false;
    this.emit('stopped');
  }

  async publish<T>(event: T): Promise<void> {
    if (!this.started) {
      throw new Error('EventBus not started');
    }

    try {
      // Get topic from event
      const topic = this.getEventTopic(event);

      // Store event if store is configured
      if (this.store && event instanceof DomainEvent) {
        await this.store.append(event, event.getMetadata());
      }

      // Serialize and publish
      const message = this.serializer.serialize(event);
      await this.broker.publish(topic, message);

      this.emit('event-published', event);
    } catch (error) {
      this.emit('publish-error', error, event);
      throw error;
    }
  }

  async publishBatch<T>(events: T[]): Promise<void> {
    if (!this.started) {
      throw new Error('EventBus not started');
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

      // Prepare messages for broker
      const messages = events.map(event => ({
        topic: this.getEventTopic(event),
        message: this.serializer.serialize(event),
      }));

      await this.broker.publishBatch(messages);
      this.emit('batch-published', events.length);
    } catch (error) {
      this.emit('batch-publish-error', error, events);
      throw error;
    }
  }

  subscribe<T>(eventType: Constructor<T>, handler: EventHandler<T>): void {
    const eventName = this.getEventTypeName(eventType);

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());

      // Subscribe to broker if started
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
        this.broker.unsubscribe(eventName);
      }
    }

    this.emit('handler-unsubscribed', eventName);
  }

  private setupBrokerHandlers(): void {
    // Subscribe to all existing handlers
    for (const eventName of this.handlers.keys()) {
      this.subscribeToTopic(eventName);
    }
  }

  private subscribeToTopic(eventName: string): void {
    this.broker.subscribe(eventName, async (message: Buffer) => {
      await this.handleIncomingMessage(eventName, message);
    });
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
      throw error;
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

  getBroker(): IMessageBroker {
    return this.broker;
  }

  getStore(): IEventStore | undefined {
    return this.store;
  }
}