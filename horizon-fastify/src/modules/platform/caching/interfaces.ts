export interface ICacheStrategy {
  get<T>(key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getTTL(key: string): Promise<number>;
  touch(key: string, ttl?: number): Promise<boolean>;
}

export interface ICacheManager {
  get<T>(key: string, fetchFunction?: () => Promise<T>, options?: CacheOptions): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  invalidate(keys: string | string[]): Promise<void>;
  invalidateByTags(tags: string[]): Promise<void>;
  flush(): Promise<void>;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  strategy?: 'cache-aside' | 'write-through' | 'write-behind';
  compress?: boolean;
  version?: number;
}

export interface CacheEntry<T = any> {
  value: T;
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  key: string;
  createdAt: Date;
  expiresAt?: Date;
  tags: string[];
  version: number;
  hits: number;
  lastAccessed: Date;
  compressed: boolean;
}

export interface ICacheSerializer {
  serialize<T>(value: T): string | Buffer;
  deserialize<T>(data: string | Buffer): T;
}

export interface ICacheCompressor {
  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
}