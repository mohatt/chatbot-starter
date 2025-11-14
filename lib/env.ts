import { object, string } from 'zod';

const envSchema = object({
  NODE_ENV: string().optional(),
  HUGGING_FACE_API_KEY: string().optional(),
  OPENAI_API_KEY: string().optional(),
  OPENAI_BASE_URL: string().optional(),
  AI_MODEL: string().optional(),
  EMBEDDING_MODEL: string().optional()
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
