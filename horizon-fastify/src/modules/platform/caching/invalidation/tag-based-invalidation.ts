import Redis from 'ioredis';

export class TagBasedInvalidation {
  private readonly TAG_PREFIX = 'tag:';
  private readonly KEY_PREFIX = 'key:';

  constructor(private cache: Redis) {}

  /**
   * Associate tags with a cache key
   */
  async tagKey(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    const pipeline = this.cache.pipeline();

    // For each tag, add the key to the tag's set
    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      pipeline.sadd(tagKey, key);
    }

    // Store tags associated with the key for cleanup
    const keyTagsKey = this.getKeyTagsKey(key);
    pipeline.sadd(keyTagsKey, ...tags);

    await pipeline.exec();
  }

  /**
   * Get all keys associated with given tags
   */
  async getKeysByTags(tags: string[]): Promise<string[]> {
    if (tags.length === 0) return [];

    if (tags.length === 1) {
      // Single tag - simple set members
      const tagKey = this.getTagKey(tags[0]);
      return await this.cache.smembers(tagKey);
    }

    // Multiple tags - get intersection
    const tagKeys = tags.map(tag => this.getTagKey(tag));
    return await this.cache.sinter(...tagKeys);
  }

  /**
   * Invalidate all keys associated with given tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const keys = await this.getKeysByTags(tags);

    if (keys.length === 0) return 0;

    // Delete the actual cache keys
    await this.cache.del(...keys);

    // Clean up tag associations
    for (const key of keys) {
      await this.removeKeyFromTags(key);
    }

    return keys.length;
  }

  /**
   * Invalidate a single key and clean up its tag associations
   */
  async invalidateKey(key: string): Promise<void> {
    // Delete the cache key
    await this.cache.del(key);

    // Clean up tag associations
    await this.removeKeyFromTags(key);
  }

  /**
   * Remove a key from all its associated tags
   */
  private async removeKeyFromTags(key: string): Promise<void> {
    const keyTagsKey = this.getKeyTagsKey(key);
    const tags = await this.cache.smembers(keyTagsKey);

    if (tags.length === 0) return;

    const pipeline = this.cache.pipeline();

    // Remove key from each tag's set
    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      pipeline.srem(tagKey, key);
    }

    // Delete the key's tags set
    pipeline.del(keyTagsKey);

    await pipeline.exec();
  }

  /**
   * Get all tags associated with a key
   */
  async getKeyTags(key: string): Promise<string[]> {
    const keyTagsKey = this.getKeyTagsKey(key);
    return await this.cache.smembers(keyTagsKey);
  }

  /**
   * Clean up empty tag sets
   */
  async cleanup(): Promise<void> {
    const pattern = `${this.TAG_PREFIX}*`;
    const tagKeys = await this.cache.keys(pattern);

    const pipeline = this.cache.pipeline();

    for (const tagKey of tagKeys) {
      const members = await this.cache.scard(tagKey);
      if (members === 0) {
        pipeline.del(tagKey);
      }
    }

    await pipeline.exec();
  }

  /**
   * Get statistics about tags
   */
  async getStats(): Promise<{
    totalTags: number;
    tagSizes: Map<string, number>;
    totalTaggedKeys: number;
  }> {
    const pattern = `${this.TAG_PREFIX}*`;
    const tagKeys = await this.cache.keys(pattern);

    const tagSizes = new Map<string, number>();
    let totalTaggedKeys = new Set<string>();

    for (const tagKey of tagKeys) {
      const tag = tagKey.substring(this.TAG_PREFIX.length);
      const members = await this.cache.smembers(tagKey);
      tagSizes.set(tag, members.length);
      members.forEach(key => totalTaggedKeys.add(key));
    }

    return {
      totalTags: tagKeys.length,
      tagSizes,
      totalTaggedKeys: totalTaggedKeys.size
    };
  }

  private getTagKey(tag: string): string {
    return `${this.TAG_PREFIX}${tag}`;
  }

  private getKeyTagsKey(key: string): string {
    return `${this.KEY_PREFIX}tags:${key}`;
  }
}

/**
 * Advanced invalidation strategies
 */
export class InvalidationStrategies {
  constructor(
    private cache: Redis,
    private tagInvalidation: TagBasedInvalidation
  ) {}

  /**
   * Time-based invalidation with sliding window
   */
  async invalidateOlderThan(pattern: string, ageInSeconds: number): Promise<number> {
    const keys = await this.cache.keys(pattern);
    let invalidated = 0;

    for (const key of keys) {
      const ttl = await this.cache.ttl(key);
      // TODO: Fix Redis object idletime command type support
      // const age = await this.cache.object('idletime', key);

      // For now, use TTL as a simple age approximation
      const maxTTL = ageInSeconds;
      if (ttl > 0 && ttl < maxTTL) {
        await this.cache.del(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate by pattern with confirmation
   */
  async invalidatePattern(
    pattern: string,
    confirmFn?: (key: string) => Promise<boolean>
  ): Promise<number> {
    const keys = await this.cache.keys(pattern);
    let invalidated = 0;

    for (const key of keys) {
      if (!confirmFn || await confirmFn(key)) {
        await this.cache.del(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Cascade invalidation - invalidate related keys
   */
  async cascadeInvalidate(
    key: string,
    relatedPatterns: string[]
  ): Promise<number> {
    let invalidated = 1;

    // Invalidate the main key
    await this.cache.del(key);

    // Invalidate related keys
    for (const pattern of relatedPatterns) {
      const relatedKeys = await this.cache.keys(pattern.replace('{key}', key));
      if (relatedKeys.length > 0) {
        await this.cache.del(...relatedKeys);
        invalidated += relatedKeys.length;
      }
    }

    return invalidated;
  }

  /**
   * Smart invalidation based on memory pressure
   */
  async smartInvalidate(targetMemoryMB: number): Promise<number> {
    const info = await this.cache.info('memory');
    const usedMemoryMatch = info.match(/used_memory:(\d+)/);

    if (!usedMemoryMatch) return 0;

    const usedMemoryBytes = parseInt(usedMemoryMatch[1]);
    const usedMemoryMB = usedMemoryBytes / (1024 * 1024);

    if (usedMemoryMB <= targetMemoryMB) return 0;

    // Get all keys sorted by TTL (LRU approximation)
    const keys = await this.cache.keys('*');
    const keyTTLs: Array<{ key: string; ttl: number }> = [];

    for (const key of keys) {
      const ttl = await this.cache.ttl(key);
      if (ttl > 0) {
        keyTTLs.push({ key, ttl });
      }
    }

    // Sort by TTL (shortest first - these are likely oldest)
    keyTTLs.sort((a, b) => a.ttl - b.ttl);

    // Invalidate oldest keys until target memory is reached
    let invalidated = 0;
    for (const { key } of keyTTLs) {
      await this.cache.del(key);
      invalidated++;

      // Check if target reached (simplified - in production, check actual memory)
      if (invalidated > keyTTLs.length * 0.2) {
        break;
      }
    }

    return invalidated;
  }
}