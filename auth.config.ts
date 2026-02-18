import { config } from 'dotenv'
import { createAuthClient } from '@/lib/auth/client'
import { loadPartialEnv } from '@/lib/env'
import { Db } from '@/lib/db'

config({ path: '.env.development.local' })

const env = loadPartialEnv({
  POSTGRES_URL: true,
  AUTH_SECRET: true,
})

export const auth = createAuthClient(env, new Db(env))
