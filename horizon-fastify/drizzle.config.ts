import { defineConfig } from 'drizzle-kit';
import { config } from './src/config';

export default defineConfig({
  schema: './src/modules/platform/database/schema/index.ts',
  out: './src/modules/platform/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.POSTGRES_URI,
  },
  verbose: true,
  strict: true,
  schemaFilter: ['auth', 'app', 'public'],
});