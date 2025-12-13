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

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
