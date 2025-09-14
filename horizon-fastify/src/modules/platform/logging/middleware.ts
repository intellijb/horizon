import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import fp from "fastify-plugin";
import {
  requestContext,
  generateCorrelationId,
  createStructuredLogger,
  type LogContext,
  type RequestLogData,
  type ResponseLogData,
} from "./index";
import { loggingConfig } from "@config";

// Constants
const CORRELATION_HEADER = "x-correlation-id";
const REQUEST_ID_HEADER = "x-request-id";
const TRACE_ID_HEADER = "x-trace-id";

// Type declarations moved to src/types/fastify.d.ts

// Extract user context from request
function extractUserContext(request: FastifyRequest): Partial<LogContext> {
  const context: Partial<LogContext> = {};

  // Extract user ID from JWT payload if available
  if (request.user && typeof request.user === 'object' && 'id' in request.user) {
    context.userId = (request.user as any).id;
  }

  // Extract session ID from headers or cookies
  const sessionId =
    request.headers["x-session-id"] || request.cookies?.sessionId;
  if (sessionId) {
    context.sessionId = sessionId as string;
  }

  return context;
}

// Create request context
function createRequestContext(request: FastifyRequest): LogContext {
  // Generate or use existing correlation ID
  const correlationId =
    (request.headers[CORRELATION_HEADER] as string) ||
    (request.headers[REQUEST_ID_HEADER] as string) ||
    generateCorrelationId();

  // Generate or use existing trace ID
  const traceId =
    (request.headers[TRACE_ID_HEADER] as string) || generateCorrelationId();

  const userContext = extractUserContext(request);

  return {
    requestId: correlationId,
    correlationId,
    traceId,
    method: request.method,
    url: request.url,
    userAgent: request.headers["user-agent"],
    ip: request.ip,
    ...userContext,
  };
}

// Create request log data
function createRequestLogData(request: FastifyRequest): RequestLogData {
  const headers = loggingConfig.requestHeaders
    ? Object.fromEntries(
        Object.entries(request.headers)
          .filter(
            ([key]) =>
              !loggingConfig.redactPaths.some((path) =>
                path.toLowerCase().includes(key.toLowerCase())
              )
          )
          .map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(", ") : value || "",
          ])
      )
    : undefined;

  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers["user-agent"],
    ip: request.ip,
    headers,
    query:
      request.query && Object.keys(request.query as object).length > 0
        ? (request.query as Record<string, any>)
        : undefined,
    params:
      request.params && Object.keys(request.params as object).length > 0
        ? (request.params as Record<string, any>)
        : undefined,
    body: request.body,
  };
}

// Create response log data
function createResponseLogData(
  request: FastifyRequest,
  reply: FastifyReply
): ResponseLogData {
  const responseTime = request.startTime
    ? Number(process.hrtime.bigint() - BigInt(request.startTime)) / 1000000 // Convert to ms
    : 0;

  return {
    statusCode: reply.statusCode,
    responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
    headers: loggingConfig.responseEnabled
      ? Object.fromEntries(
          Object.entries(reply.getHeaders()).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(", ") : String(value),
          ])
        )
      : undefined,
  };
}

// Correlation middleware plugin
async function correlationMiddleware(fastify: any) {
  // onRequest hook to set start time early in the request lifecycle
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Record start time for response time calculation
      request.startTime = process.hrtime.bigint();
    }
  );

  // Pre-handler hook to set up request context
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {

      // Create request context
      const context = createRequestContext(request);

      // Store context in async local storage
      requestContext.enterWith(context);

      // Attach correlation ID and request ID to request
      request.requestId = context.requestId!;
      request.correlationId = context.correlationId;

      // Create request-scoped logger
      request.logger = createStructuredLogger(context);

      // Add correlation headers to response
      reply.header(CORRELATION_HEADER, context.correlationId);
      reply.header(REQUEST_ID_HEADER, context.requestId);
      reply.header(TRACE_ID_HEADER, context.traceId!);

      // Log incoming request if enabled
      if (loggingConfig.requestEnabled) {
        const requestLogData = createRequestLogData(request);
        request.logger.request(requestLogData, "Incoming request");
      }
    }
  );

  // Response hook to log outgoing response
  fastify.addHook(
    "onSend",
    async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      if (loggingConfig.responseEnabled && request.logger) {
        const responseLogData = createResponseLogData(request, reply);

        // Add response body for logging if it's not too large
        if (payload && typeof payload === "string" && payload.length < 1000) {
          responseLogData.body = payload;
        } else if (payload && typeof payload === "object") {
          responseLogData.body = payload;
        }

        request.logger.response(responseLogData, "Outgoing response");
      }

      return payload;
    }
  );

  // Error hook to log errors with context
  fastify.addHook(
    "onError",
    async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const context = requestContext.getStore();
      const logger = request.logger || createStructuredLogger(context);

      logger.error(
        {
          err: error,
          req: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body,
          },
          res: {
            statusCode: reply.statusCode,
          },
        },
        "Request error occurred"
      );
    }
  );

  // Request completion hook for cleanup
  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const responseLogData = createResponseLogData(request, reply);

      // Log performance metrics for slow requests
      if (responseLogData.responseTime > 1000) {
        request.logger.performance(
          "request_duration",
          responseLogData.responseTime,
          "ms",
          {
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
          }
        );
      }

      // Log request completion
      request.logger.debug(
        {
          requestId: request.requestId,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: responseLogData.responseTime,
        },
        "Request completed"
      );
    }
  );
}

export default fp(correlationMiddleware, {
  name: "correlation-middleware",
  dependencies: [],
});
