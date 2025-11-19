import { object, string } from 'zod';

const envSchema = object({
  NODE_ENV: string().optional(),
  HUGGING_FACE_API_KEY: string().optional(),
  OPENAI_API_KEY: string().optional(),
  OPENAI_BASE_URL: string().optional(),
  AI_MODEL: string().optional(),
  EMBEDDING_MODEL: string().optional(),
});

export const env = envSchema.parse(process.env);

export function assertEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
