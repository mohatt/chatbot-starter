import { betterAuth } from 'better-auth'
import { drizzleAdapter, DB } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'

interface CreateAuthEnv {
  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
}

export function createAuth(db: DB, env: CreateAuthEnv) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      camelCase: true,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      anonymous()
    ],
    advanced: {
      database: {
        generateId: 'uuid',
      }
    }
  });
}
