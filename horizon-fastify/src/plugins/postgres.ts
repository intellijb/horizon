import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { QueryResult, QueryResultRow } from 'pg';
import { getSharedPool } from './connection-pool';

declare module 'fastify' {
  interface FastifyInstance {
    pg: {
      query: <T extends QueryResultRow = any>(text: string, values?: any[]) => Promise<QueryResult<T>>;
      transact: <T>(fn: (client: any) => Promise<T>) => Promise<T>;
      pool: ReturnType<typeof getSharedPool>;
    };
  }
}

async function postgresPlugin(fastify: FastifyInstance) {
  const pool = getSharedPool();
  
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Ensure connection-pool plugin is registered first.');
  }

  // Create pg-compatible interface for backward compatibility
  const pg = {
    pool,
    
    // Simple query method
    query: async <T extends QueryResultRow = any>(text: string, values?: any[]): Promise<QueryResult<T>> => {
      const client = await pool.connect();
      try {
        return await client.query<T>(text, values);
      } finally {
        client.release();
      }
    },
    
    // Transaction helper
    transact: async <T>(fn: (client: any) => Promise<T>): Promise<T> => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };

  // Decorate fastify instance with pg interface
  fastify.decorate('pg', pg);
  
  fastify.log.info('PostgreSQL plugin initialized with shared pool');
}

export default fp(postgresPlugin, {
  name: 'postgres',
  dependencies: ['connection-pool']
});