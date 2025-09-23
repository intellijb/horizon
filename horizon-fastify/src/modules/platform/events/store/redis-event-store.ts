import Redis from 'ioredis';
import { IEventStore } from '../core/interfaces';
import { IEventMetadata, IEventEnvelope, AggregateSnapshot } from '../core/types';
import { RedisClientManager } from '@modules/platform/redis/client-manager';

export interface RedisEventStoreConfig {
  ttl?: number; // Time to live in seconds
  maxEvents?: number; // Max events per stream
  snapshotInterval?: number; // Create snapshot every N events
}

export class RedisEventStore implements IEventStore {
  private client: Redis | null = null;
  private config: RedisEventStoreConfig;

  constructor(
    clientOrConfig?: Redis | RedisEventStoreConfig,
    config?: RedisEventStoreConfig
  ) {
    if (clientOrConfig && 'ttl' in clientOrConfig) {
      // Config passed as first parameter
      this.config = clientOrConfig;
    } else if (clientOrConfig) {
      // Redis client passed
      this.client = clientOrConfig as Redis;
      this.config = config || {};
    } else {
      this.config = config || {};
    }

    this.config = {
      ttl: this.config.ttl || 86400 * 30, // 30 days default
      maxEvents: this.config.maxEvents || 1000,
      snapshotInterval: this.config.snapshotInterval || 100,
    };
  }

  private async getClient(): Promise<Redis> {
    if (this.client) {
      return this.client;
    }

    // Try to use existing RedisClientManager
    try {
      const manager = RedisClientManager.getInstance();
      const client = manager.getClient();
      if (client) {
        this.client = client;
        return client;
      }
    } catch {
      // Fall back to creating new client
      this.client = new Redis({
        host: 'localhost',
        port: 6379,
        enableOfflineQueue: true,
      });
      return this.client;
    }

    throw new Error('Unable to get Redis client for EventStore');
  }

  async append(event: any, metadata: IEventMetadata): Promise<void> {
    const client = await this.getClient();
    const streamId = this.getStreamId(event, metadata);
    const eventKey = this.getEventKey(streamId);

    const envelope: IEventEnvelope = {
      event,
      metadata,
    };

    // Use Redis Stream for event storage
    await client.xadd(
      eventKey,
      'MAXLEN',
      '~',
      this.config.maxEvents!,
      '*',
      'data',
      JSON.stringify(envelope)
    );

    // Set TTL on the stream
    if (this.config.ttl) {
      await client.expire(eventKey, this.config.ttl);
    }

    // Store by event type for querying
    const typeKey = this.getEventTypeKey(metadata.eventId);
    await client.zadd(typeKey, metadata.timestamp.getTime(), JSON.stringify(envelope));

    // Store by correlation ID if present
    if (metadata.correlationId) {
      const correlationKey = this.getCorrelationKey(metadata.correlationId);
      await client.zadd(correlationKey, metadata.timestamp.getTime(), JSON.stringify(envelope));
    }

    // Check if snapshot is needed
    const version = await this.getLastEventVersion(streamId);
    if (version > 0 && version % this.config.snapshotInterval! === 0) {
      await this.createSnapshot(streamId, event, version);
    }
  }

  async appendBatch(events: Array<{ event: any; metadata: IEventMetadata }>): Promise<void> {
    const client = await this.getClient();
    const pipeline = client.pipeline();

    for (const { event, metadata } of events) {
      const streamId = this.getStreamId(event, metadata);
      const eventKey = this.getEventKey(streamId);

      const envelope: IEventEnvelope = {
        event,
        metadata,
      };

      const data = JSON.stringify(envelope);

      // Add to stream
      pipeline.xadd(
        eventKey,
        'MAXLEN',
        '~',
        this.config.maxEvents!,
        '*',
        'data',
        data
      );

      // Set TTL
      if (this.config.ttl) {
        pipeline.expire(eventKey, this.config.ttl);
      }

      // Store by type
      const typeKey = this.getEventTypeKey(metadata.eventId);
      pipeline.zadd(typeKey, metadata.timestamp.getTime(), data);

      // Store by correlation ID
      if (metadata.correlationId) {
        const correlationKey = this.getCorrelationKey(metadata.correlationId);
        pipeline.zadd(correlationKey, metadata.timestamp.getTime(), data);
      }
    }

    await pipeline.exec();
  }

