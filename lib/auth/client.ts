import { betterAuth, APIError } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous, createAuthMiddleware } from 'better-auth/plugins'
import { waitUntil } from '@vercel/functions'
import { billing } from './plugins/billing'
import { Mailer, VerifyEmail, ResetPassword } from '@/lib/mailer'
import { config } from '@/lib/config'
import * as authSchema from '@/lib/db/schema/auth'
import type { Env } from '@/lib/env'
import type { Db } from '@/lib/db'

export type AuthEnv = Pick<Env, 'AUTH_SECRET' | 'AUTH_DISABLE_EMAIL' | 'AUTH_DISABLE_ANONYMOUS'>

export function createAuthClient(env: AuthEnv, db: Db, mailer?: Mailer) {
  const isMailerEnabled = !!mailer?.isEnabled
  const sendMailFn = <T extends Function>(fn: T) => (isMailerEnabled ? fn : undefined)
  const auth = betterAuth({
    appName: config.appName,
    baseURL: config.baseUrl,
    secret: env.AUTH_SECRET,
    trustedOrigins: [config.baseUrl],
    database: drizzleAdapter(db.client, {
      provider: 'pg',
      camelCase: true,
      usePlural: true,
      transaction: true,
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: env.AUTH_DISABLE_EMAIL,
      requireEmailVerification: isMailerEnabled,
      resetPasswordTokenExpiresIn: 3600 * 24,
      sendResetPassword: sendMailFn(async ({ user, url, token }) => {
        const { email, name } = user
        const message = ResetPassword({ name, email, url, token })
        // Avoid awaiting to prevent timing attacks
        waitUntil(mailer!.send(message, { to: email }))
      }),
    },
    emailVerification: {
      sendVerificationEmail: sendMailFn(async ({ user, url, token }) => {
        const { email, name } = user
        const message = VerifyEmail({ name, email, url, token })
        waitUntil(mailer!.send(message, { to: email }))
      }),
      autoSignInAfterVerification: true,
      expiresIn: 3600 * 24,
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
        },
      },
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
        ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
      },
      backgroundTasks: {
        handler: waitUntil,
      },
    },
    plugins: [
      anonymous({
        generateName: () => 'Guest',
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const fromId = anonymousUser.user.id
          const toId = newUser.user.id
          console.log('Moving app data from anonymous user to the new user', { fromId, toId })
          await db.client.transaction(async (tx) => {
            const projects = db.projects.withDb(tx)
            const chats = db.chats.withDb(tx)
            const files = db.files.withDb(tx)

            await projects.moveOwnership(fromId, toId)
            await chats.moveOwnership(fromId, toId)
            await files.moveOwnership(fromId, toId)
          })
        },
      }),
      billing(db),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-in/anonymous' && env.AUTH_DISABLE_ANONYMOUS) {
          throw new APIError('FORBIDDEN', {
            message: 'Anonymous sign-in is currently not allowed.',
          })
        }

        if (ctx.path === '/update-user') {
          const { image } = ctx.body
          if (image != null) {
            throw new APIError('BAD_REQUEST', { message: 'Avatar image uploads are not allowed.' })
          }
        }
      }),
    },
  })
  return auth
}
