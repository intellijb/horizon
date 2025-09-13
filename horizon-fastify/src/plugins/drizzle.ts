import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { createDatabase, getDatabase, getConnection, Database } from '../db/index';
import { sql } from 'drizzle-orm';

// Extend Fastify instance to include database
declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

async function drizzlePlugin(fastify: FastifyInstance) {
  // Initialize database with configuration
  const db = createDatabase();
  
  // Register the database instance
  fastify.decorate('db', db);

  // Add a hook to close the connection when the server shuts down
  fastify.addHook('onClose', async () => {
    await getConnection().end();
    fastify.log.info('Database connection closed');
  });

  // Test database connection
  try {
    await db.execute(sql`SELECT 1`);
    fastify.log.info('Database connection established successfully');
  } catch (error) {
    fastify.log.error(error, 'Failed to connect to database');
    throw error;
  }
}

export default fp(drizzlePlugin, {
  name: 'drizzle',
  dependencies: ['@fastify/env']
});