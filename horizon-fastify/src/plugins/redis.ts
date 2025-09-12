import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { FastifyInstance } from 'fastify';

async function redisPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRedis, {
    url: fastify.config.REDIS_URL,
    closeClient: true,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 50, 500);
    }
  });

  fastify.log.info('Redis client initialized');
}

export default fp(redisPlugin, {
  name: 'redis',
  dependencies: ['@fastify/env']
});