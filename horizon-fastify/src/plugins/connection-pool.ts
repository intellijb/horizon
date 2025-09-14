import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { dbConfig } from '@config';
import { setupPostgresManager, PostgresPoolManager } from '@modules/platform/postgres';

declare module 'fastify' {
  interface FastifyInstance {
    pgPool: Pool;
    pgMetrics: () => any;
    pgCircuitBreaker: () => any;
    pgHealthCheck: () => Promise<any>;
    pgQuery: (text: string, values?: any[]) => Promise<any>;
    pgTransaction: (fn: any) => Promise<any>;
  }
}

async function connectionPoolPlugin(fastify: FastifyInstance) {
  const { poolManager, initialize, decorators } = setupPostgresManager({
    connectionString: dbConfig.connectionString,
    max: dbConfig.max,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    query_timeout: 30000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
    maxRetryAttempts: 5,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    logger: fastify.log,
  });
  
  // Initialize
  await initialize();
  
  // Decorate Fastify instance
  if (decorators.pgPool) {
    fastify.decorate('pgPool', decorators.pgPool);
  }
  fastify.decorate('pgMetrics', decorators.pgMetrics);
  fastify.decorate('pgCircuitBreaker', decorators.pgCircuitBreaker);
  fastify.decorate('pgHealthCheck', decorators.pgHealthCheck);
  fastify.decorate('pgQuery', decorators.pgQuery);
  fastify.decorate('pgTransaction', decorators.pgTransaction);
  
  // Cleanup on close
  fastify.addHook('onClose', async () => {
    await poolManager.close();
    fastify.log.info('PostgreSQL connection pool closed');
  });
}

// Export the shared pool getter for other plugins
export function getSharedPool() {
  const poolManager = PostgresPoolManager.getInstance();
  return poolManager.getPool();
}

export default fp(connectionPoolPlugin, {
  name: 'connection-pool',
  dependencies: [],
});