  async getEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<IEventEnvelope[]> {
    const client = await this.getClient();
    const eventKey = this.getEventKey(streamId);

    // Get all events from stream
    const entries = await client.xrange(eventKey, '-', '+');

    const events: IEventEnvelope[] = [];
    let version = 0;

    for (const [, fields] of entries) {
      version++;

      if (fromVersion && version < fromVersion) {
        continue;
      }

      if (toVersion && version > toVersion) {
        break;
      }

      const data = fields.find((_, i) => i % 2 === 1 && fields[i - 1] === 'data');
      if (data) {
        const envelope = JSON.parse(data);
        events.push(envelope);
      }
    }

    return events;
  }

  async getEventsByType<T>(
    eventType: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<T[]> {
    const client = await this.getClient();
    const typeKey = this.getEventTypeKey(eventType);

    // Get events sorted by timestamp
    const results = await client.zrange(typeKey, offset, offset + limit - 1);

    return results.map(data => {
      const envelope = JSON.parse(data);
      return envelope.event as T;
    });
  }

  async getEventsByCorrelationId(correlationId: string): Promise<IEventEnvelope[]> {
    const client = await this.getClient();
    const correlationKey = this.getCorrelationKey(correlationId);

    // Get all events with this correlation ID
    const results = await client.zrange(correlationKey, 0, -1);

    return results.map(data => JSON.parse(data) as IEventEnvelope);
  }

  async saveSnapshot(snapshot: AggregateSnapshot): Promise<void> {
    const client = await this.getClient();
    const snapshotKey = this.getSnapshotKey(snapshot.aggregateId);

    await client.set(
      snapshotKey,
      JSON.stringify(snapshot),
      'EX',
      this.config.ttl
    );
  }

  async getSnapshot(aggregateId: string): Promise<AggregateSnapshot | null> {
    const client = await this.getClient();
    const snapshotKey = this.getSnapshotKey(aggregateId);

    const data = await client.get(snapshotKey);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as AggregateSnapshot;
  }

  async getLastEventVersion(streamId: string): Promise<number> {
    const client = await this.getClient();
    const eventKey = this.getEventKey(streamId);

    // Get stream info
    const info = await client.xinfo('STREAM', eventKey).catch(() => null);
    if (!info) {
      return 0;
    }

    // The length is at index 1 in the info array
    const length = info[1] as number;
    return length;
  }

  async deleteStream(streamId: string): Promise<void> {
    const client = await this.getClient();
    const eventKey = this.getEventKey(streamId);
    const snapshotKey = this.getSnapshotKey(streamId);

    await client.del(eventKey, snapshotKey);
  }

  private async createSnapshot(
    streamId: string,
    currentState: any,
    version: number
  ): Promise<void> {
    const snapshot: AggregateSnapshot = {
      aggregateId: streamId,
      version,
      data: currentState,
      timestamp: new Date(),
    };

    await this.saveSnapshot(snapshot);
  }

  private getStreamId(event: any, metadata: IEventMetadata): string {
    // Try to get stream ID from various sources
    if (event.aggregateId) {
      return event.aggregateId;
    }
    if (event.streamId) {
      return event.streamId;
    }
    if (metadata.userId) {
      return `user:${metadata.userId}`;
    }
    return `global`;
  }

  private getEventKey(streamId: string): string {
    return `events:stream:${streamId}`;
  }

  private getEventTypeKey(eventType: string): string {
    return `events:type:${eventType}`;
  }

  private getCorrelationKey(correlationId: string): string {
    return `events:correlation:${correlationId}`;
  }

  private getSnapshotKey(aggregateId: string): string {
    return `events:snapshot:${aggregateId}`;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}