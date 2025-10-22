import { ICacheStrategy } from '../interfaces';
import Redis from 'ioredis';

export class CacheAsideStrategy implements ICacheStrategy {
  constructor(
    private cache: Redis,
    private defaultTTL: number = 3600 // 1 hour default
  ) {}

  async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.cache.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Invalid JSON, delete and fetch fresh
        await this.cache.del(key);
      }
    }

    // Cache miss - fetch from source
    const data = await fetchFunction();

    // Store in cache for future requests
    await this.set(key, data, ttl);

    return data;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const finalTTL = ttl || this.defaultTTL;
    const serialized = JSON.stringify(value);

    if (finalTTL > 0) {
      await this.cache.setex(key, finalTTL, serialized);
    } else {
      await this.cache.set(key, serialized);
    }
  }

  async invalidate(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
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

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const values = await this.cache.mget(...keys);
    const result = new Map<string, T | null>();

    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        try {
          result.set(key, JSON.parse(value) as T);
        } catch {
          result.set(key, null);
        }
      } else {
        result.set(key, null);
      }
    });

    return result;
  }

  async setMany<T>(items: Map<string, T>, ttl?: number): Promise<void> {
    const pipeline = this.cache.pipeline();
    const finalTTL = ttl || this.defaultTTL;

    for (const [key, value] of items.entries()) {
      const serialized = JSON.stringify(value);
      if (finalTTL > 0) {
        pipeline.setex(key, finalTTL, serialized);
      } else {
        pipeline.set(key, serialized);
      }
    }

    await pipeline.exec();
  }
}