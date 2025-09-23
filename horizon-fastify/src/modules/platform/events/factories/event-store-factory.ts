import { IEventStore } from '../core/interfaces';
import { EventStoreConfig } from '../core/types';
import { RedisEventStore } from '../store/redis-event-store';
import { InMemoryEventStore } from '../store/in-memory-event-store';

export class EventStoreFactory {
  private static stores: Map<string, IEventStore> = new Map();

  static create(config: EventStoreConfig): IEventStore {
    const key = this.getStoreKey(config);

    // Check if we already have this store instance
    if (this.stores.has(key)) {
      return this.stores.get(key)!;
    }

    let store: IEventStore;

    switch (config.type) {
      case 'redis':
        store = new RedisEventStore(config.redis);
        break;

      case 'postgres':
        // Placeholder for future PostgreSQL implementation
        store = this.createPostgresStore(config.postgres);
        break;

      case 'dynamodb':
        // Placeholder for future DynamoDB implementation
        store = this.createDynamoDBStore(config.dynamodb);
        break;

      case 'in-memory':
        store = new InMemoryEventStore();
        break;

      default:
        throw new Error(`Unknown event store type: ${config.type}`);
    }

    // Cache the store instance
    this.stores.set(key, store);

    return store;
  }

  private static getStoreKey(config: EventStoreConfig): string {
    const parts = [config.type];

    if (config.redis) {
      parts.push(`ttl:${config.redis.ttl}`, `max:${config.redis.maxEvents}`);
    } else if (config.postgres) {
      parts.push(`table:${config.postgres.table || 'events'}`);
    } else if (config.dynamodb) {
      parts.push(`table:${config.dynamodb.table}`, `region:${config.dynamodb.region}`);
    }

    return parts.join(':');
  }

  private static createPostgresStore(config: any): IEventStore {
    // Stub implementation for PostgreSQL - to be implemented when needed
    console.warn('PostgreSQL event store not yet implemented, using in-memory store as fallback');
    return new InMemoryEventStore();

    // Future implementation:
    // import { PostgresEventStore } from '../store/postgres-event-store';
    // return new PostgresEventStore(config);
  }

  private static createDynamoDBStore(config: any): IEventStore {
    // Stub implementation for DynamoDB - to be implemented when needed
    console.warn('DynamoDB event store not yet implemented, using in-memory store as fallback');
    return new InMemoryEventStore();

    // Future implementation:
    // import { DynamoDBEventStore } from '../store/dynamodb-event-store';
    // return new DynamoDBEventStore(config);
  }

  static clearCache(): void {
    this.stores.clear();
  }

  static async closeAll(): Promise<void> {
    const promises = Array.from(this.stores.values()).map(store => {
      // Check if store has a close method
      if ('close' in store && typeof (store as any).close === 'function') {
        return (store as any).close().catch((err: Error) =>
          console.error('Error closing event store:', err)
        );
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    this.clearCache();
  }
}