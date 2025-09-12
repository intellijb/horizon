import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, connection } from './index';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
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
    await connection.end();
  }
}

// Check if this script is being run directly
if (process.argv[1] === __filename) {
  runMigrations();
}

export { runMigrations };