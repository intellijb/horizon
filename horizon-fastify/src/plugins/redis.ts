import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { FastifyInstance } from 'fastify';
import { redisConfig } from '../config/index';

async function redisPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRedis, {
    url: redisConfig.url,
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    retryDelayOnFailover: redisConfig.retryDelayOnFailover,
    lazyConnect: redisConfig.lazyConnect,
    closeClient: true,
    retryStrategy: (times: number) => {
      if (times > redisConfig.maxRetriesPerRequest) {
        return null;
      }
      return Math.min(times * 50, redisConfig.retryDelayOnFailover);
    }
  });

  fastify.log.info('Redis client initialized');
}

export default fp(redisPlugin, {
  name: 'redis',
  dependencies: ['@fastify/env']
});