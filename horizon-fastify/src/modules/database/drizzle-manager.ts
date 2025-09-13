import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@db/schema/index';
import { isDevelopment } from '@config';

export class DrizzleManager {
  private static instance: DrizzleManager | null = null;
  private db: NodePgDatabase<typeof schema> | null = null;
  private pool: Pool | null = null;
  
  private constructor() {}
  
  static getInstance(): DrizzleManager {
    if (!DrizzleManager.instance) {
      DrizzleManager.instance = new DrizzleManager();
    }
    return DrizzleManager.instance;
  }
  
  initialize(pool: Pool): NodePgDatabase<typeof schema> {
    if (this.db) {
      return this.db;
    }
    
    this.pool = pool;
    this.db = drizzle(pool, {
      schema,
      logger: isDevelopment,
    });
    
    return this.db;
  }
  
  getDatabase(): NodePgDatabase<typeof schema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }
  
  getPool(): Pool | null {
    return this.pool;
  }
  
  async testConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Test with a simple query using sql template
    const { sql } = await import('drizzle-orm');
    await this.db.execute(sql`SELECT 1`);
  }
  
  async close(): Promise<void> {
    // Note: Pool cleanup is handled by PostgresPoolManager
    // This just clears the reference
    this.db = null;
    this.pool = null;
  }
  
  static shutdown(): void {
    if (DrizzleManager.instance) {
      DrizzleManager.instance.close();
      DrizzleManager.instance = null;
    }
  }
}

// Export convenient functions for backward compatibility
export function createDatabase(pool: Pool): NodePgDatabase<typeof schema> {
  return DrizzleManager.getInstance().initialize(pool);
}

export function getDatabase(): NodePgDatabase<typeof schema> {
  return DrizzleManager.getInstance().getDatabase();
}

export function getDatabasePool(): Pool | null {
  return DrizzleManager.getInstance().getPool();
}

export type Database = NodePgDatabase<typeof schema>;