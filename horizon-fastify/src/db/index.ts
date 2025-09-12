import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';

let _db: ReturnType<typeof drizzle> | null = null;
let _connection: Pool | null = null;

export function createDatabase(connectionString: string) {
  if (!connectionString) {
    throw new Error('POSTGRES_URI environment variable is required');
  }

  // Create the connection pool
  _connection = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Create the Drizzle database instance
  _db = drizzle(_connection, { 
    schema,
    logger: process.env.NODE_ENV === 'development' 
  });

  return _db;
}

export function getDatabase() {
  if (!_db) {
    throw new Error('Database not initialized. Call createDatabase() first.');
  }
  return _db;
}

export function getConnection() {
  if (!_connection) {
    throw new Error('Database connection not initialized. Call createDatabase() first.');
  }
  return _connection;
}

// Export schema for type inference
export * from './schema/index';
export type Database = ReturnType<typeof drizzle>;