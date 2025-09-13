import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { redisConfig } from '@config';
import { setupRedisManager } from '@modules/redis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: any;
    redisHealthCheck: () => Promise<any>;
    redisMetrics: () => any;
    redisExecute: (command: string, ...args: any[]) => Promise<any>;
  }
}

async function redisPlugin(fastify: FastifyInstance) {
  const { clientManager, initialize, decorators } = setupRedisManager({
    ...redisConfig,
    maxRetryAttempts: 5,
    retryDelay: 1000,
    enableOfflineQueue: true,
    logger: fastify.log,
  });
  
  // Initialize
  await initialize();
  
  // Decorate Fastify instance
  if (decorators.redis) {
    fastify.decorate('redis', decorators.redis);
  }
  fastify.decorate('redisHealthCheck', decorators.redisHealthCheck);
  fastify.decorate('redisMetrics', decorators.redisMetrics);
  fastify.decorate('redisExecute', decorators.redisExecute);
  
  // Cleanup on close
  fastify.addHook('onClose', async () => {
    await clientManager.close();
    fastify.log.info('Redis connection closed');
  });
}

export default fp(redisPlugin, {
  name: 'redis',
  dependencies: []
});