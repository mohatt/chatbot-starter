import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  HF_ACCESS_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional()
});

export const env = envSchema.parse(process.env);

export const defaults = {
  chatModel: env.AI_MODEL ?? 'meta-llama/Llama-3.1-8B-Instruct',
  embeddingModel: env.EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2'
};

export function assertEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
