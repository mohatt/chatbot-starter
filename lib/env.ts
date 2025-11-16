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

export const defaults = {
  gateway: {
    // chat: 'openai/gpt-4o-mini',
    chat: 'meta/llama-3.1-8b', // good low-cost model with tool support
    // chat: 'meituan/longcat-flash-chat', // very good free model but latency is high
    embedding: 'openai/text-embedding-3-small',
  },
  hf: {
    chat: 'meta-llama/Llama-3.1-8B-Instruct'
  }
} as const

export function assertEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
