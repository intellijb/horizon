import { EventEmitter } from 'events';
import { IMessageBroker, BrokerMetrics } from '../core/interfaces';
import { MessageHandler } from '../core/types';

export abstract class BaseBroker extends EventEmitter implements IMessageBroker {
  protected connected: boolean = false;
  protected handlers: Map<string, Set<MessageHandler>> = new Map();
  protected metrics: BrokerMetrics = {
    publishedCount: 0,
    receivedCount: 0,
    errorCount: 0,
  };

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract publish(topic: string, message: Buffer): Promise<void>;

  async publishBatch(messages: Array<{ topic: string; message: Buffer }>): Promise<void> {
    for (const { topic, message } of messages) {
      await this.publish(topic, message);
    }
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
      await this.subscribeToTopic(topic);
    }
    this.handlers.get(topic)!.add(handler);
  }

  async unsubscribe(topic: string): Promise<void> {
    if (this.handlers.has(topic)) {
      this.handlers.delete(topic);
      await this.unsubscribeFromTopic(topic);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMetrics(): Promise<BrokerMetrics> {
    return { ...this.metrics };
  }

  protected abstract subscribeToTopic(topic: string): Promise<void>;
  protected abstract unsubscribeFromTopic(topic: string): Promise<void>;

  protected async handleMessage(topic: string, message: Buffer): Promise<void> {
    this.metrics.receivedCount++;
    const handlers = this.handlers.get(topic);

    if (handlers) {
      const promises = Array.from(handlers).map(handler =>
        this.executeHandler(handler, message)
      );
      await Promise.allSettled(promises);
    }
  }

  private async executeHandler(handler: MessageHandler, message: Buffer): Promise<void> {
    try {
      await handler(message);
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.lastError = error as Error;
      this.emit('handler-error', error, message);
    }
  }

  protected onConnected(): void {
    this.connected = true;
    this.emit('connected');
  }

  protected onDisconnected(): void {
    this.connected = false;
    this.emit('disconnected');
  }

  protected onError(error: Error): void {
    this.metrics.errorCount++;
    this.metrics.lastError = error;
    this.emit('error', error);
  }
}