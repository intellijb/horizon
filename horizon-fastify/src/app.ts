import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import env from '@fastify/env';
import { config, configSchema, logConfigSummary, isDevelopment, isProduction } from '@config';
import connectionPoolPlugin from '@/plugins/connection-pool';
import postgresPlugin from '@/plugins/postgres';
import redisPlugin from '@/plugins/redis';
import drizzlePlugin from '@/plugins/drizzle';
import healthRoutes from '@/routes/health';

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

  const app = Fastify({
    logger: {
      level: isProduction ? 'info' : 'debug',
      transport: !isProduction 
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname'
            }
          }
        : undefined
    }
  });

  // Register env plugin first
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
  
  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });

  return app;
}