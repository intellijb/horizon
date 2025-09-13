import { defineConfig } from 'drizzle-kit';
import { config } from './src/config';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.POSTGRES_URI,
  },
  verbose: true,
  strict: true,
  schemaFilter: ['auth', 'app', 'public'],
});