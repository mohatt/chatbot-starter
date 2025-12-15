import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  POSTGRES_URL: z.string().trim().nonempty(),
  BETTER_AUTH_SECRET: z.string().trim().nonempty(),
  BETTER_AUTH_URL: z.string().trim().nonempty(),
  UPSTASH_VECTOR_REST_URL: z.string().trim().nonempty(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().trim().nonempty(),
  HUGGING_FACE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const noop = {} as unknown

export function loadEnv(input = noop): Env {
  return envSchema.parse(input === noop ? process.env : input);
}

export function loadPartialEnv<T extends z.util.Mask<keyof Env>>(pick: T, input = noop) {
  return envSchema.pick(pick).parse(input === noop ? process.env : input);
}
