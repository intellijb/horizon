import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';
import { dbConfig, isDevelopment } from '../config/index';

let _db: ReturnType<typeof drizzle> | null = null;
let _connection: Pool | null = null;

export function createDatabase(configOverride?: Partial<typeof dbConfig>) {
  const finalConfig = { ...dbConfig, ...configOverride };

  if (!finalConfig.connectionString) {
    throw new Error('Database connection string is required');
  }

  // Create the connection pool
  _connection = new Pool({
    connectionString: finalConfig.connectionString,
    max: finalConfig.max,
    idleTimeoutMillis: finalConfig.idleTimeoutMillis,
    connectionTimeoutMillis: finalConfig.connectionTimeoutMillis,
  });

  // Create the Drizzle database instance
  _db = drizzle(_connection, { 
    schema,
    logger: isDevelopment
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