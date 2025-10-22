import { ICacheStrategy } from '../interfaces';
import Redis from 'ioredis';

export class WriteThroughStrategy implements ICacheStrategy {
  constructor(
    private cache: Redis,
    private dataStore: IDataStore,
    private defaultTTL: number = 3600
  ) {}

  async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.cache.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        await this.cache.del(key);
      }
    }

    // Fetch from data store
    const data = await fetchFunction();

    // Update cache
    await this.set(key, data, ttl);

    return data;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Write to both cache and data store simultaneously
    await Promise.all([
      this.writeToCache(key, value, ttl),
      this.writeToDataStore(key, value)
    ]);
  }

  private async writeToCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    const finalTTL = ttl || this.defaultTTL;
    const serialized = JSON.stringify(value);

    if (finalTTL > 0) {
      await this.cache.setex(key, finalTTL, serialized);
    } else {
      await this.cache.set(key, serialized);
    }
  }

  private async writeToDataStore<T>(key: string, value: T): Promise<void> {
    await this.dataStore.save(key, value);
  }

  async invalidate(key: string): Promise<void> {
    // Remove from both cache and data store
    await Promise.all([
      this.cache.del(key),
      this.dataStore.delete(key)
    ]);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await Promise.all([
        this.cache.del(...keys),
        Promise.all(keys.map(key => this.dataStore.delete(key)))
      ]);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.cache.exists(key);
    return result === 1;
  }

  async getTTL(key: string): Promise<number> {
    return await this.cache.ttl(key);
  }

  async touch(key: string, ttl?: number): Promise<boolean> {
    const finalTTL = ttl || this.defaultTTL;
    const result = await this.cache.expire(key, finalTTL);
    return result === 1;
  }
}

interface IDataStore {
  save(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<any>;
}