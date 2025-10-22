import Redis from 'ioredis';
import { BaseBroker } from './base-broker';
import { RedisClientManager } from '@modules/platform/redis/client-manager';
import { BrokerConfig } from '../core/types';

export class RedisBroker extends BaseBroker {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private redisManager: RedisClientManager | null = null;
  private config: BrokerConfig['redis'];
  private subscribedTopics: Set<string> = new Set();

  constructor(config?: BrokerConfig['redis']) {
    super();
    this.config = {
      host: config?.host || 'localhost',
      port: config?.port || 6379,
      password: config?.password,
      db: config?.db || 0,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Try to use existing RedisClientManager if available
      try {
        this.redisManager = RedisClientManager.getInstance();
        const existingClient = this.redisManager.getClient();
        if (existingClient) {
          this.publisher = existingClient;
          this.subscriber = existingClient.duplicate();
        }
      } catch {
        // Create new Redis connections if manager not available
        this.publisher = new Redis({
          ...this.config,
          enableOfflineQueue: true,
          lazyConnect: false,
        });

        this.subscriber = new Redis({
          ...this.config,
          enableOfflineQueue: true,
          lazyConnect: false,
        });
      }

      if (!this.publisher || !this.subscriber) {
        throw new Error('Failed to create Redis clients');
      }

      this.setupSubscriberHandlers();

      // Test connection
      await this.publisher.ping();
      await this.subscriber.ping();

      this.onConnected();
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      // Unsubscribe from all topics
      for (const topic of this.subscribedTopics) {
        await this.subscriber?.unsubscribe(topic);
      }
      this.subscribedTopics.clear();

      // Close connections if not managed by RedisClientManager
      if (!this.redisManager) {
        await this.publisher?.quit();
        await this.subscriber?.quit();
      }

      this.publisher = null;
      this.subscriber = null;
      this.onDisconnected();
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  async publish(topic: string, message: Buffer): Promise<void> {
    if (!this.connected || !this.publisher) {
      throw new Error('Redis broker not connected');
    }

    try {
      const channel = this.formatTopic(topic);
      await this.publisher.publish(channel, message);
      this.metrics.publishedCount++;
      this.emit('message-published', topic, message);
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  async publishBatch(messages: Array<{ topic: string; message: Buffer }>): Promise<void> {
    if (!this.connected || !this.publisher) {
      throw new Error('Redis broker not connected');
    }

    try {
      const pipeline = this.publisher.pipeline();

      for (const { topic, message } of messages) {
        const channel = this.formatTopic(topic);
        pipeline.publish(channel, message);
      }

      await pipeline.exec();
      this.metrics.publishedCount += messages.length;
      this.emit('batch-published', messages.length);
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  protected async subscribeToTopic(topic: string): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Redis broker not connected');
    }

    const channel = this.formatTopic(topic);

    if (!this.subscribedTopics.has(channel)) {
      await this.subscriber.subscribe(channel);
      this.subscribedTopics.add(channel);
      this.emit('subscribed', topic);
    }
  }

  protected async unsubscribeFromTopic(topic: string): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    const channel = this.formatTopic(topic);

    if (this.subscribedTopics.has(channel)) {
      await this.subscriber.unsubscribe(channel);
      this.subscribedTopics.delete(channel);
      this.emit('unsubscribed', topic);
    }
  }

  private setupSubscriberHandlers(): void {
    if (!this.subscriber) {
      return;
    }

    this.subscriber.on('message', async (channel: string, message: string) => {
      const topic = this.extractTopic(channel);
      const buffer = Buffer.from(message);
      await this.handleMessage(topic, buffer);
    });

    this.subscriber.on('error', (error: Error) => {
      this.onError(error);
    });

    this.subscriber.on('connect', () => {
      this.emit('subscriber-connected');
    });

    this.subscriber.on('reconnecting', () => {
      this.emit('subscriber-reconnecting');
    });
  }

  private formatTopic(topic: string): string {
    return `events:${topic}`;
  }

  private extractTopic(channel: string): string {
    return channel.replace(/^events:/, '');
  }

  async getMetrics(): Promise<any> {
    const baseMetrics = await super.getMetrics();

    return {
      ...baseMetrics,
      subscribedTopics: Array.from(this.subscribedTopics),
      publisherStatus: this.publisher?.status,
      subscriberStatus: this.subscriber?.status,
    };
  }
}