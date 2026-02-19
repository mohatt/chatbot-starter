import { z } from 'zod'

const optional = z.string().trim().optional()
const optionalBool = z.stringbool().optional()
const required = z.string().trim().nonempty()

const envSchemaBase = z.object({
  NODE_ENV: optional,
  AUTH_SECRET: required,
  AUTH_DISABLE_ANONYMOUS: optionalBool,
  AUTH_DISABLE_EMAIL: optionalBool,
  CRON_SECRET: required,
  POSTGRES_URL: required,
  UPSTASH_VECTOR_REST_URL: required,
  UPSTASH_VECTOR_REST_TOKEN: required,
  BLOB_READ_WRITE_TOKEN: required,
  BLOB_BASE_URL: required,
  AI_GATEWAY_API_KEY: optional,
  VERCEL_OIDC_TOKEN: optional,
  HUGGING_FACE_API_KEY: optional,
  OPENAI_API_KEY: optional,
  OPENAI_BASE_URL: optional,
  RESEND_API_KEY: optional,
  EMAIL_SENDER_NAME: optional,
  EMAIL_SENDER_ADDRESS: optional,
})

const envSchema = envSchemaBase.superRefine((env, ctx) => {
  if (!env.AI_GATEWAY_API_KEY && !env.VERCEL_OIDC_TOKEN) {
    const message = 'Either AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN must be set.'
    ctx.addIssue({ code: 'custom', message, path: ['AI_GATEWAY_API_KEY'] })
    ctx.addIssue({ code: 'custom', message, path: ['VERCEL_OIDC_TOKEN'] })
  }

  if (env.RESEND_API_KEY) {
    if (!env.EMAIL_SENDER_ADDRESS) {
      ctx.addIssue({
        code: 'custom',
        message: 'EMAIL_SENDER_ADDRESS is required when RESEND_API_KEY is set.',
        path: ['EMAIL_SENDER_ADDRESS'],
      })
    }
  }
})

export type Env = z.infer<typeof envSchema>

const noop = {} as unknown

export function loadEnv(input = noop): Env {
  return envSchema.parse(input === noop ? process.env : input)
}

export function loadPartialEnv<T extends z.util.Mask<keyof Env>>(
  pick: T & Record<Exclude<keyof T, keyof Env>, never>,
  input = noop,
) {
  return envSchemaBase.pick(pick).parse(input === noop ? process.env : input)
}
