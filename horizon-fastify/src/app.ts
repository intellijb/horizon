import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import env from '@fastify/env';
import { config, configSchema, logConfigSummary, isDevelopment, isProduction } from './config/index';
import postgresPlugin from './plugins/postgres';
import redisPlugin from './plugins/redis';
import drizzlePlugin from './plugins/drizzle';
import healthRoutes from './routes/health';

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

  await app.register(env, {
    confKey: 'config',
    schema: configSchema,
    dotenv: false // We handle env loading in config
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true
  });

  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(drizzlePlugin);
  
  await app.register(healthRoutes, { prefix: '/health' });

  return app;
}