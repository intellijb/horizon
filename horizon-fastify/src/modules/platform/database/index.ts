// Re-export from the new module location for backward compatibility
export {
  createDatabase,
  getDatabase,
  getDatabasePool as getConnection,
  type Database
} from '@modules/platform/database/drizzle-manager';

// Export schema for type inference
export * from './schema/index';