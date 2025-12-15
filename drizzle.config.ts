import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { loadPartialEnv } from '@/lib/env';

config({ path: '.env.development.local' });

export default defineConfig({
  out: './lib/db/migrations',
  schema: './lib/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: loadPartialEnv({ POSTGRES_URL: true }).POSTGRES_URL,
  },
});
