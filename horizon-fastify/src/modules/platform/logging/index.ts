import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { nanoid } from 'nanoid';
import { loggingConfig, isDevelopment, isProduction } from '@config';
import { createTransport } from './transports';

// Types
export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  operation?: string;
  module?: string;
  [key: string]: any;
}

export interface RequestLogData {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  params?: Record<string, any>;
}

export interface ResponseLogData {
  statusCode: number;
  responseTime: number;
  headers?: Record<string, string>;
  body?: any;
}

export interface DatabaseLogData {
  query: string;
  duration: number;
  rowCount?: number;
  parameters?: any[];
}

// Async local storage for request context
export const requestContext = new AsyncLocalStorage<LogContext>();

// Create base logger configuration
function createLoggerConfig() {
  const config: pino.LoggerOptions = {
    level: loggingConfig.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  };

  // Add redaction in production or if explicitly enabled
  if (loggingConfig.redactEnabled) {
    config.redact = {
      paths: [...loggingConfig.redactPaths],
      censor: '[REDACTED]',
    };
  }

  // Add transport based on environment
  const transport = createTransport();
  if (transport) {
    config.transport = transport;
  }

  // Production optimizations
  if (isProduction) {
    config.formatters = {
      ...config.formatters,
      log: (object) => {
        // Add correlation context to every log in production
        const context = requestContext.getStore();
        if (context) {
          return {
            ...object,
            requestId: context.requestId,
            userId: context.userId,
            traceId: context.traceId,
            operation: context.operation,
          };
        }
        return object;
      },
    };
  }

  return config;
}

// Create logger instance
export const logger = pino(createLoggerConfig());

// Helper functions for structured logging
export const createStructuredLogger = (baseContext: LogContext = {}) => {
  const contextLogger = logger.child(baseContext);

  return {
    trace: (obj: any, msg?: string, ...args: any[]) => contextLogger.trace(obj, msg, ...args),
    debug: (obj: any, msg?: string, ...args: any[]) => contextLogger.debug(obj, msg, ...args),
    info: (obj: any, msg?: string, ...args: any[]) => contextLogger.info(obj, msg, ...args),
    warn: (obj: any, msg?: string, ...args: any[]) => contextLogger.warn(obj, msg, ...args),
    error: (obj: any, msg?: string, ...args: any[]) => contextLogger.error(obj, msg, ...args),
    fatal: (obj: any, msg?: string, ...args: any[]) => contextLogger.fatal(obj, msg, ...args),

    // Specialized logging methods
    request: (data: RequestLogData, message?: string) => {
      if (!loggingConfig.requestEnabled) return;
      
      const logData = {
        req: {
          method: data.method,
          url: data.url,
          userAgent: data.userAgent,
          ip: data.ip,
          ...(loggingConfig.requestHeaders && data.headers ? { headers: data.headers } : {}),
          ...(data.body ? { body: data.body } : {}),
          ...(data.query ? { query: data.query } : {}),
          ...(data.params ? { params: data.params } : {}),
        },
      };

      contextLogger.info(logData, message || 'HTTP Request');
    },

    response: (data: ResponseLogData, message?: string) => {
      if (!loggingConfig.responseEnabled) return;

      const logData = {
        res: {
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          ...(data.headers ? { headers: data.headers } : {}),
          ...(data.body ? { body: data.body } : {}),
        },
      };

      const level = data.statusCode >= 500 ? 'error' : data.statusCode >= 400 ? 'warn' : 'info';
      contextLogger[level](logData, message || 'HTTP Response');
    },

    database: (data: DatabaseLogData, message?: string) => {
      if (!loggingConfig.sqlQueries) return;

      const logData = {
        db: {
          query: data.query,
          duration: data.duration,
          ...(data.rowCount !== undefined ? { rowCount: data.rowCount } : {}),
          ...(data.parameters ? { parameters: data.parameters } : {}),
        },
      };

      const level = data.duration > loggingConfig.slowQueriesMs ? 'warn' : 'debug';
      contextLogger[level](logData, message || 'Database Query');
    },

    operation: (operation: string, data?: any, message?: string) => {
      const logData = {
        operation,
        ...(data ? { data } : {}),
      };

      contextLogger.info(logData, message || `Operation: ${operation}`);
    },

    security: (event: string, data?: any, message?: string) => {
      const logData = {
        security: {
          event,
          ...(data ? { data } : {}),
        },
      };

      contextLogger.warn(logData, message || `Security Event: ${event}`);
    },

    performance: (metric: string, value: number, unit = 'ms', data?: any) => {
      const logData = {
        performance: {
          metric,
          value,
          unit,
          ...(data ? { data } : {}),
        },
      };

      contextLogger.info(logData, `Performance: ${metric} = ${value}${unit}`);
    },
  };
};

// Create request-aware logger
export const createRequestLogger = (context: LogContext) => {
  return requestContext.run(context, () => createStructuredLogger(context));
};

// Generate correlation ID
export const generateCorrelationId = () => nanoid(12);

// Get current request context
export const getCurrentContext = (): LogContext | undefined => {
  return requestContext.getStore();
};

// Update context within current request
export const updateContext = (updates: Partial<LogContext>) => {
  const current = requestContext.getStore();
  if (current) {
    Object.assign(current, updates);
  }
};

// Utility for wrapping async operations with context
export const withContext = <T>(context: LogContext, fn: () => Promise<T>): Promise<T> => {
  return requestContext.run(context, fn);
};

// Default structured logger instance
export const structuredLogger = createStructuredLogger();

// Export main logger for backward compatibility
export { logger as pinoLogger };
export default logger;