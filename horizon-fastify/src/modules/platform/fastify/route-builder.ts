import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  withErrorHandling,
  handleControllerResult,
  requireAuth,
  DomainError,
  ControllerResult,
} from "./route-handlers";

// Common route handler types
export type RouteHandler<T = any> = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<T>;
export type AuthenticatedHandler<T = any> = (
  request: FastifyRequest,
  reply: FastifyReply,
  token: string
) => Promise<T>;

// Route configuration
export interface RouteConfig {
  path: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  tags: string[];
  summary: string;
  description: string;
  requireAuth?: boolean;
}

// Schema configuration
export interface SchemaConfig {
  body?: any;
  params?: any;
  querystring?: any;
  response?: Record<number, any>;
}

/**
 * Fluent route builder for enhanced readability
 */
export class RouteBuilder {
  private fastify: FastifyInstance;
  private config: RouteConfig;
  private schema: SchemaConfig = {};
  private errorClass?: new (...args: any[]) => DomainError;

  constructor(fastify: FastifyInstance, config: RouteConfig) {
    this.fastify = fastify;
    this.config = config;
  }

  /**
   * Add request body schema
   */
  withBody(bodySchema: any): RouteBuilder {
    this.schema.body = bodySchema;
    return this;
  }

  /**
   * Add request params schema
   */
  withParams(paramsSchema: any): RouteBuilder {
    this.schema.params = paramsSchema;
    return this;
  }

  /**
   * Add querystring schema
   */
  withQuery(querySchema: any): RouteBuilder {
    this.schema.querystring = querySchema;
    return this;
  }

  /**
   * Add response schemas
   */
  withResponses(responses: Record<number, any>): RouteBuilder {
    this.schema.response = responses;
    return this;
  }

  /**
   * Set error class for domain-specific error handling
   */
  withErrorClass(
    errorClass: new (...args: any[]) => DomainError
  ): RouteBuilder {
    this.errorClass = errorClass;
    return this;
  }

  /**
   * Register route with standard handler
   */
  handler(handlerFn: RouteHandler): void {
    const schema = {
      tags: this.config.tags,
      summary: this.config.summary,
      description: this.config.description,
      ...this.schema,
    };

    this.fastify[this.config.method](
      this.config.path,
      { schema },
      withErrorHandling(handlerFn, this.errorClass)
    );
  }

  /**
   * Register route with authenticated handler
   */
  authHandler(handlerFn: AuthenticatedHandler): void {
    if (!this.config.requireAuth) {
      throw new Error(
        "Route must be configured with requireAuth: true to use authHandler"
      );
    }

    const schema = {
      tags: this.config.tags,
      summary: this.config.summary,
      description: this.config.description,
      ...this.schema,
    };

    this.fastify[this.config.method](
      this.config.path,
      { schema },
      withErrorHandling(requireAuth(handlerFn), this.errorClass)
    );
  }

  /**
   * Register route with controller result handling
   */
  controllerHandler(
    controllerFn: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<ControllerResult>
  ): void {
    this.handler(async (request, reply) => {
      const result = await controllerFn(request, reply);
      return handleControllerResult(result, reply);
    });
  }

  /**
   * Short alias for controllerHandler
   */
  handle(
    controllerFn: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<ControllerResult>
  ): void {
    this.controllerHandler(controllerFn);
  }

  /**
   * Register route with authenticated controller result handling
   */
  authControllerHandler(
    controllerFn: (
      request: FastifyRequest,
      reply: FastifyReply,
      token: string
    ) => Promise<ControllerResult>
  ): void {
    this.authHandler(async (request, reply, token) => {
      const result = await controllerFn(request, reply, token);
      return handleControllerResult(result, reply);
    });
  }

  /**
   * Short alias for authControllerHandler
   */
  authHandle(
    controllerFn: (
      request: FastifyRequest,
      reply: FastifyReply,
      token: string
    ) => Promise<ControllerResult>
  ): void {
    this.authControllerHandler(controllerFn);
  }
}

/**
 * Create a new route builder
 */
export function createRoute(
  fastify: FastifyInstance,
  config: RouteConfig,
  defaultErrorClass?: new (...args: any[]) => DomainError
): RouteBuilder {
  const builder = new RouteBuilder(fastify, config);
  if (defaultErrorClass) {
    builder.withErrorClass(defaultErrorClass);
  }
  return builder;
}

/**
 * HTTP method-specific route builders
 */
