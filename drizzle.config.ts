import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.development.local' });

export default defineConfig({
  out: './lib/db/migrations',
  schema: './lib/db/models',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
