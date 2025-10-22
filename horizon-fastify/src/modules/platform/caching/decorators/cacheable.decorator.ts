import 'reflect-metadata';
import { CacheOptions } from '../interfaces';

const CACHE_METADATA_KEY = Symbol('cache:metadata');

export interface CacheableOptions extends CacheOptions {
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
  unless?: (result: any) => boolean;
}

/**
 * Decorator to cache method results
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: any[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : generateDefaultKey(className, methodName, args);

      // Get cache manager (should be injected)
      const cacheManager = (this as any).cacheManager || getCacheManager();
      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }

      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check unless condition
      if (options.unless && options.unless(result)) {
        return result;
      }

      // Store in cache
      await cacheManager.set(cacheKey, result, options);

      return result;
    };

    // Store metadata for later use
    // TODO: Reflect.defineMetadata is not available in runtime - needs reflect-metadata polyfill
    // Reflect.defineMetadata(CACHE_METADATA_KEY, options, target, propertyKey);

    return descriptor;
  };
}

/**
 * Decorator to invalidate cache on method execution
 */
export function CacheEvict(options: {
  keys?: string[];
  keyGenerator?: (...args: any[]) => string | string[];
  allEntries?: boolean;
  beforeInvocation?: boolean;
}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = (this as any).cacheManager || getCacheManager();
      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }

      const evict = async () => {
        if (options.allEntries) {
          await cacheManager.flush();
        } else if (options.keyGenerator) {
          const keys = options.keyGenerator(...args);
          const keysArray = Array.isArray(keys) ? keys : [keys];
          await cacheManager.invalidate(keysArray);
        } else if (options.keys) {
          await cacheManager.invalidate(options.keys);
        }
      };

      if (options.beforeInvocation) {
        await evict();
      }

      const result = await originalMethod.apply(this, args);

      if (!options.beforeInvocation) {
        await evict();
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to update cache with method result
 */
export function CachePut(options: {
  key?: string;
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
  ttl?: number;
}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    descriptor.value = async function (...args: any[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      const result = await originalMethod.apply(this, args);

      const cacheManager = (this as any).cacheManager || getCacheManager();
      if (!cacheManager) {
        return result;
      }

      // Generate cache key
      const cacheKey = options.key ||
        (options.keyGenerator ? options.keyGenerator(...args) :
          generateDefaultKey(className, methodName, args));

      // Update cache
      await cacheManager.set(cacheKey, result, { ttl: options.ttl });

      return result;
    };

    return descriptor;
  };
}

/**
 * Class decorator to enable caching for all methods
 */
export function CacheConfig(options: {
  cacheManager?: any;
  keyPrefix?: string;
  defaultTTL?: number;
}): ClassDecorator {
  return (target: any) => {
    // Store cache configuration on the class
    target.prototype.cacheConfig = options;

    // Inject cache manager if provided
    if (options.cacheManager) {
      target.prototype.cacheManager = options.cacheManager;
    }

    return target;
  };
}

function generateDefaultKey(className: string, methodName: string, args: any[]): string {
  const argsKey = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(':');

  return `${className}:${methodName}:${argsKey}`;
}

// Global cache manager getter (should be replaced with DI)
let globalCacheManager: any = null;

export function setCacheManager(manager: any): void {
  globalCacheManager = manager;
}

function getCacheManager(): any {
  return globalCacheManager;
}