createRoute.get = (
  fastify: FastifyInstance,
  config: Omit<RouteConfig, 'method'>,
  defaultErrorClass?: new (...args: any[]) => DomainError
): RouteBuilder => createRoute(fastify, { ...config, method: 'get' }, defaultErrorClass);

createRoute.post = (
  fastify: FastifyInstance,
  config: Omit<RouteConfig, 'method'>,
  defaultErrorClass?: new (...args: any[]) => DomainError
): RouteBuilder => createRoute(fastify, { ...config, method: 'post' }, defaultErrorClass);

createRoute.put = (
  fastify: FastifyInstance,
  config: Omit<RouteConfig, 'method'>,
  defaultErrorClass?: new (...args: any[]) => DomainError
): RouteBuilder => createRoute(fastify, { ...config, method: 'put' }, defaultErrorClass);

createRoute.patch = (
  fastify: FastifyInstance,
  config: Omit<RouteConfig, 'method'>,
  defaultErrorClass?: new (...args: any[]) => DomainError
): RouteBuilder => createRoute(fastify, { ...config, method: 'patch' }, defaultErrorClass);

createRoute.delete = (
  fastify: FastifyInstance,
  config: Omit<RouteConfig, 'method'>,
  defaultErrorClass?: new (...args: any[]) => DomainError
): RouteBuilder => createRoute(fastify, { ...config, method: 'delete' }, defaultErrorClass);

/**
 * Create routes factory with shared configuration
 */
export function createRoutesFactory(
  fastify: FastifyInstance,
  sharedConfig: {
    tags?: string[];
    errorClass?: new (...args: any[]) => DomainError;
  }
) {
  const factory = {
    get: (path: string, config: Omit<RouteConfig, 'method' | 'tags' | 'path'> & { tags?: string[] }): RouteBuilder =>
      createRoute.get(fastify, { ...config, path, tags: config.tags || sharedConfig.tags || [] }, sharedConfig.errorClass),

    post: (path: string, config: Omit<RouteConfig, 'method' | 'tags' | 'path'> & { tags?: string[] }): RouteBuilder =>
      createRoute.post(fastify, { ...config, path, tags: config.tags || sharedConfig.tags || [] }, sharedConfig.errorClass),

    put: (path: string, config: Omit<RouteConfig, 'method' | 'tags' | 'path'> & { tags?: string[] }): RouteBuilder =>
      createRoute.put(fastify, { ...config, path, tags: config.tags || sharedConfig.tags || [] }, sharedConfig.errorClass),

    patch: (path: string, config: Omit<RouteConfig, 'method' | 'tags' | 'path'> & { tags?: string[] }): RouteBuilder =>
      createRoute.patch(fastify, { ...config, path, tags: config.tags || sharedConfig.tags || [] }, sharedConfig.errorClass),

    delete: (path: string, config: Omit<RouteConfig, 'method' | 'tags' | 'path'> & { tags?: string[] }): RouteBuilder =>
      createRoute.delete(fastify, { ...config, path, tags: config.tags || sharedConfig.tags || [] }, sharedConfig.errorClass),
  };

  return factory;
}

// Common error schema using Zod
const errorResponseSchema = z.object({
  error: z.string(),
})

/**
 * Common response schema patterns
 * These work with fastify-type-provider-zod and use Zod schemas
 */
export const commonResponses = {
  // Basic error responses using Zod schemas
  error: () => ({
    400: errorResponseSchema,
  }),
  unauthorized: () => ({
    401: errorResponseSchema,
  }),
  forbidden: () => ({
    403: errorResponseSchema,
  }),
  notFound: () => ({
    404: errorResponseSchema,
  }),
  rateLimited: () => ({
    429: errorResponseSchema,
  }),
  noContent: () => ({
    204: z.null(),
  }),

  // These are deprecated - use direct schema assignment instead
  // Example: { 200: yourZodSchema, ...commonResponses.unauthorized() }
  success: (dataSchema?: any) => {
    console.warn("commonResponses.success() is deprecated. Use direct schema assignment: { 200: yourZodSchema }")
    return {
      200: dataSchema || {
        type: "object",
        additionalProperties: true,
        description: "Success response"
      },
    }
  },
  created: (dataSchema?: any) => {
    console.warn("commonResponses.created() is deprecated. Use direct schema assignment: { 201: yourZodSchema }")
    return {
      201: dataSchema || {
        type: "object",
        additionalProperties: true,
        description: "Created response"
      },
    }
  },
};
