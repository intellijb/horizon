import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/modules/platform/database/schema/index.ts',
  out: './src/modules/platform/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URI!,
  },
  verbose: true,
  strict: true,
  schemaFilter: ['auth', 'app', 'public', 'llm', 'learning'],
});