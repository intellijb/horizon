import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import env from '@fastify/env';
import { config, configSchema, logConfigSummary, isDevelopment, isProduction, loggingConfig } from '@config';
import { logger } from '@modules/logging';
import loggingPlugin from '@/plugins/logging';
import helmetPlugin from '@/plugins/helmet';
import openApiPlugin from '@/plugins/openapi';
import connectionPoolPlugin from '@/plugins/connection-pool';
import postgresPlugin from '@/plugins/postgres';
import redisPlugin from '@/plugins/redis';
import drizzlePlugin from '@/plugins/drizzle';
import healthRoutes from '@/routes/health';
import testRoutes from '@/routes/test';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: string;
      PORT: number;
      HOST: string;
      POSTGRES_URI: string;
      REDIS_URL: string;
    };
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  // Log configuration summary in development
  if (isDevelopment) {
    logConfigSummary();
  }

  // Create Fastify instance with logger configuration
  const app = Fastify({
    logger: {
      level: loggingConfig.level,
      transport: loggingConfig.pretty && isDevelopment ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true,
        }
      } : undefined,
      redact: loggingConfig.redactEnabled ? {
        paths: loggingConfig.redactPaths,
        censor: '[REDACTED]',
      } : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: true, // We handle this in our middleware
    ignorePaths: ['/health', '/metrics'],
  });

  // Register logging plugin first (includes correlation middleware)
  await app.register(loggingPlugin);

  // Register security headers (helmet) early
  await app.register(helmetPlugin);

  // Register env plugin
  await app.register(env, {
    confKey: 'config',
    schema: configSchema,
    dotenv: false // We handle env loading in config
  });

  // Register CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true
  });

  // Register connection plugins in correct order
  // 1. Connection pool must be first
  await app.register(connectionPoolPlugin);
  
  // 2. PostgreSQL and Redis plugins can run in parallel
  await Promise.all([
    app.register(postgresPlugin),
    app.register(redisPlugin)
  ]);
  
  // 3. Drizzle depends on the connection pool
  await app.register(drizzlePlugin);
  
  // Register OpenAPI documentation (conditionally)
  await app.register(openApiPlugin);
  
  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(testRoutes);

  return app;
}