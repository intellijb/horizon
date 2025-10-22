import { EventEmitter } from 'events';

export interface IMessage {
  id: string;
  correlationId?: string;
  causationId?: string;
  timestamp: Date;
  headers: Record<string, any>;
  body: any;
}

export interface IMessageBus {
  publish(topic: string, message: IMessage): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  request(topic: string, message: IMessage, timeout?: number): Promise<IMessage>;
  reply(replyTo: string, message: IMessage): Promise<void>;
}

export type MessageHandler = (message: IMessage) => Promise<void>;

export interface IMessageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: Buffer): Promise<void>;
  subscribe(topic: string, handler: (message: Buffer) => Promise<void>): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  isConnected(): boolean;
}

export class MessageBus extends EventEmitter implements IMessageBus {
  private adapter: IMessageAdapter;
  private handlers = new Map<string, Set<MessageHandler>>();
  private pendingRequests = new Map<string, {
    resolve: (message: IMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(adapter: IMessageAdapter) {
    super();
    this.adapter = adapter;
  }

  async connect(): Promise<void> {
    await this.adapter.connect();
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    // Clear pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('MessageBus disconnected'));
    }
    this.pendingRequests.clear();

    await this.adapter.disconnect();
    this.emit('disconnected');
  }

  async publish(topic: string, message: IMessage): Promise<void> {
    if (!this.adapter.isConnected()) {
      throw new Error('MessageBus not connected');
    }

    const serialized = this.serialize(message);
    await this.adapter.publish(topic, serialized);
    this.emit('message-published', { topic, message });
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());

      // Subscribe to adapter
      await this.adapter.subscribe(topic, async (buffer) => {
        await this.handleIncomingMessage(topic, buffer);
      });
    }

    this.handlers.get(topic)!.add(handler);
    this.emit('handler-subscribed', { topic });
  }

  async unsubscribe(topic: string): Promise<void> {
    this.handlers.delete(topic);
    await this.adapter.unsubscribe(topic);
    this.emit('handler-unsubscribed', { topic });
  }

  async request(topic: string, message: IMessage, timeout: number = 5000): Promise<IMessage> {
    return new Promise((resolve, reject) => {
      const replyTo = `reply.${message.id}`;

      // Set up reply handler
      const replyHandler = async (replyMessage: IMessage) => {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);
          await this.unsubscribe(replyTo);
          resolve(replyMessage);
        }
      };

      // Subscribe to reply topic
      this.subscribe(replyTo, replyHandler);

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        this.unsubscribe(replyTo);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      // Add reply-to header
      message.headers = {
        ...message.headers,
        replyTo
      };

      // Send request
      this.publish(topic, message).catch(reject);
    });
  }

  async reply(replyTo: string, message: IMessage): Promise<void> {
    await this.publish(replyTo, message);
  }

  private async handleIncomingMessage(topic: string, buffer: Buffer): Promise<void> {
    try {
      const message = this.deserialize(buffer);
      const handlers = this.handlers.get(topic);

      if (handlers) {
        const promises = Array.from(handlers).map(handler =>
          this.executeHandler(handler, message)
        );
        await Promise.allSettled(promises);
      }

      this.emit('message-handled', { topic, message });
    } catch (error) {
      this.emit('message-error', { topic, error });
    }
  }

  private async executeHandler(handler: MessageHandler, message: IMessage): Promise<void> {
    try {
      await handler(message);
    } catch (error) {
      this.emit('handler-error', { handler, message, error });
    }
  }

  private serialize(message: IMessage): Buffer {
    return Buffer.from(JSON.stringify(message));
  }

  private deserialize(buffer: Buffer): IMessage {
    return JSON.parse(buffer.toString());
  }
}