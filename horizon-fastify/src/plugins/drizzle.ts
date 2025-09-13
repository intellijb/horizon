import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { getSharedPool } from './connection-pool';
import { createDatabase, Database } from '@modules/database/drizzle-manager';
import { sql } from 'drizzle-orm';

// Extend Fastify instance to include database
declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

async function drizzlePlugin(fastify: FastifyInstance) {
  // Get the shared pool from connection-pool plugin
  const pool = getSharedPool();
  
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Ensure connection-pool plugin is registered first.');
  }
  
  // Initialize database with the shared pool
  const db = createDatabase(pool);
  
  // Register the database instance
  fastify.decorate('db', db);

  // Test database connection (pool is already tested in connection-pool plugin)
  try {
    await db.execute(sql`SELECT 1`);
    fastify.log.info('Drizzle ORM initialized with shared pool');
  } catch (error) {
    fastify.log.error(error, 'Failed to initialize Drizzle ORM');
    throw error;
  }
  
  // Note: Connection cleanup is handled by connection-pool plugin
}

export default fp(drizzlePlugin, {
  name: 'drizzle',
  dependencies: ['connection-pool']
});