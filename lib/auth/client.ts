import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous, openAPI } from 'better-auth/plugins'
import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'
import { config } from '@/lib/config'
import * as schema from '@/lib/db/models/auth'

export function createAuthClient(db: Db, env: Pick<Env, 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL'>) {
  const auth = betterAuth({
    appName: config.appName,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db.client, {
      provider: "pg",
      camelCase: true,
      usePlural: true,
      schema
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      anonymous({
        generateName: () => 'Guest',
        onLinkAccount: async ({ anonymousUser, newUser, ctx }) => {
          // @todo move app data from anonymous user to the new user
        }
      }),
      openAPI(),
    ],
    session: {
      cookieCache: {
        enabled: true,
      },
    },
    advanced: {
      cookiePrefix: config.appId,
      database: {
        generateId: 'uuid',
      },
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      }
    }
  });
  return auth
}
