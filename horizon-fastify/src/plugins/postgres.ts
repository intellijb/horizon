import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import { FastifyInstance } from 'fastify';
import { dbConfig } from '../config/index';

async function postgresPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyPostgres, {
    connectionString: dbConfig.connectionString,
    max: dbConfig.max,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
  });

  fastify.log.info('PostgreSQL connection pool initialized');
}

export default fp(postgresPlugin, {
  name: 'postgres',
  dependencies: ['@fastify/env']
});