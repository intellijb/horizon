import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import { FastifyInstance } from 'fastify';

async function postgresPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyPostgres, {
    connectionString: fastify.config.POSTGRES_URI,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  fastify.log.info('PostgreSQL connection pool initialized');
}

export default fp(postgresPlugin, {
  name: 'postgres',
  dependencies: ['@fastify/env']
});