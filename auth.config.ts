import { config } from 'dotenv';
import { createAuthClient } from '@/lib/auth/client'
import { Db } from '@/lib/db'

config({ path: '.env.development.local' });

const env = {
  POSTGRES_URL: process.env.POSTGRES_URL!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
}

export const auth = createAuthClient(new Db(env), env)
