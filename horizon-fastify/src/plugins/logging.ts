import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { 
  logger,
  createStructuredLogger,
  structuredLogger,
  requestContext,
  generateCorrelationId,
  type LogContext 
} from '@modules/logging';
import correlationMiddleware from '@modules/logging/middleware';

declare module 'fastify' {
  interface FastifyInstance {
    structuredLogger: typeof structuredLogger;
    createLogger: typeof createStructuredLogger;
    generateCorrelationId: typeof generateCorrelationId;
    getRequestContext: () => LogContext | undefined;
  }
}

async function loggingPlugin(fastify: FastifyInstance) {
  // Register correlation middleware first
  await fastify.register(correlationMiddleware);
  
  // Decorate fastify instance with logging utilities
  fastify.decorate('structuredLogger', structuredLogger);
  fastify.decorate('createLogger', createStructuredLogger);
  fastify.decorate('generateCorrelationId', generateCorrelationId);
  fastify.decorate('getRequestContext', () => requestContext.getStore());
  
  // Replace default fastify logger with our structured logger
  fastify.log = logger;
  
  fastify.log.info('Structured logging system initialized');
}

export default fp(loggingPlugin, {
  name: 'logging',
  dependencies: [],
});