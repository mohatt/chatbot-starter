import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres'
import { createAuth } from '@/lib/auth/config'

config({ path: '.env.development.local' });

export const auth = createAuth(drizzle(process.env.POSTGRES_URL!), {
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
})
