import { z } from 'zod'

const optional = z.string().optional()
const required = z.string().trim().nonempty()

const envSchema = z.object({
  NODE_ENV: optional,
  AUTH_SECRET: required,
  CRON_SECRET: required,
  POSTGRES_URL: required,
  UPSTASH_VECTOR_REST_URL: required,
  UPSTASH_VECTOR_REST_TOKEN: required,
  BLOB_READ_WRITE_TOKEN: required,
  BLOB_BASE_URL: required,
  VERCEL_OIDC_TOKEN: required,
  HUGGING_FACE_API_KEY: optional,
  OPENAI_API_KEY: optional,
  OPENAI_BASE_URL: optional,
  RESEND_API_KEY: optional,
  EMAIL_SENDER_NAME: optional,
  EMAIL_SENDER_ADDRESS: optional,
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
  return envSchema.pick(pick).parse(input === noop ? process.env : input)
}
