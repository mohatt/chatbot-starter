import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  POSTGRES_URL: z.string().nonempty(),
  UPSTASH_VECTOR_REST_URL: z.string().nonempty(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().nonempty(),
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
