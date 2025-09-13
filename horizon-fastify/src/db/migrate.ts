import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { dbConfig } from '@config';
import { createDatabase } from '@modules/database/drizzle-manager';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  // Create a new pool for migration
  const pool = new Pool({
    connectionString: dbConfig.connectionString,
    max: 1,
  });
  
  const db = createDatabase(pool);
  
  try {
    console.log('🚀 Starting database migration...');
    
    await migrate(db, {
      migrationsFolder: join(__dirname, 'migrations'),
    });
    
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if this script is being run directly
if (process.argv[1] === __filename) {
  runMigrations();
}

export { runMigrations };