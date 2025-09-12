import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import env from '@fastify/env';
import { configSchema } from './config/index';
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
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production' 
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
    dotenv: true
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(drizzlePlugin);
  
  await app.register(healthRoutes, { prefix: '/health' });

  return app;
}