import { betterAuth, APIError } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous, openAPI, createAuthMiddleware } from 'better-auth/plugins'
import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'
import { config } from '@/lib/config'
import * as authSchema from '@/lib/db/schema/auth'
import { billing } from './plugins/billing'

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
      schema: authSchema
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      changeEmail: {
        enabled: false,
      },
      deleteUser: {
        enabled: true,
        afterDelete: async (_user) => {
          // We rely on FK cascades for projects and chats
          // As for files, userId FK will be set to NULL and mark them as orphaned (cronjob will clean them up)
        }
      }
    },
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
    },
    plugins: [
      anonymous({
        generateName: () => 'Guest',
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const fromId = anonymousUser.user.id
          const toId = newUser.user.id
          console.log('Moving app data from anonymous user to the new user', { fromId, toId })
          await db.client.transaction(async (tx) => {
            const projects = db.projects.withDb(tx);
            const chats = db.chats.withDb(tx);
            const files = db.files.withDb(tx);

            await projects.moveOwnership(fromId, toId);
            await chats.moveOwnership(fromId, toId);
            await files.moveOwnership(fromId, toId);
          })
        },
      }),
      billing(db),
      openAPI(),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/update-user') return

        const { image } = ctx.body
        if (image != null) {
          throw new APIError('BAD_REQUEST', { message: 'Avatar image uploads are not allowed.' })
        }
      }),
    }
  });
  return auth
}
