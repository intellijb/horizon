import { EventEmitter } from 'events';
import { BaseBroker } from './base-broker';

export class InMemoryBroker extends BaseBroker {
  private eventBus: EventEmitter;
  private connectionDelay: number;

  constructor(connectionDelay: number = 0) {
    super();
    this.eventBus = new EventEmitter();
    this.eventBus.setMaxListeners(100); // Support many listeners
    this.connectionDelay = connectionDelay;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    // Simulate connection delay
    if (this.connectionDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.connectionDelay));
    }

    this.onConnected();
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.eventBus.removeAllListeners();
    this.handlers.clear();
    this.onDisconnected();
  }

  async publish(topic: string, message: Buffer): Promise<void> {
    if (!this.connected) {
      throw new Error('In-memory broker not connected');
    }

    // Simulate async behavior
    await new Promise(resolve => setImmediate(resolve));

    this.eventBus.emit(topic, message);
    this.metrics.publishedCount++;
    this.emit('message-published', topic, message);
  }

  protected async subscribeToTopic(topic: string): Promise<void> {
    const listener = async (message: Buffer) => {
      await this.handleMessage(topic, message);
    };

    this.eventBus.on(topic, listener);
    this.emit('subscribed', topic);
  }

  protected async unsubscribeFromTopic(topic: string): Promise<void> {
    this.eventBus.removeAllListeners(topic);
    this.emit('unsubscribed', topic);
  }

  async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();

    return {
      ...baseMetrics,
      subscribedTopics: this.eventBus.eventNames(),
      listenerCounts: this.eventBus.eventNames().reduce((acc, event) => {
        acc[event as string] = this.eventBus.listenerCount(event);
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Test helper methods
  async simulateMessage(topic: string, message: Buffer): Promise<void> {
    this.eventBus.emit(topic, message);
  }

  getEventBus(): EventEmitter {
    return this.eventBus;
  }
}