import { EventEmitter } from 'events';
import { IQuery, IQueryBus, IQueryHandler, IQueryValidator } from './core/interfaces';
import { randomUUID } from 'crypto';

export class QueryBus extends EventEmitter implements IQueryBus {
  private handlers = new Map<string, IQueryHandler<any, any>>();
  private validators = new Map<string, IQueryValidator<any>>();
  private middleware: Array<(query: IQuery) => Promise<void>> = [];
  private cache = new Map<string, { result: any; expiry: Date }>();

  constructor(private enableCache: boolean = false) {
    super();
  }

  async execute<TQuery extends IQuery, TResult>(
    query: TQuery
  ): Promise<TResult> {
    const queryType = query.constructor.name;

    // Add metadata if not present
    if (!query.queryId) {
      (query as any).queryId = randomUUID();
    }
    if (!query.timestamp) {
      (query as any).timestamp = new Date();
    }

    this.emit('query-received', query);

    try {
      // Check cache if enabled
      if (this.enableCache) {
        const cacheKey = this.getCacheKey(query);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiry > new Date()) {
          this.emit('query-cache-hit', { query, result: cached.result });
          return cached.result;
        }
      }

      // Run validation if validator exists
      const validator = this.validators.get(queryType);
      if (validator) {
        const validation = await validator.validate(query);
        if (!validation.isValid) {
          throw new QueryValidationError(validation.errors || ['Validation failed']);
        }
      }

      // Run middleware
      for (const mw of this.middleware) {
        await mw(query);
      }

      // Get handler
      const handler = this.handlers.get(queryType);
      if (!handler) {
        throw new Error(`No handler registered for query: ${queryType}`);
      }

      // Execute query
      const result = await handler.execute(query);

      // Cache result if enabled
      if (this.enableCache) {
        const cacheKey = this.getCacheKey(query);
        const expiry = new Date(Date.now() + 60000); // 1 minute default
        this.cache.set(cacheKey, { result, expiry });
      }

      this.emit('query-executed', {
        query,
        result,
        executedAt: new Date()
      });

      return result;
    } catch (error) {
      this.emit('query-failed', {
        query,
        error,
        failedAt: new Date()
      });
      throw error;
    }
  }

  register<TQuery extends IQuery, TResult>(
    queryType: new (...args: any[]) => TQuery,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    const queryName = queryType.name;
    if (this.handlers.has(queryName)) {
      throw new Error(`Handler already registered for query: ${queryName}`);
    }
    this.handlers.set(queryName, handler);
    this.emit('handler-registered', { queryType: queryName });
  }

  registerValidator<TQuery extends IQuery>(
    queryType: new (...args: any[]) => TQuery,
    validator: IQueryValidator<TQuery>
  ): void {
    this.validators.set(queryType.name, validator);
  }

  use(middleware: (query: IQuery) => Promise<void>): void {
    this.middleware.push(middleware);
  }

  unregister(queryType: new (...args: any[]) => any): void {
    const queryName = queryType.name;
    this.handlers.delete(queryName);
    this.validators.delete(queryName);
    this.emit('handler-unregistered', { queryType: queryName });
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(query: IQuery): string {
    return JSON.stringify({
      type: query.constructor.name,
      ...query
    });
  }

  getHandlers(): Map<string, IQueryHandler<any, any>> {
    return new Map(this.handlers);
  }

  clearHandlers(): void {
    this.handlers.clear();
    this.validators.clear();
  }
}

export class QueryValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Query validation failed: ${errors.join(', ')}`);
    this.name = 'QueryValidationError';
  }
}

export abstract class Query implements IQuery {
  readonly queryId: string;
  readonly timestamp: Date;
  readonly userId?: string;

  constructor(metadata?: Partial<IQuery>) {
    this.queryId = metadata?.queryId || randomUUID();
    this.timestamp = metadata?.timestamp || new Date();
    this.userId = metadata?.userId;
  }
}

export abstract class QueryHandler<TQuery extends IQuery, TResult>
  implements IQueryHandler<TQuery, TResult> {

  abstract execute(query: TQuery): Promise<TResult>;
}

// Decorator for query handlers
export function QueryHandlerDecorator<T extends { new(...args: any[]): {} }>(
  queryType: new (...args: any[]) => IQuery
) {
  return (constructor: T) => {
    // Auto-register handler when class is instantiated
    const originalConstructor = constructor;
    const newConstructor: any = function (...args: any[]) {
      const instance = new originalConstructor(...args);

      // Get global query bus if available
      const queryBus = (globalThis as any).queryBus;
      if (queryBus) {
        queryBus.register(queryType, instance);
      }

      return instance;
    };

    newConstructor.prototype = originalConstructor.prototype;
    return newConstructor;
  };
}